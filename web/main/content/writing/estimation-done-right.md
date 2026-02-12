---
title: "Estimation Done Right"
date: 2022-08-09T23:39:03+02:00
description: "How to make useful estimates and stabilise your flow."
tags:
  - "engineering management"
keywords:
  - "engineering management"
  - estimation
  - process
aliases:
  - /writing/estimations-done-right
---

Product development teams often have problems with estimation. The reasons are
well known: software is hard, there are too many details to take into account,
and no one can consistently consider every aspect at estimation time.

Because of these well-know problems, both individual contributors and their
leaders tend to overestimate _everything_. It is only human to do so and, over
time, teams just stop trusting the accuracy of their estimates.

The lack of trust in estimates is tragicomically common in our industry and a
good strategy is to remove the process completely.

If no one trusts estimates, what's the point, right?

Whoever is asking for an estimate – be that product managers, the marketing
department, the actual customers (that's the best option!) – they do so because
having a proper timeline is relevant to their work.

So how does one find a balance between stakeholders' needs and the hard truth
that estimation is an unpleasant, nonsense, unproductive process?

At a Latin class, the teacher would tell me _virtus in media stat_. It
translates to "virtue stands in the middle". It's the guiding principle that
made me accurately estimate many projects over the course of my career. Bear
with me, it'll become clear in a minute.

You _can_ design a process that removes estimation from your daily operations
and still gives a good estimate to whoever needs it.

The key is to focus on what makes estimation hard: product development is often
unpredictable therefore our estimation capabilities are bad.

I invite you to take a minute or two to think about the situations in which you
could safely say "this feature will take X effort" and then you were actually
right.

Done? Good.

I have spent a great deal of time thinking about this and I found that
predictable features show the following characteristics:

- The effort is the smallest possible in the given context.
- During the development phase, there was no back and forth between whoever
  specified the feature and whoever built it. The input was clear, no questions
  arose. After all, the feature was so small there was _almost no input_.
- After the feature was deployed, there were no hot-fixes. The deployment was
  smooth, the system just kept working. After all, the diff was so small the
  system _almost did not change_.

Unfortunately, most features do not check off these boxes.

They _should_ though.

A feature built via "a small diff" that went from start to rollout without any
problem _is_ the perfect scenario.

The sceptical here would say: it is called perfect scenario because it never
happens. I do not disagree with that, but I prefer to apply the following
principle instead:

> Strive for perfection, but accept that done is better than perfect.

The balance between an ideal and real world scenario is important and it should
always be taken into account. _Virtus in media stat_.

In the ideal world, all features would require "a small diff", have a perfectly
understandable input, and ship to production with no problems.

I know reality is not so simple, but the ideal scenario gives us a clear
indication: small diffs are better than large diffs. They lead to short work in
progress, and easy deployment.

So striving for perfection in this context means:

> What if all the features we develop were as small as possible?

Then they all would exhibit the three characteristics I just discussed... right?
And that would result in a perfectly predictable flow!

Here is a trivial example:

- You have to develop a large feature. Large enough you can picture how many
  days or weeks it will take.
- After discussing with the team how to split it, you break it down into X "small
  standard features".
- You know your "small standard feature" takes half a day.
- You're looking at X/2 days of work.

Splitting process doesn't guarantee absolute predictability.

The argument "if every single feature we build takes half a day, we know exactly
how long anything takes" is strong though. You'd need way too many things to go
wrong for this formula to fail.

The challenge moves away from guesswork and it becomes getting better at
breaking down work into small, coherent, deployable chunks of work.

"Estimation done right" means your estimation process is a means to an end.

The goal is to mitigate the unpredictable nature of product development by
splitting features.

This process has interesting side-effects on the communication infrastructure
of a team, too.

Continuously breaking down big features into smaller parts requires a lot of
communication. It is a gym for empathy.

It may be hard to break down a big feature for one reason or another: the
product angle, the design one, the technical feasibility, and so on.

These conflicts help team members put themselves in others people's shoes and
bring everyone closer. They can finally see problems from a different
perspective. With some practice, they'll start anticipating others people's
needs.

Team members get closer and collaborate better if they have to break down
features all the time.

If that gets you a predictable flow, why wouldn't you do it? I personally see no
downsides.

{{< leading-developers >}}
