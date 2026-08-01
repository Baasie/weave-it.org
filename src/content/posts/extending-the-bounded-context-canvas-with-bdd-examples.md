---
title: "Extending the Bounded Context Canvas with BDD Examples"
slug: "extending-the-bounded-context-canvas-with-bdd-examples"
status: "Idea"
tags: ["bounded context", "bounded context canvas", "domain-driven design", "eventstorming", "example mapping"]
seoTitle: "Extending the Bounded Context Canvas with BDD Examples - Weave IT"
seoDescription: "The bounded context canvas is a good starting point to start designing our model for a bounded context. Let's extend it with examples from our BDD process"
published: 2020-03-09
---

Ever since Nick Tune [introduced](https://medium.com/nick-tune-tech-strategy-blog/modelling-bounded-contexts-with-the-bounded-context-design-canvas-a-workshop-recipe-1f123e592ab) the world to the Bounded Context Canvas, I incorporate it in my workshops and trainings. Nick sees the canvas as a checklist for designing our Bounded Context canvas. For me, it is also perfect as a visualisation tool to make the Bounded Context explicit. The one thing I am missing is examples in the form of acceptance criteria discovered and eventually formalised during our Behaviour Driven Development flow. In this post, I explain how I extended the Bounded Context Canvas with BDD examples from Example Mapping to show how to formalise the behaviour of a Bounded Context.

<!--more-->

## How do we design Bounded Contexts with EventStorming

As you can read in Nick Tune’s his post, he uses the following recipe:

- Big Picture EventStorming (min. 1 hour)

- Candidate Context Modelling (min. 30 minutes)

- Domain Message Flow Modelling (min. 30 minutes)

- Bounded Context Canvas (min. 90 minutes)

- Refined Context Exploration (min. 45 minutes)

The approach I take is similar; only I generally start with process or design level EventStorming during the Domain Message Flow Modelling stage instead of Domain storytelling. Or I do that after the recipe Nick mentions to refine my Bounded Contexts even more. Which one and in what order to use highly depends on the situation you are in, both situations I used before and worked. People know I would like to combine tools and recipes based on what is needed, and my gut feeling tells me to do at the moment.

From EventStorming, I have a set of heuristics that help me guide into designing Bounded Context. Let me give you a naive example of an allocation process for a movie theatre:

!

I used this example before, and there is a lot wrong with it, but it is perfect for explaining where we are going. This outcomes of the EventStorming is usually the first iteration when doing an EventStorming session. Now from here, a heuristic that I use is: [Design Bounded Contexts around policies](https://www.dddheuristics.com/design-heuristics/design-bounded-context-around-eventstorming-policies/). So let’s say we want to design an allocation Bounded Context.

## How to fill in the Bounded Context Canvas



Above you find the first draft of the Bounded Context Canvas filled in for allocations. Don’t mind the strategic classification, I won’t discuss this in this post, and you can read all about it in Nick Tune his post! As you can see, I filled in the canvas from the outcome of the EventStorm. It is not complete yet, but that does not matter for now and for the example.

## The need for examples

Now before we start to design our domain model based on the big discoveries we made upfront during this process, we need to have acceptance criteria in the form of examples. The Bounded Context pattern is an autonomous pattern, and so it needs to handle certain behaviour as examples autonomously.

A sign of tight coupling within an application architecture is a need for end-to-end testing, meaning to test an example and need several bounded contexts to check it. These end-to-end tests are a big [anti-pattern in continuous delivery](https://www.continuousdeliveryconsulting.com/blog/end-to-end-testing-considered-harmful/) and also a big anti-pattern in Domain-Driven Design. It does not mean that you cannot have several bounded contexts to support a value stream; it means that we did not spend enough effort in designing our Bounded Contexts for autonomy.

To discover and eventually formalise the examples for a Bounded Context, I like to use a technique called [Example Mapping](https://cucumber.io/blog/bdd/example-mapping-introduction/). I have [written](https://xebia.com/blog/model-exploration-whirlpool-domain-driven-design-the-first-15-years/) about combining EventStorming with Example Mapping before, and how switching the tool can help you battle biases that are in tools making sure you don’t make our million dollar mistake.

## Example Mapping



Above you see an unfinished Example Map but it gives you the idea that switching a tool can help discover even more about our domain. It is important that you keep using and iterating over our domain language during Example Mapping. I also like to collect domain language and concepts here on index cards, because these are clues for our domain model.

From our Example Mapping, we can start formalising our acceptance criteria as scenario’s based on the examples we discovered. I like to use gherkin at this stage, using the language of the EventStorming like:      **Given** specific Domain Events happened   **When** I do Command X   **Then** I expect this Domain Event      There are more combinations that you can use, don’t lock yourself into the gherkin format.

## Extending the Bounded Context Canvas

By adding the formalised scenario’s to the Bounded Context Canvas, we know what our Bounded Context model needs to comply to. With this scenario’s, we can easily see what behaviour our Bounded Context needs to solve. Using the Bounded Context Canvas now as living documentation, visible to everyone to see helps in making the Bounded Context more tangible.

Another added benefit of the scenarios is that after designing our domain model, we can go straight to outside-in TDD to implement our domain model. Using the scenario’s as our course-grained fast feedback unit tests, we discover more insights about our design, which makes us experience how decoupled and flexible our model is. We have fast and instant feedback to inspect and adapt our Bounded Context design.



In my next blog post, I show you how we can go from a proposed domain model and formalised scenarios to modelling with Responsibility-Driven Development and implementing it with outside-in TDD.

Also, this post is published on the Xebia [blog site](https://xebia.com/blog/extending-the-bounded-context-canvas-with-bdd-examples/).
