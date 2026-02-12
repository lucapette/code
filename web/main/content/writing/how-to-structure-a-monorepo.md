---
title: "How to structure a monorepo"
description: "A discussion on how to approach organising a monorepo."
tags:
  - programming
  - monorepo
  - "engineering management"
keywords:
  - programming
  - monorepo
date: 2022-09-28T07:09:51+02:00
---

{{< message class="is-info">}}

This article assumes you're _already_ convinced that a monorepo is how you want
to organise your codebase.

While I mention some benefits of the approach, they are part of a larger set of
benefits I discussed in [The appeal of monorepo]({{< ref
"/writing/the-appeal-of-monorepo" >}} "the appeal of monorepo").

{{</ message >}}

With this article, I initially intended to provide some sort of "starting
template" for a monorepo. The deeper I got into the topic, the more obvious it
felt to me that this wasn't a valuable approach.

A coherent, useful monorepo structure requires too much contextual information.
Instead of providing a template that may or may not make sense to you, I will
share my thoughts on this.

While I have always appreciated the technical benefits of a monorepo, over the
years I also came to appreciate monorepos as an engineering leadership
communication tool:

- Everyone sees all the commits.
- Everyone can find any existing project on their own. After all, everything is
  in the same place, right?

Both points are interesting, but the second one is relevant in the context of
this conversation.

The point is that the discoverability of your monorepo is only as good as your
naming and, while I don't think discoverability is the most important technical
benefit of adopting a monorepo, focusing on it can be an intriguing leadership
tool.

The idea is somewhat trivial: you can draw some parallels between the structure
of your monorepo and the structure of your organisation. You can use these
analogies to achieve both a better structure for your monorepo and a simpler
organisational one.

Organisations are living organisms that change all the time. So is a monorepo.

To illustrate this relationship, let me provide an evolutionary example.

Say your startup just launched. It's the tiniest team: you're the only
developer. Your product is a subscription service for some physical goods.
Customers come to your website, subscribe to your service, and you send them
things once per month.

Right now your monorepo looks like this:

```sh
├── api
├── docs
├── infra
└── web
```

It's just three projects and the docs.

You've got your web application, your infrastructure-as-code project, and an API
project.

You can already see some benefits of the monorepo. No need to jump over multiple
repositories, you can do atomic changes. Soon you'll need to share some assets
and you'll just add one more directory.

The structure of the monorepo right now is as flat as it gets, after all you're
working alone on this. Your organisation is also completely flat.

Fast-forward one year. You now have a small team. Your project is successful,
you have an iOS app (Android coming soon!).

Your monorepo looks like this:

```sh
├── android
├── assets
│   ├── i18n
│   └── images
├── docs
├── infra
├── ios
├── platform
│   ├── api
│   └── workers
└── web
```

It looks different!

There's a young platform team that is responsible for both your API endpoints
and your subscription jobs. You're not super happy with the naming of the teams
(therefore the folders in your monorepo), but you know things will change soon
(they always do) and you'll get a chance to improve the naming a little.

The structure is still flat, but you're starting to see the first clusters.
There's still overlap between the way you organise your teams and how the
monorepo looks like.

Fast-forward again, two years passed. You're a victim of your own success! You
can barely keep up with the people joining, you now have a number of teams.

Your monorepo looks very different now:

```sh
├── assets
│   ├── i18n
│   └── images
├── docs
├── infra
├── lib
│   ├── kt
│   │   └── i18n
│   └── ts
│       └── i18n
├── platform
│   ├── marketing
│   │   └── api
│   ├── shipping
│   │   ├── api
│   │   └── workers
│   └── subscription
│       ├── api
│       └── workers
├── proto
└── ui
    ├── back-office
    │   └── web
    ├── main
    │   ├── android
    │   ├── ios
    │   └── web
    └── warehouse
        ├── dashboard
        └── tablet
```

The monorepo has much more structure now. It's not so flat anymore and there's a
clear separation of responsibility between the parts of the system that have a
UI and the under-the-hood parts.

There's still an overlap between the way you organised your teams and the way
your monorepo looks like. The monorepo needed to scale and so did your teams.

One thing that stands out is that the structure of the monorepo borrows ideas
from everywhere: the programming languages you use, your domain terms, and your
runtime platforms.

It's also clear what kind of UIs your organisation is working on. The strange
mix of tech and domain terms actually helps!

Parts of the monorepo reflect the way some of your teams are split:
subscription, marketing, shipping. Different classes of problems require their
own solutions, so we naturally tend to create teams around those. These "backend
problems" are more specialised than the UI ones, so it feels natural that the
overlap between the code and the team structure is more evident in that part of
the codebase.

Last but not least, there is a `lib` directory now. Your company is big enough
you have your own internal libraries. They are clustered by programming
languages to increase discoverability.

The example I provided isn't meant to be either exhaustive or general.

Of course this is not the only way you can organise a monorepo, but I can use it
to express some arguments that would otherwise feel too abstract.

My main argument is that you should organise a monorepo so that it loosely
reflects the way teams are split.

You don't want a one-to-one mapping but you also don't want total disconnection.
The way the monorepo structure evolved in this example is to stress the keyword:
_loosely_.

To further stress this point, take the latest evolution of the monorepo. You
can't really say how the "frontend" teams are organised.

The structure I suggest works if you use different languages for each of your
platforms as well as if you're using something like React Native. In the React
Native scenario, you'd probably have the common code in `lib/ts`. The structure
is _loosely_ based on how your teams are organised.

The subtitle of this argument is also interesting: don't make technical choices
too present in your structure. That's the other side of the coin.

For example, I like the `lib/lang` approach a lot, but I wouldn't advise to do
that for the top-level folders.

Grouping projects by the language they're written in is a bad idea. You would
have a structured monorepo but its structure would provide no actual meaning.

This is the key insight in my opinion: structuring a monorepo _is_ both a
technical _and_ an organisational challenge.

To me, it's where the conversation between engineering leadership and
engineering management should happen.

You want a structure that works technically _and_ that has organisational
meaning.

{{< leading-developers >}}
