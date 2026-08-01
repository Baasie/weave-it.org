---
title: "Property-based testing in Java with JUnit-Quickcheck – Part 2: Generators"
slug: "property-based-testing-in-java-with-junit-quickcheck-part-2-generators"
status: "Idea"
tags: ["check automation", "continuous delivery", "junit", "junit quickcheck", "property based testing", "software quality", "test automation", "testing"]
seoTitle: "Property-based testing in Java with JUnit-Quickcheck - Part 2: Generators - Weave IT"
seoDescription: "Learn how to create generators for models with Property-based testing framework JUnit-Quickcheck, and how you can use this to improve your unit testing"
published: 2017-06-12
---

In [Part 1](http://baasie.com/2017/05/03/property-based-testing-in-java-with-junit-quickcheck-part-1-the-basics/) of this tutorial we created a Property-based test (PBT) from a normal JUnit test with [basic types](http://pholser.github.io/junit-quickcheck/site/0.7/usage/basic-types.html). Now let us extend the domain object PostalParcel with a list of Products.

<!--more-->

public class Product {

private UUID uuid;     private String name;     private int weight;

public Product(UUID uuid, String name, int weight) {         this.uuid = uuid;         this.name = name;         if(weight > 0 ) {             this.weight = weight;         } else {             throw new IllegalArgumentException("Weight not acceptable, less than 0.");         }     }

public int getWeight() {         return weight;     }

}

public class PostalParcel {     public static final double MAX*DELIVERY*COSTS = 4.99;     public static final double MIN*DELIVERY*COSTS = 1.99;

private UUID uuid;     private List products;

public PostalParcel(UUID uuid, List products) {         this.uuid = uuid;         this.products = products;     }

public double deliveryCosts() {         if (weight() > 20) {             return MAX*DELIVERY*COSTS;         }         return MIN*DELIVERY*COSTS;     }

public int weight() {         return products.stream().map(Product::getWeight).mapToInt(Integer::intValue).sum();     } }

All examples are written with Java 8 and can be downloaded from my [gitlab](https://gitlab.com/Baasie/Property-Based-Testing) repository.

Write an unit test for the function deliveryCosts with a fixture for the entities. An implementation could look something like this:

private PostalParcel generatePostalParcel(int weight) {         return new PostalParcel("UUID", generateProducts(weight)); }

private List generateProducts(int weight) {         List products = new ArrayList<>();         for (int i = 0; i < 5; i++) {              products.add(new Product("UUID", "Name", weight/4));         }         return products; }

As explained in the previous part, these tests will not cover the entire behaviour we are testing here. We will refactor this to a Property-based test with the help of generators.

## Generators

In this certain case we use entities as our input for our unit tests. A possible way of using generated properties for entities is to generate a basic type for each of the needed arguments for our entities. It is easier to let JUnit-Quickcheck generate the entities by creating your own generators; this way your test does not get bloated with properties and is therefore better readable. To create a generator you need to do three things. First create a class that extends from [generator](http://pholser.github.io/junit-quickcheck/site/0.7/junit-quickcheck-core/apidocs/index.html):

public class PostalParcelGenerator extends Generator

Secondly, implement the constructor with a super to the type you are generating. Lastly, override the function T generate:

public PostalParcelGenerator() {         super(PostalParcel.class); } public PostalParcel generate(SourceOfRandomness sourceOfRandomness, GenerationStatus generationStatus) {         return null; }

We can use the generator in our Property-based test in two ways, we can use the [@From(T.class)](http://pholser.github.io/junit-quickcheck/site/0.7/junit-quickcheck-core/apidocs/index.html) annotation in front of your entity. This annotation tells Junit-Quickcheck which generator to use, for example:

public void deliveryCostsShouldBeMaxWhenWeightIsGreaterThan20(@From(PostalParcelGenerator.class) PostalParcel postalParcel)

It is much easier to let the serviceloader of JUnit-Quickcheck discover the generators by creating a file called com.pholser.junit.quickcheck.generator.Generator in META-INF/services. In this file you add the package name plus class name of the generator. This way, there is even less plumbing going on in your unit tests.

## Implement generate

The function generate looks pretty straightforward. It requires you to return the type  you are generating.

public PostalParcel generate(SourceOfRandomness sourceOfRandomness, GenerationStatus generationStatus) {         return new PostalParcel(gen().make(UUIDGenerator.class).generate(sourceOfRandomness, generationStatus),         generateProducts(sourceOfRandomness, generationStatus)); }

private List generateProducts(SourceOfRandomness sourceOfRandomness, GenerationStatus generationStatus) {         ProductGenerator productGenerator = gen().make(ProductGenerator.class);         List products = new ArrayList<>();         int randomTotalWeight = sourceOfRandomness.nextInt(minWeight, maxWeight);         while(randomTotalWeight > 0) {         int maxWeight = sourceOfRandomness.nextInt(1, randomTotalWeight);         productGenerator.configureMaxWeight(maxWeight);         products.add(productGenerator.generate(sourceOfRandomness, generationStatus));         randomTotalWeight = randomTotalWeight-maxWeight;         }         return products; }

There are multiple JUnit-Quickcheck functions going on here. First is the argument SourceOfRandomness. You need this to create random primitive types, like you see in generating the randomTotalWeight. Secondly, you have the argument GenerationStatus, which we do not use in this example, but we can use this to influence the results of a generation for a particular property parameter.

When you want to generate other types than primitives, use the [gen()](http://pholser.github.io/junit-quickcheck/site/0.7/junit-quickcheck-core/apidocs/index.html) interface. The most common usages are:

- The gen().make() method makes the generators available to current instance, and configures it with whatever configuration annotations live on the generator class.

- The gen().type() method asks for an arbitrary generator that can produce instances of the given type. Use this for a string, it will create a total random string with all characters available (even Chinese and Korean characters).

Take notice, as was said in the previous part, if you take a string as argument then the works of Shakespeare in Japanese & Korean are ONE valid input. If you can, wrap the string into its own type, like explained in the [Object Calisthenics](http://williamdurand.fr/2013/06/03/object-calisthenics/) practise.

## Configuring generators

In the implementation of our PostalParcelGenerator you might have noticed the arguments minWeight and maxWeight in generating the randomTotalWeight. These are two variables which we need to configure the generator with. We can do this by creating a public function void called configure. JUnit-Quickcheck requires us to name it like this in order to match this with the annotation we are going to use. In this case we will use the standard JUnit-Quickcheck annotation [@InRange](http://pholser.github.io/junit-quickcheck/site/0.7/junit-quickcheck-generators/apidocs/index.html), but you can also use your annotation.

private int minWeight = 1; private int maxWeight = Integer.MAX_VALUE;

public void configure(InRange range) {         this.minWeight = range.minInt() == Integer.MIN_VALUE ? 1 : range.minInt();         this.maxWeight = range.maxInt(); }

You can easily configure your generators with the behaviour you need for your test cases. The only problem that remains is that where code is written errors can be made; we all make mistakes. This is also why in my previous post I advised to both use configuration by annotation and to use assumeThat; with this approach mistakes are easily spotted during your tests. After we implemented the rest of the generators, (which you can see in my [gitlab](https://gitlab.com/Baasie/Property-Based-Testing) repository) we can write our PBT.

@RunWith(JUnitQuickcheck.class) public class PostalParcelPBTTest {

@Property     public void deliveryCostsShouldBeMaxWhenWeightIsGreaterThan20(@InRange(minInt = 21) PostalParcel postalParcel){         assumeThat(postalParcel.weight(), greaterThan(20));

assertThat(postalParcel.deliveryCosts(), equalTo(com.baasie.pbt.part1.PostalParcel.MAX*DELIVERY*COSTS));     }

@Property(trials = 25)     public void deliveryCostsShouldBeMinWhenWeightIsLessThanOrEqualTo20(@InRange(maxInt = 20) PostalParcel postalParcel){         assumeThat(postalParcel.weight(), is(both(greaterThan(0)).and(lessThanOrEqualTo(20))));

assertThat(postalParcel.deliveryCosts(), equalTo(com.baasie.pbt.part1.PostalParcel.MIN*DELIVERY*COSTS));     }

}

Creating the generators will cost some startup investment, but afterwards you really benefit from it. For each PBT, you can just add the type of the generator, and maybe some added behaviour you want with it. The minor investment will result in time saving in the long run, and better designed and written software. Additionally the tests will find edge cases that could cause bugs in your software, and resolve them before they occur.

## Performance

After my last post I got a comment with a question about performance. I do not know how the exact implementation works, but I do know that running it does not take 100x slower. I did a run in my Intellij for both the tests and the PBT is about 10x slower. In my opinion 10x is not unreasonable, considering the benefit it gives you.



This concludes part 2 of this tutorial, in the next part I will show you how to repeat failed tests.

Also, this post is published on the blog of [Xebia](http://blog.xebia.com/ubiquitous-domain-language-throughout-testing/)
