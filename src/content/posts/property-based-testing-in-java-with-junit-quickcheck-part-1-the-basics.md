---
title: "Property-based testing in Java with JUnit-Quickcheck – Part 1: The basics"
slug: "property-based-testing-in-java-with-junit-quickcheck-part-1-the-basics"
status: "Idea"
tags: ["check automation", "continuous delivery", "junit", "junit quickcheck", "property based testing", "software quality", "test automation", "testing"]
seoTitle: "Property-based testing in Java with JUnit-Quickcheck - Part 1: The basics - Weave IT"
seoDescription: "Improve design and code quality with Property-based testing, and see the basics of how to do this in Java with Junit-quickcheck"
published: 2017-05-03
---

To be able to show you what Property-based testing (PBT) is, let’s start by grasping the concept of a property in programming languages. Since this is a Java tutorial, I will start with Oracle and their definition of a property in their [glossary](http://docs.oracle.com/javase/tutorial/information/glossary.html):

> Characteristics of an object that users can set, such as the color of a window.

<!--more-->

Property is neither a variable/field or a method; it is something in between which is always true in your context. An example is weight in a postal parcel: this always is greater than zero.  In Java the following example implementation would follow:

public class PostalParcel {

private int weight;     private String uuid;

public PostalParcel(String uuid, int weight) {         this.uuid = uuid;         if(weight > 0) {             this.weight = weight;         } else {             throw new IllegalArgumentException("");         }     }

}

In this case, we made weight a property that always needs to be greater than 0. When designing your software, it is important to search for these properties, because they usually have some sort of business behaviour associated with them.

## What is Property-based testing (PBT)

Back to PBT, let’s add a function to PostalParcel that decides the delivery costs of the package. When the weight is greater than 20 the delivery costs will be 4.99 euro, otherwise the delivery cost will be 1.99 euro. We will first write our tests for this, which without PBT, will usually end up something like this:

public class PostalParcelTest {

@Test     public void deliveryCostsShouldBeMaxWhenWeightIsLargerThan20(){         PostalParcel postalParcel = new PostalParcel("uuid", 23);         assertThat(postalParcel.deliveryCosts(), equalTo(PostalParcel.MAX*DELIVERY*COSTS));     }

@Test     public void deliveryCostsShouldBeMinWhenWeightIsLessThanOrEqualTo20(){         PostalParcel postalParcel = new PostalParcel("uuid", 19);         assertThat(postalParcel.deliveryCosts(), equalTo(PostalParcel.MIN*DELIVERY*COSTS));     }

@Test(expected = IllegalArgumentException)     public void shouldThrowIllegalArgumentExceptionWhenWeightIsBelowOne() {         PostalParcel postalParcel = new PostalParcel("uuid", -100);     } }

Secondly, we have to make these test succeed by writing the implementation of deliveryCosts in a Postal Parcel:

public static final double MAX*DELIVERY*COSTS = 4.99; public static final double MIN*DELIVERY*COSTS = 1.99;

public double deliveryCosts() {         if(weight > 20) {             return MAX*DELIVERY*COSTS;         }         return MIN*DELIVERY*COSTS; }

When you run the tests, they will succeed, but if we think about it, 2 problems will remain. First of all we nicely described our behaviour in the test function name, but the implementation does not match the behaviour. The second test, deliveryCostsShouldBeMinWhenWeightIsLessThanOrEqualTo20, only tests with a weight of 19, but the behaviour clearly states Less Than Or Equal To 20. We can add another test which tests with a weight of 20, but what about the other cases? It will be a lot of work, and a waste of time, to create all the tests our self. Luckily, PBT comes to the rescue!

Furthermore, and this is what PBT is all about, we need a UUID as String for the test.  Since we do not care about the value of that property, we usually use a fixture for a case like this. It might happen that a UUID can give strange errors in executing the behaviour under test now, or in the future. Because we can use anything as a String input, or like [Romeu Moura](https://twitter.com/malk_zameth) once tweeted:

> .[@kenny_baas](https://twitter.com/kenny_baas) like I said in my talk: if you take a String as arg then the works of Shakespeare in Japanese & Korean are ONE valid input — Romeu Moura (@malk*zameth) [23 februari 2017](https://twitter.com/malk*zameth/status/834804532320276480)

I advice everyone to watch his [talk](https://www.youtube.com/watch?v=5pwv3cuo3Qk) about Property-based testing.

Now what you usually want to do, is make a Value Object of a UUID, but for now, because i want to show you a PBT example, we will leave it as a String. Even though, you can already see the benefit PBT will give: it makes you think about your input values.

For a more in depth explanation of what Property-based testing is, you can also check the [blog](http://hypothesis.works/articles/what-is-property-based-testing/) post of Hypothesis. Hypothesis also has a Java version, but at the moment this is still a prototype.

## JUnit-Quickcheck implementation

Start of with adding the [JUnit-Quickcheck](http://pholser.github.io/junit-quickcheck/site/0.7/junit-quickcheck-core/dependency-info.html) dependency to our project.

In order to use JUnit-Quickcheck we need to change 2 things.

First add the [@RunWith](http://junit.sourceforge.net/javadoc/org/junit/runner/RunWith.html) annotation above our test class.

@RunWith(JUnitQuickcheck.class)

Second, instead of using [@Test](http://junit.sourceforge.net/javadoc/org/junit/Test.html) we use [@Property](http://pholser.github.io/junit-quickcheck/site/0.7/junit-quickcheck-core/apidocs/com/pholser/junit/quickcheck/Property.html).

@Property public void deliveryCostsShouldBeMaxWhenWeightIsLargerThan20(){ .....

JUnitQuickcheck will now run each property test 100 times. We will get the added value of this when we let the JUnitQuickcheck generate the property parameters: for each run it will generate a random parameter. Let’s add them:

@Property public void deliveryCostsShouldBeMaxWhenWeightIsGreaterThan20(String uuid, int weight)         PostalParcel postalParcel = new PostalParcel(uuid, weight);         assertThat(postalParcel.deliveryCosts(), equalTo(PostalParcel.MAX*DELIVERY*COSTS)); } ....

Running this will most likely fail the tests, because the number can be any int now, but what we want is, for example, Larger Than 20. This can be accomplished in 2 ways, either use [assumeThat](http://junit.sourceforge.net/javadoc/org/junit/Assume.html#assumeThat(T,%20org.hamcrest.Matcher)) of JUnit, or use the [@InRange](http://pholser.github.io/junit-quickcheck/site/0.7/junit-quickcheck-generators/apidocs/com/pholser/junit/quickcheck/generator/InRange.html) of JUnitQuickcheck  in front of the variable.

@RunWith(JUnitQuickcheck.class) public class PostalParcelTest {

@Property     public void deliveryCostsShouldBeMaxWhenWeightIsGreaterThan20(String uuid, @InRange(minInt = 21) int weight){         assumeThat(weight, greaterThan(20));

PostalParcel postalParcel = new PostalParcel(uuid, weight);         assertThat(postalParcel.deliveryCosts(), equalTo(PostalParcel.MAX*DELIVERY*COSTS));     }

@Property     public void deliveryCostsShouldBeMinWhenWeightIsLessThanOrEqualTo20(String uuid, @InRange(minInt = 1, maxInt = 20) int weight){         assumeThat(weight, is(both(greaterThan(0)).and(lessThanOrEqualTo(20))));

PostalParcel postalParcel = new PostalParcel(uuid, weight);         assertThat(postalParcel.deliveryCosts(), equalTo(PostalParcel.MIN*DELIVERY*COSTS));     }

@Property     public void shouldThrowIllegalArgumentExceptionWhenWeightIsBelowOne(String uuid, @InRange(maxInt = 0) int weight) {         assumeThat(weight, lessThanOrEqualTo(0));

IllegalArgumentException illegalArgumentException = null;

try {             PostalParcel postalParcel = new PostalParcel(uuid, weight);         } catch(IllegalArgumentException e) {             illegalArgumentException = e;         }         assumeThat(illegalArgumentException, notNullValue());     } }

I would advice to combine both the options, for 2 reasons. First, assumeThat won’t work sufficient enough in small ranges, like in the second example. You will get errors of violating the assumptions. Adding the assumeThat will make your tests more readable and explicit though.

## Trials and Success

JUnit-Quickcheck by default will run the test 100 times, each with a random value. In some cases, like the LessThanOrEqual20, running 100 can be a waste (can, because it still is random). For this we can set the trials modifier on the @Property(trials = 25) annotation. This tells JUnit-Quickcheck it should only run the amount of trials set here, in this case 25 should be enough. It should, but it is still random, so it might happen that the checks will succeed the first time, but will fail after a while. This i.m.o. is the real benefit of PBT, it will eventually test all the corner cases for you, and find possible bugs in your system. Success just means it did not find errors this time, but maybe next time it will.



Now we have written our very first, basic, Property-based test for Java. This is already really helpful. In the next part of this tutorial we will go deeper into the framework and we will let JUnit-Quickcheck generate our entities for us as input values.

You can find the [sourcecode](https://gitlab.com/Baasie/Property-Based-Testing) of this example on my gitlab.

Also, this post is published on the blog of [Xebia](http://blog.xebia.com/property-based-testing-java-junit-quickcheck-part-1-basics/)
