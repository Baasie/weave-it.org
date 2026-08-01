---
title: "EventStorming and how to monitor Domain Events for product management"
slug: "eventstorming-and-how-to-monitor-domain-events-for-product-management"
status: "Idea"
tags: ["continuous delivery", "domain-driven design", "domain events", "eventstorming", "product management"]
seoTitle: "EventStorming and how to monitor Domain Events for product management"
seoDescription: "Is it worth the effort to build a solution for a specific exception flow of our product? We can find out by EventStorming and monitoring our Domain Events"
published: 2018-10-22
---

We design, model, and create software to solve a problem for our customer (this can also be a customer from within the same company). Only when we do so, we focus naturally on solving the happy path and want to deliver that value as soon as possible. The only problem here is that we will always come to a point where we get corner cases or business exceptions, and the question starts to arise, what shall we do? Is it worth the effort to invest in building a solution for this, or can we leave this function out of the system because it is not worth it? To answer this question, we want, if possible, feedback from the system to know this. We can quickly get this feedback making it explicit in the form of a Domain Event during our EventStorming and start monitoring it. This way we can leave the options open until we know what to do.

<!--more-->

## Domain Driven Design, Domain Events and EventStorming

Domain Events is a tactical pattern from Domain Driven Design. It is not in the original book, but created later and is documented in the reference book as ‘something happened that domain experts care about’. It is the central concept used in EventStorming. EventStorming is a flexible workshop format for collaborative exploration of complex business domains. For our example today we will be using EventStorming to show you how we can leverage it to find these Domain Events to monitor. The domain we use is the cinema, and the problem is letting customers buy tickets and reserve seats for a particular screening of a movie. We start with a Domain Event telling us that a customer wants to buy some tickets. The Domain Event resolves in tickets requested event and starts of our reservation process.

[



](https://storage.googleapis.com/xebia-blog/1/2018/10/From-EventStorming-to-CoDDDing-New-frame-3.jpg)

When we start the reservation process, we do this by reserving the number of seats requested by the customer. Now we have several consistent business rules in place when we do the action. It means that there is no contradiction, in this case, we want to only have one person per seat, only adjacent seating and max eight tickets per customer. The one seat per person seems logical, but when booking an aeroplane ticket, they usually overbook the plain, and that means that this rule does not apply. We want to be explicit about every rule that, these affect our modelling. Now when we take the second rule, only adjacent seating, we can get a corner case or business exception. The question will arise, what do we do when there is enough seating left, but they are not adjacent?

[



](https://storage.googleapis.com/xebia-blog/1/2018/10/From-EventStorming-to-CoDDDing-New-frame-5.jpg)

What we want to do is make this question explicit in our EventStorm so that we can talk about visual things. So we want to create a Domain Event from it and add a question on it. Now while discussing this question, the developers will most likely tell that implementing this flow will cost some time and effort. At this point, we have no feedback data of how many times this will happen, let alone know how many of our users are okay with no adjacent seatings. So before jumping in and solve this problem we want to gain feedback. We want to find a way in where we can still be customer friendly, and also get feedback if we need to implement this. So a possible solution would be to monitor the Domain Event and react on it by telling the user that this option is not available at the moment, but ask them if they do want this. A story like this won’t cost a lot to implement, and we can get it fast to production. Now we can get quickly, timely, reliable feedback and adjust our backlog accordingly. We now can know if the investment in solving this exception is worth it or not.

UPDATE:

After a great [discussion on twitter](https://twitter.com/yreynhout/status/1054677391560318977) on the word exceptions that I used in the intro, I update it to corner cases or business exceptions. Also, Jeremie Chassaing [blogged](https://thinkbeforecoding.com/post/2009/12/10/Business-Errors-are-Just-Ordinary-Events) about the subject.

Also, this post is published on the blog of [Xebia](https://xebia.com/blog/eventstorming-and-how-to-monitor-domain-events-for-product-management/)
