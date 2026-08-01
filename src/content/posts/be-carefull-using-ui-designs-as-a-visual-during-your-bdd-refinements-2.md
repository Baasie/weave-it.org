---
title: "Be carefull using UI Designs as a visual during your BDD refinements"
slug: "be-carefull-using-ui-designs-as-a-visual-during-your-bdd-refinements-2"
status: "Idea"
tags: ["bdd", "cd", "check automa", "continuous delivery", "ddd", "test automation"]
seoTitle: "Be carefull using UI Designs as a visual during your BDD refinements - Weave IT"
published: 2017-04-11
---

The practise of Behaviour Driven Development (BDD), and using tooling to support this like cucumber, has inspired many posts and talks. The recurring questions are predominantly about how teams and people pull these tools out of its collaboration context, and bring it into the test automation context. Cucumber’s [post](https://cucumber.io/blog/2014/03/03/the-worlds-most-misunderstood-collaboration-tool) might perhaps be one of the best on this topic,

Last year I started giving talks about BDD based on my own experiences. One pitfall that always seems to pop up, at least in the Netherlands, is about imperative versus declarative (or implementation vs intention).

<!--more-->

To give you an idea what the difference is, here is an example of describing your specification in a *imperative way* (Implementation based):

Scenario: Redirect user to originally requested page after logging in

Given a User 'dave' exists with password 'secret' And I am not logged in When I navigate to the home page Then I am redirected to the login form When I fill in 'Username' with 'dave' And I fill in 'Password' with 'secret' And I press 'login' Then I should be on the home page

Here is the same script but written in a* declarative way* (Intention based):

Scenario: Redirect user to originally requested page after logging in Given I am an unauthenticated guest And I have a valid user account And I attempt to access restricted content When I log in Then I have access to the restricted content

Describing our specifications *imperatively* can bring significant problems. Our application, and in this case our UI, will be highly coupled to our specifications. When we change the UI, then we automatically need to change our specifications. Even worse, when we test-automate these specifications trough our UI, you are coupling your test code directly on your UI, and any change will lead to a lot more effort. In this case you most likely be putting more effort into refactoring your test-automation code, instead of adding that business value.

When we describe our specifications *declaratively*, changing the UI does not mean changing the intention, or behaviour of the code. in this case we can change the way a customer authenticates in the UI, but our intention is still the same so the specification script stay the same. Only the page objects and the reference to the page objects in your glue code needs to be changed. This could sound familiar to most developers: making your application (that means your test code too) as low coupled as possible.

The most common argument I’ve heard when giving talks or consultations is “well my domain expert knows the UI, so they will always be referencing the UI instead of the behaviour or intention of the software”. This is even more likely the case with UI designs. I always had a hard time giving people a workable solution to their problem when I tried explaining the above. That is, until I attended a 2-day Master Class “Event Storming” by Alberto Brandolini. For those who are unfamiliar with Event Storming, it is a workshop format for quickly exploring complex business domains. I can try to explain everything here, but it is better to read it first hand from the creator himself on his [blog](http://ziobrando.blogspot.nl/2013/11/introducing-event-storming.html): or read and order his [book](https://leanpub.com/introducing_eventstorming) (Highly recommended!).

The thing that stood out most to me during this workshop is that Event Storming is



a collaboration tool that does not require IT-knowledge. Event Storming is a visual way of talking about models and behaviour which leaves out the technical implementations that domain experts do not know about or need to know about. This model can  be implemented in the code right away! The only real challenge I encounter when using Event Storming is that developers have the tendency to talk in IT language.

Getting the UI out of the domain expert is also the hard part for running good refinements with an UI design. In my opinion, this is why using techniques like Event Storming or [Example mapping](https://cucumber.io/blog/2015/12/08/example-mapping-introduction) are so important and useful to use during your refinements. At least for me and the teams I worked with, this was a major improvement to the quality and sharing the right mind-set about behaviour and specifications

In one of my next blog posts, I will explain more about combining these two techniques!
