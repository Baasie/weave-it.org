---
title: "Cultural needs designing bounded contexts"
slug: "cultural-needs-designing-bounded-contexts"
status: "Idea"
tags: ["bounded context", "collaborative modelling", "culture", "domain-driven design", "socio-technical architecture"]
seoTitle: "Cultural needs designing bounded contexts - Weave IT"
seoDescription: "Domain-driven design bounded context has several culture benefits, like team ownership, however we also have cultural needs designing bounded contexts"
published: 2019-07-16
---

Without a doubt, the bounded context pattern from Eric Evans book domain-driven design is one of the more essential patterns for designing and building modern software. Especially in the land of microservices architectures, where setting proper bounded context which is highly linked with the business goals aka the domain is essential to not get into the distributed monolith anti-pattern. The bounded context is in its core a language boundary, a boundary where language can stay consistent and which is the boundary of the model designed for a purpose. Boundaries for people are crucial from a culture perspective. People cannot live without boundaries; it is a way in which we can define our self and separate us from the rest. To define our self creates an identity, a feeling of belonging which in time can create ownership. However, to be able to define our self, we must also define the others to keep our own identity. When we look at cultural anthropology, we traditionally did this on the border through get-togethers like marketplaces, where we exchange goods. Now if we want to keep the cultural benefits of the bounded context within our company, we must also take care of the cultural needs designing bounded contexts. In this post, I describe these culture needs when using the bounded context pattern.

<!--more-->

## The bounded context pattern

The bounded context is a pattern from Eric Evans book domain-driven design. The pattern is fuzzy by design, so let me first explain what I mean with the bounded context pattern. The bounded context is a conscious design decision a group of people, preferably a team makes. When designing a bounded context, we focus on a language where we really crisply concisely describe the situation in the domain. We create a model for a purpose where the language in that boundary stays consistent over time. Consistent over time, meaning the language of the model will never be ambiguous, it can change over time. We use a shared language created through conversations between business people (specialists) and software people, which becomes the ubiquitous language. The focus on language means the bounded context is a language boundary and not a system boundary as you we see in microservices. The bounded context, for that reason, does not mean you also have a system boundary.

## The cultural benefits designing bounded contexts

Several people in the domain-driven design community already talked about the cultural benefits of a bounded context. In almost all these talks, we see a reference to Daniel Pink’s his book ‘Drive: The Surprising Truth About What Motivates Us’. In his book, Daniel explains that MIT studies show that employees who work beyond basic tasks won’t get more motivated by more money after a certain threshold. That threshold being meeting the basic needs and feel that they are being paid fairly. After this threshold, people only get motivated by autonomy, purpose and mastery. The cultural benefit of a bounded context, when properly designed, is that it gives us autonomy and purpose. It gives us a purpose because we define a model for a purpose, and it gives us autonomy by being a language boundary. Some also call the bounded context an autonomous boundary. It does increase autonomy, and that also gives us a chance to increase our mastery, depending on the culture of the company, of course!

Another cultural benefit of the bounded context is in its name, bounded. Bounded means we draw a border around a context and a team can take ownership of that boundary. As humans, we need borders to be able to identify with each other in a group. That group can become a team with its own identity and individuality. However, in Jitske Kramer her book [Jam culture](https://jamcultures.nl/) (Later this year translated in English) she says:

> “We can only create that identity and individuality by others. We have never defined our self without others. Because of the way other people are, we can be the way we are. Because of the borders with others, we are ourselves.”

In that same line of the reason we see the same for architecture design, where the following tweet of Ruth Malan in my opinion explains it all:

> Architectural design is system design. System design is contextual design — it is inherently about boundaries (what’s in, what’s out, what spans, what moves between), and about tradeoffs. It reshapes what is outside, just as it shapes what is inside. — VisArch (@ruthmalan) [January 5, 2019](https://twitter.com/ruthmalan/status/1081578760271523840?ref_src=twsrc%5Etfw)

## The cultural needs designing bounded contexts

In her book Jam culture Jitske Kramer also mentioned the following:

> “A tribe, community or organisation exists because of the border between inside and outside, who is in and who is not. We form our own subculture by comparing us to others, by finding the contrast with another. We need each other to find ourselves. We also loose ourself because of others.”

An effect that boundaries can have is that we can turn more into isolation if we are not careful. Focussing on our own goals, and losing contact with other teams. It can also happen because of the need to protect ourselves if the company culture is a blaming culture. Focussing on KPI and targets, if something goes wrong that we feel is because of other teams, these boundaries can turn into concrete walls. We try to isolate ourselves more; we believe we don’t need other people to succeed in making our goals. So for bounded contexts to really work, we need a generative culture, where we are focussing on being transparent and sharing information at the borders of our boundaries. In her book Jitske Kramer explains the following:

> “Traditionally we come in contact with each other through marketplaces and trading routes, were different groups trade goods, stories and gods, fall in love and make conflicts.”

People depend on each other, so it is crucial that we create a culture where we frequently meet each other on the boundaries. Within Xebia we do this by having an internal conference every other week. We as consultant decide the agenda. It is vital that the company facilitates these conferences. Don’t let your employees do this entirely on their own and in their own time; people have families and private life which are more important than your company. These conferences are bringing value to both the company and the employees, so be serious about them. Recently Victoria Morgan-Smith and Matthew Skelton wrote a [book](https://confluxdigital.net/conflux-books/book-internal-tech-conferences) about Internal tech conferences, where they share practical advice on how to prepare, run, and follow-up on an internal tech conference. These internal tech conferences give your teams the mastery to perform better at there job.

## Socio-technical architecture

While internal tech conferences give us better knowledge on the technical part of our identity, we also must share the purpose of our bounded contexts with others. Stay connected with the vision and goals of the company and other teams. Here I see an essential job for architects. In my honest opinion, an architect should be socio-technical instead of only technical. An architect should focus on sharing knowledge between teams and contexts, rather than figuring out what the perfect architecture is. They should facilitate and create marketplaces for teams to align with the company goals, instead of telling teams how they should work. They should act as a neutral party to make sure teams can identify themselves with other teams. However, they should also lead when necessary, making decisions based on the needs of the teams. They need to be a ‘spider in the web’, having a helicopter view of all the contexts and together with the teams design strategic socio-technical patterns. The most important part of a socio-technical architect is to be a benevolent leader to the teams!

## Collaborate modelling

So how do we facilitate these marketplaces? The way I have been doing it for over a couple of years is by doing regular collaborative modelling sessions. For a company, we can do a big picture eventstorming each quarter. The outcome is sharing domain knowledge, aligning the teams and the business, and find our theory of constraints. For a new proposition or change in our domain, we can check the impact with impact mapping, visualising what the impact is on the teams. On a more detailed level, we can have several teams working on a product and do user story mapping. Between teams, we can do several different collaborative modelling types from EventStorming and Example Mapping to domain storytelling and feature mapping. What is essential when changing the way or working is to do these frequently between teams, like a stand-up. When we want to start changing the culture, we need to spread this new behaviour as often as possible, to show people the benefit and get it into their system.

So if you are moving towards designing bounded context, or even using a microservices architecture, be sure also to change the way you are working, be sure to change your culture! I am very interested in how your company, or how you create these marketplaces between teams.

Also, this post is published on the Xebia [blog site](https://xebia.com/blog/cultural-needs-designing-bounded-contexts/).
