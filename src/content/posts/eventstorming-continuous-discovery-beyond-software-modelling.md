---
title: "EventStorming; Continuous discovery beyond software modelling"
slug: "eventstorming-continuous-discovery-beyond-software-modelling"
status: "Idea"
tags: ["deliberate discovery", "domain-driven design", "domain modelling", "eventstorming", "microservices", "microservices architecture"]
seoTitle: "EventStorming; Continuous discovery beyond software modelling"
seoDescription: "Organisations need to adopt EventStorming for domain modelling their microservices, even ThoughtWorks agrees. But EventStorming goes beyond that."
published: 2018-11-26
---

## Moving towards a microservices architecture

We see a lot of companies are moving towards a microservice architecture. The big pitfall of microservices architecture is to focus on the technology, how big the microservice needs to be, how many lines of codes, what entities do we put in a microservice, and using rest as the communication between them. But to succeed we need to focus on the problem space, by crunching domain knowledge and do domain modelling. EventStorming is a perfect fit for domain modelling, and almost all the microservices leaders seem to agree. Even ThoughtWorks finally put EventStorming on ‘adopt’ in their most recent rendition of their [technology radar](https://www.thoughtworks.com/radar/techniques/event-storming). But EventStorming has grown to be more than just a tool for domain modelling and to be successful and create autonomous teams you need to use EventStorming for more than only domain modelling.



<!--more-->

## Event Storming or EventStorming

My first EventStorming experience was more than four years ago by Mathias Verraes in his Domain-Driven Design workshop. Since then I started to model my software with EventStorming. EventStorming, or mostly being written as Event Storming nowadays, is according to [Alberto Brandolini his website](https://www.eventstorming.com/) a flexible workshop format for collaborative exploration of complex business domains. EventStorming is a technique that uses visualisation to minimises assumptions by engaging in deliberate, collaborative learning between different disciplines. EventStorming helps to solve complex business problems in the most effective way beyond silos or specialised boundaries.

Essential to EventStorming is creating the required space to model, meaning finding a wall at least 6 meters long to put a paper on. We need enough moving space, so that means in most meeting rooms moving tables and chairs to the side (especially at corporates). Invite the right people who have the knowledge needed (your domain experts) and give them a marker each. We focus on visual storytelling by writing domain events, things that happened, on an orange sticky and place it on a timeline. It does not have to be orange, but it has to be consistent. Use a legend to make this explicit.



## Conquer and Divide

The first part of EventStorming, the storming of domain events, is essential. Everyone has their perception of reality; everyone has their specific model of it in their mind. What we try to achieve is to let people make that model explicit with domain events. That means that a heuristic to start with is to let everyone write down domain events for their perception and place it on the timeline. Conquer and divide is this pattern Alberto wrote about in his [book](https://leanpub.com/introducing_eventstorming) EventStorming on Leanpub. There are a lot more of these patterns written down in that book. The book also describes three types of EventStorming; Software modelling, process modelling and Big Picture. To make used systems that in an as-is process explicit, we use Process modelling EventStorming. A good starting point when you want to disentangle your current monolith or a big ball of mud system towards a more microservices architecture.

## The blind man and an elephant

In my opinion, the most critical and exciting EventStorming type is the big picture. Especially in a Big Picture conquer and divide is essential. You invite 20+ people from all silos in the organisation to do EventStorming together. You need at least an excellent facilitator and an observer to pull this off, but it will help to battle the [parable of the blind men and an elephant](https://www.allaboutphilosophy.org/blind-men-and-the-elephant.htm), where every silo thinks they have the absolute truth. A Big Picture EventStorm gives an organisation a clear vision of the company goals and makes bottlenecks and competing goals explicit. It also starts showing you multiple contexts to create a context map of the organisation. If you try to move towards more autonomous teams with a microservices architecture, Big Picture EventStorming will help your teams to share knowledge, align their goals, and focus on a shared vision.



## Beyond big picture, process and software modelling

As you see we need to do more than only EventStorming for software modelling. To create autonomous teams using a microservice architecture we need continuous deliberate, collaborative learning to be successful. We need to move from a Big Picture EventStorming, finding the context and bottlenecks to move towards EventStorming process modelling. A process model will give you all the details needed to start finding the bounded context to move towards EventStorming software modelling.

You can use EventStorming for more than only these three types. In a previous [post,](https://xebia.com/blog/eventstorming-the-perfect-wedding/) I already showed how I successfully used EventStorming to plan my wedding. Also, I use EventStorming a lot to model the development flow of the team as described by Paul Rayner in his [talk](http://videos.ncrafts.io/video/275328050) ‘Fighting the invisible enemy’. You can use it to map out your customer journey, value stream mapping, threat modelling, ethnographic research, post-mortems, and even for retrospectives. For everything with a timeline, telling a story EventStorming is my preferred tool. But don’t think EventStorming is the silver bullet, it has its blindspot. I usually start with EventStorming and try to combine it with for instance [Example Mapping](https://cucumber.io/blog/2015/12/08/example-mapping-introduction), [Domain Story Telling](http://www.domainstorytelling.org/), [Impact Mapping](https://www.impactmapping.org/), [User Story mapping](http://www.jpattonassociates.com/user-story-mapping/), and [heuristics mapping](http://verraes.net/2018/04/design-heuristics/). It all comes down to continuous, deliberate collaborate discovery with a visual tool.

Also, this post is published on the blog of [Xebia](https://xebia.com/blog/eventstorming-continuous-discovery-beyond-software-modelling/)
