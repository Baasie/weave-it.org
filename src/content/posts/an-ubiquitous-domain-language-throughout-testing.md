---
title: "An Ubiquitous Domain language throughout testing"
slug: "an-ubiquitous-domain-language-throughout-testing"
status: "Idea"
tags: ["bdd", "ddd"]
seoTitle: "An Ubiquitous Domain language throughout testing - Weave IT"
seoDescription: "We want to create software and tests with an ubiquitous domain language. Read more about how to combine Domain Driven Design and Behavior Driven Development"
published: 2017-10-30
---

One of the biggest challenges as engineers is to write working software and also keep an extensive documentation. Most engineers hate writing documentation, and after they published documentation on a wiki it will die a lonely death. We want to strive for writing a [Living Documentation](https://leanpub.com/livingdocumentation) in an [Ubiquitous Language](https://martinfowler.com/bliki/UbiquitousLanguage.html). Practices like [Domain Driven Design (DDD)](https://domainlanguage.com/ddd/) and [Behaviour Driven Development (BDD)](https://dannorth.net/introducing-bdd/) can help you achieve this. Especially when we start writing code, it is really important for the quality of our software to start with tests describing what your application does. We want to write software with [empathy](http://engineering.pivotal.io/post/abstraction-or-the-gift-of-our-weak-brains/) in mind, software that is understandable** **for peers. While software developers are beginning to use the language of the domain (business language) more in their application code, most tests still contain a lot of technical language.

<!--more-->

## Unit Testing

As software developers we have all been there: the moment you pull in a new project and you start with trying to figure out what it does. You start figuring out how the design works and eventually you want to know what a piece of software really does, so you open up the unit test and find something like the following test code functions:

public void testReservation()  public void should_reserve() public void buildReservation()

It might be even worse, a critical software bug was reported, and you try to figure out where the bug came from. Tests like the one in the example do not tell you how the code should behave, it does not match the language the bug is reported in. Getting insights into what went wrong takes a lot of language/context switching, and translating, which is time consuming and a waste of time. What would have helped in this situation is that the tests are written in such a way that they tell you how the code should behave in the** **domain language. This way the model that the bug is reported in, and the tests and code have the same language and model.

## Acceptance Testing

The same example usually applies to acceptance tests. In most cases these are still being owned by the testers, which in my opinion is a strange behaviour because the only one capable of breaking them are actually software developers. If you are lucky enough that the acceptance test are owned by the developers, you can start with crunching some domain knowledge through these tests. Then you open up the tests only to find the following:

Scenario: Redirect user to originally requested page after logging in Given a User "dave" exists with password "secret" And I am not logged in When I navigate to the home page Then I am redirected to the login form When I fill in "Username" with "dave" And I fill in "Password" with "secret" And I press "Login" Then I should be on the home page

This is what we call the implementation pitfall. It is when software developers use a tool out of his or her [context](https://cucumber.io/blog/2014/03/03/the-worlds-most-misunderstood-collaboration-tool), in this case usually Cucumber. Reading this does not give you information about the behaviour of the system, only about** **how the behaviour is implemented. Of course it is better than no acceptance tests, but think about the consequences of this action. Usually the behaviour of a system does not change, there will only be new behaviour, or behaviour will be removed. **T**he implementation details of the system is the only factor that changes. Every time this happens, we do** **not only need to change the system, but also the feature files and test code. As developers, we learn to create low coupling system, describing features as implementation in [Gherkin](https://cucumber.io/docs/reference)** **files is high coupling, and something we really do not want! Besides, as a software developer I want the documentation to match the model and the language of the domain, which should not be the implementation!

## Domain Language

**W**hat we want is to create software and tests that match the domain language and model. To do this I usually start by introducing teams I consult to a BDD format called [Specification by Example.](https://gojko.net/books/specification-by-example/) I focus on letting the teams learn the domain language and to get the model and language to match. Remember that it is all about the conversation here, and not about tooling. I do not want to introduce any tools yet here. Learning and discovering the domain is the most important. After a while I will** **introduce other techniques, such as** **[Example mapping](https://cucumber.io/blog/2015/12/08/example-mapping-introduction), [Event storming,](http://eventstorming.com/) and the [OOPSI](https://jennyjmar.com/2016/04/16/bdd-discovery-and-oopsi/) model.

In the following blog posts I will go more into detail about the examples given here and discuss several tools that can support you with this process.

Also, this post is published on the blog of [Xebia](http://blog.xebia.com/ubiquitous-domain-language-throughout-testing/)
