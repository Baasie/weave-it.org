---
title: "Crossing the bounded context, events-first, the REST is not needed"
slug: "crossing-the-bounded-context-events-first-the-rest-is-not-needed"
status: "Idea"
tags: ["architecture", "domain-driven design", "eventstorming", "events first"]
seoTitle: "Crossing the bounded context, events-first, the REST is not needed - Weave IT"
seoDescription: "A lot of companies decide to use REST to communicate between bounded contexts and/or services. What can happen is that the services in the bounded context now get dependent on each other to finish their process. Event Storming and events-first DDD can help us Design better autonomous microservices-architecture."
published: 2018-07-31
---

Technical design decision can have a severe impact on companies their communication structure. [Conway’s law](http://www.melconway.com/Home/Conways_Law.html)  explains; “Any organization that designs a system (defined more broadly here than just information systems) will inevitably produce a design whose structure is a copy of the organization’s communication structure.” Such is the story also with a microservices architecture. A lot of companies decide to use REST to communicate between bounded contexts and or services. What can happens is that the services in the bounded context now get dependent on each other. The dependency on finishing a service their process will resolve in cascading failures if a service is down. Cascading failures will reflect on the way organizations communicate between teams. Teams now rely on each other before finishing their process. Dependency between teams can severely disrupt the company to respond better to the fast-changing demands of customers; companies get more entangled than before. To combat getting cascading failures, we must follow the communication structure of the business. We can do this by using [Event Storming ](http://eventstorming.com/)and going [events-first](http://www.russmiles.com/essais/going-events-first-for-microservices-with-event-storming-and-ddd).

<!--more-->

## REST as communication between bounded contexts

Companies and teams that design microservices usually end up using Domain Driven Design (DDD). DDD is a holistic approach to software delivery by creating multiple bounded contexts with their ubiquitous language to solve specific business problems within a model. It is the bounded context pattern which is the most helpful in designing microservices architecture. When teams create bounded contexts, they start searching for ways to decouple them from one another. In the last couple of years, REST got a lot of traction within the developers’ community. REST is a useful architectural pattern to decouple a service from its front-end. It is because of this traction REST is usually the favourite pick to expose services functionality.[



](http://storage.googleapis.com/xebia-blog/1/2018/06/ShipOrder.png)

The decision of using REST for communication between bounded contexts, however, can have dire consequences on the ability to stay autonomously. When a process finishes, you sometimes need to communicate this to other bounded contexts. If you will use POST or PUT for this, you will get dependent on the other bounded context to be responsive. If that bounded context fails to respond, that process will be unfinished. While your process has finished its purpose, we cannot communicate it. So either we need to build something that will remember the call, or we will have cascading failures. Often teams that experience cascading failures will need to set up some service level agreement (SLA). Teams become less autonomous because at each change they need to take into account that SLA.

## Events-first microservices architecture with Event Storming

Russ Miles already mentioned in his [blog](http://www.russmiles.com/essais/going-events-first-for-microservices-with-event-storming-and-ddd) post to consider going events-first. Events turn out to better capture the ubiquitous language of a domain or system. To find domain events we can use event storming. Event storming is a simple form of visual communication that everyone can understand. Based on storytelling, the technique involves writing down events and placing them in a timeline using orange sticky notes. Event storming minimizes assumptions through collaborative, deliberate learning from each person’s perspective and different discipline. It uses multiple disciplines to solve business problems in the most effective way.

[



](http://storage.googleapis.com/xebia-blog/1/2018/06/event-storming.png)

Copyright Alberto Brandolini

Not only does this approach work well in designing complicated software, but it also helps you find events to decouple your bounded contexts from others. You can expose these events to another bounded context through a message broker. Once you put an event on a message broker, it needs to make sure it gets delivered. Once the message got sent to the message broker, the process is finished and can continue on the next thus not having cascading failures anymore.

If you want to know more about DDD or EventStorming, consider reading my [whitepaper](https://pages.xebia.com/whitepaper-gain-strategic-advantage-by-leveraging-domain-driven-design-eventstorming).

Also, this post is published on the blog of [Xebia](https://xebia.com/blog/crossing-the-bounded-context-events-first-the-rest-is-not-needed/)
