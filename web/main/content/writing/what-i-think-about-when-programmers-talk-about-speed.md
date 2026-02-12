---
tags:
  - "engineering management"
  - programming
date: "2015-04-28T00:00:00Z"
description: Some random thoughts about programmers and their performance
keywords: developers, speed, career
title: What I think about when programmers talk about speed
---

My direct reports often ask me to assess their speed. They either feel too slow
and want to improve their performance or, a bit less often, they're looking for
confirmation that they are fast enough.

Over the years a pattern emerged in these conversations, especially with less
experienced developers: there's often a clear disconnect between the way they
think about speed and the way I think about it.

In my conversations, I always cover the following:

- Three steps from an idea to the feature.
- Forget about the code, no one cares about it.
- A conscious shipping culture.

I'm going to talk about it in this article so I can refer to it when I find
myself in such a conversation in the future. I'm sure it will happen again.

## Three steps from an idea to the feature

I use the following steps as a baseline for conversations about speed:

1. Try to figure out what code to write.
2. Write the code.
3. Ship the code.

Nothing too exciting. Programmers generally take these steps when doing their
job. But it gets the conversation going.

### Try to figure out what code to write

Even the sharpest programmer needs to understand what to do before writing some
code. They may know the system very well, they may have enough context to ask
product managers the right questions, they may be able not to miss any details.

No matter how good they are, this step takes some time. I haven't seen many
programmers being fast at this stage unless they are working on a trivial
feature.

Speed at this stage is intrinsically connected with the product development
workflow: how involved are product managers at this point? Do we use a feature
readiness checklist?

It's more of a team effort than an individual one, so focusing too much on
individual performance at this stage feels unfair.

In my conversations, I cover this step to gather feedback about our workflow and
make sure they understand that speeding this step up isn't entirely in their
hands.

### Write the code

This is where I've seen programmers' performance varying the most. Some people
are very fast at writing code, others not so much.

In my experience, most "speedy" programmers write code that is not ready to go
anywhere.

They miss critical details and the code isn't production-ready. There are lots of
"one time workarounds", there are to-dos everywhere.

It feels like they're fast unless you actually take a closer look at their code.

At this stage, speed is tangible because its output is public to the rest of the
team (pull requests being a common example) but also deceptive: producing code
isn't the same as shipping it.

What I try to explain to my direct reports when discussing this step is that
speed here is often detrimental to the quality of the code. There's a balance of
course and I cover it in "shipping culture".

### Ship the code

Speed at this stage is a consequence of what has already happened in the previous
two steps.

No actual work needs to be done at this point, right?

You did a great job at step 1, which made the code you wrote at step 2
bug-free and perfectly compliant with the requirements.

So... how many times have you seen this happen? How often code gets merged and
you forget about it forever?

I'm not sure what your answer is. It's probably closer to "ehm... not very
often!" rather than "all the time!". That leads me to the next question.

### Which step should you focus on?

In the course of my career I've seen people dealing with these steps very differently.

I've met a lot of people that like changing the order of these steps:
"let's write the code, who cares about the details. Cover one happy path now. We'll
figure out the details later!". Some say it works, others say it doesn't.

I also worked with many people who skip/don't understand/don't care about step
one. Honestly, I've met too many.

The point is that focusing too much on a specific step doesn't really make you a
better programmer. I think you can't take these steps in isolation. They don't
matter on their own. The goal is to ship code to production, so we have a tendency
to optimise the workflow for shipping. Often we overestimate the importance of the
latest step for this reason.

In reality, you have to be patient. Only some time _after_ you shipped something
(the time highly depends on the scale of the product you're working on) you get
to say "Yeah, it works". That's how you measure _actual_ speed, don't you?

Don't stop at "Oh, I love working with X! They finish stories in no time". Be
patient: look at the impact of their code over time.

Wait for bugs to come up. Wait for other programmers' feedback on how easy it
was to change their code. The more welcoming it is to change a piece of code,
the better its design is, which means the better job the programmers did, don't
you think?

The bottomline: we often focus too much on producing code instead of thinking
about the product we're building. Perfect segue into the next paragraph.

## Forget about the code, no one cares about it

I've chosen this title because I like to troll (I'm from Napoli capisc? 🤌).
Nope, not sorry.

Of course, as a technologist, I know that code matters. I know the language we
use influences results, so do the frameworks and libraries.

That doesn't change the fact that we (the programmers) are the only ones caring
about the code, languages, and frameworks when it comes to product development.

No one else cares. Your customers surely don't.

Everyone else just expects the damn button to work so they can do whatever they
need to with it. They don't care how functional and side-effect free the code
that handled the click was.

I never get tired of emphasising it. We tend to forget the fundamental property
code must have: it has to work. That's it. Nothing more.

We also tend to forget that code, languages, frameworks are just tools. They're
not a goal. They're a means to an end.

It's somewhat hard to keep that in mind when it comes to speed.

I've had people telling me: "Oh, Margaret opens pull requests all the time, she
is super fast!".

Pull requests rarely go to production the way they've been opened though. Even
when they do, you'll have to be on the lookout for bugs after you ship them.

## A conscious shipping culture

I often talk about being conscious of the way we want to ship code. For the sake
of the argument, I bring up these two extremes:

- People justify bad code going to production in the name of "shipping culture".
  So they're very fast at breaking things.
- People try to make things "perfect" before shipping them. So they're very slow
  at not breaking things.

Now, there must be a golden mean here, right? And this is where I tell you that
I know how to find it and convince you to do it my way...

Well, no. I'm going to disappoint you a bit. I don't think there is one golden
mean. I like that our job is to find our own equilibrium between these two
extremes. The more balance between "ship this 💩 now!" and "let's make this
perfect first ✨✨✨" you find, the faster you actually become.

Focusing too much on the former will produce too much technical debt, and
focusing too much on the latter won't produce enough.

I do believe that our industry focuses too much on the wrong metrics, so
individually we're peer-pressured into doing the same.

The balance I'm talking about here means forgetting to measure how many features
a developer ships in a week or how fast they go from starting to work on a
feature to opening a pull request. All metrics are context-dependent. Focus on
the value added to the customers of the product you're building. You'll find
better metrics there.

Keep in mind that what we do is not writing code. We're not "code typists". The
code isn't the goal. Products that work is the goal.

This perspective keeps priorities focused on what matters and it should play a
major role in developers' performance.

I hope other people benefit from this perspective and realise they are not as
slow as they think. Or the other way around. The latter may be a little harder
to accept :)

{{< leading-developers >}}
