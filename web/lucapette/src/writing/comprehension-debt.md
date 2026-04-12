---
title: Comprehension Debt
description: or, as I like to call it, the better-worse trade-off
date: "2026-04-04"
tags:
  - ai
  - programming
keywords: ai,programming
draft: true
---

One of the most interesting things about programming in the age of AI is that
everything keep getting better and worse at the same time. This is also
representative of the post COVID world and perfectly aligned with the current
geopolitical landscape. That's, of course, content for a different article.

Here I'm following up on my own "programming in the age of AI" and maybe this
wil turn out to be a series. Who knows. I'll try my best to make this article as
independent as possible so I don't have to ask you to read a 5k words article
just to read this one but, obviously, I'm asking anyway.

First off, we're talking about "automatic programming" (coined by antirez and
used here for lack of a better term). Meaning an LLMs via a "coding agent" makes
pretty much all the typing based on your directions. My tooling, shared for
the curious, right now is:

- OpenCode. I think there are no major differences here between tools but I'm
  also not really interested into a "comments section" war about them.
- MiniMax 2.7 high speed plan. MiniMax is practical, dependable, and quite fast
  on the high speed plan. The plan also comes with audio/image/speech generators
  you can use through a friendly official cli and it has two MCPs remote servers
  for image understand and web search (I Use the latter very much).

To put some order to this before we dig into the main topic, there are two main
ideas here we can pull from to get the main argument:

- Everything changed so nothing did.
- Everything gets better, everything gets worse.

## Everything changed so nothing did

I use this catchy phrase to anchor the idea that now that typing is pretty much
gone from the every day programming workflow, I constantly get the feeling I'm
starting over with the craft. It's a whole new thing because, well, the main
thing I did all the time, typing, is very sparse in my programming sessions and
it's almost exclusively English.

But then during these sessions, I end up running in the same exact problems I
run before automatic programming was a thing. Too many changes in one commit,
not enough test coverage, the design of a module is not flexible enough. And so
on. The point I'm trying to make is that it feels like everything changed and
maybe it did but the same principles and best practices we had before still
apply. In fact, that's the only thing that really changed: everything we do is
amplified by the ridiculous typing speed we have nowadays so our principles are
even more relevant. Since the tooling now is much more powerful, we also have to
be a lot more careful.

I like racing cars driving (I'm an avid sim-racer) so allow me to note here that
this feels exactly like going around a track with a road car and then jump into
the gt3 version (basically the same car, stripped down of all comfort features
and powered up for speed). The gt3 is much much faster but one mistake and
you're in the wall.

## Everything gets better, everything gets worse

I started doing automatic programming in January 2026. At the time
of writing, that's around three short months. It feels like at least a year of
progress with the tooling. OpenCode got better, more reliable, more polished.
That didn't change the needle. Models got smarter and much much faster (at least
the chinese ones, yes I should write about the Chinese AI landscape soon). That
did change the needle quite a bit.

To keep the metaphor alive, if your car gets faster from one day to the other
you're not gonna be faster on track at first try. There's a bit of relearning.
It's also more dangerous because, well, the car is faster.

That's exactly what I experienced in the past month or so. I got faster but I
also made more mistakes. The quality of the code started going down and I tried
different ways of coping with it. The core problem was I was getting more and
more detached from the codebase I was working on. Hence, the next paragraph.

## The comprehension debt challenge

The simplest way I can describe the comprehension debt challenge is that it's
very hard to know and conceptualise a codebase you didn't type almost any code
like  a code base you did type it most of the code for.

The assumption here, a very strong one to be clear, is that we're talking about
automatic programming and not vibe coding. In both approaches, you have a model
produce code for for you. But in the former, you read the code before you ship
it. Or, more accurately, you know what you're shipping and confident enough
about it. In some cases like a database or the linux kernel, I'm sure you'd want
to read every single line of code. In a product development workflow, I can
imagine there's a decent compromise to make where you know most of the code but
don't really read every single line.

Now the challenge here is that it's actually getting more challenging to deal with this as the months go by because typing code out is getting faster. So the challenge of understanding the codebase gets harder and harder because there's a lot more code to review.

There are at least two separate challenges at play here:

- The average quality of the code isn't very high. The models have a bias for
  shortcuts, duplication. They leave dead code around.
- The LLMs can produce all the code for a feature spanning multiple modules in
  minutes.Making it very hard for a human to understand what's going on.

Now the former problem is easier to mitigate and the current solution help quite
a bit. A combinations of language rules, skills, and carefully selected mcp
servers make the LLMs product higher quality code from the get-go. Once the code
is there, a solid suite of CI tools with lots of tests and very aggressive
linting cleans up the code quite nicely.

These tools help a lot on the low level aspects of code quality but do pretty
much nothing on what I like to call "architectural cohesion". In short, coding
agents are very reliable typists but they're terrible designers and organizers
of code. They can write a single method flawlessly but mix up things together in
a class/file/struct/whatever that clearly don't belong together. As soon as you
look at the code, you notice things all kind of things that make no sense at
all.

That's where the real challenge of the comprehension debt lies. Because, of
course, in order for you, the human, to correctly assess the design of a new
feature you have to know how the system is put together. More importantly you
need to have a vision for how the different component should interact, which
responsibility should be where. Nothing new right? Well yes and no. The point is
that while the principle stayed together now I you can have an LMM produce weeks
of work in hours so the gap between how the code works and your understanding of
it can widen quickly to a point it's probably easier not to look at all.

Short detour, I do understand vibe coding. It gets things done and can work
quite well in lots of contexts. But I can't really imagine being responsible for
a production with customers where I have to treat my code base as a black box. I
suppose there's a future where this is just how it works but, frankly, given the
average quality of the code the models produce. It's just not something I can
do.

My focus though is automatic programming and at first I struggled with how fast
the debt was growing but I then landed on a workflow that I live very much.
First of all, it feels very close to how my writing process (for the most
curious see "on writing" where I wrote about writing) which makes sense.
Automatic programming makes me work at higher level abstraction than typing code
out.

In short, here is out it works:

- I design a big feature with the agent.
- I have the agent write all of it.
- I check the tests the agent wrote are testing at the right level of
  abstraction (so I can freely change internals that is).
- I make a local commit.

I can do this many times in a row also because, most of the time, I'm actually
dealing with at least two projects very different in nature and have two running
sessions with my agent.

At some point though (say after three or four commit), I start to feel my
understanding of the codebase is drifting. I notice a method that looks good but
I don't understand why the agent put it a specific place. Small things. I admit
this part of the process is unstructured at the moment. I'm sure I'll come back
for another article (and then actually make a series out of this) to discuss it.

Once I feel uneasy, I stop going for more features/commits and start a reading
session. All I do is to leave TODO comments around. Sometimes there's straight
up questions for the agent, sometimes it's clear instructions because I know
what I want.

Finally, I commit all the TODOs and start a new session with the agent with the
goal of solving as many todos I just added as possible. Often in these "todo
tackling" sessions, I read some more code and end up producing more TODOs.


As mentioned, this feels a lot like my writing process where I type out a whole draft without much thinking. I just want to get all my content out first. And then do a series of refining passes. Fix the grammar, the typos. Remove the sentences.

I add lots of content first and then work very hard to reduce the word count.

It's remarkably similar to what happens with automatic programming. I first have
the agent type out all the code very fast and then I do slow moving sessions
where I make incremental improvements.

This way I get myself to a place where I know a codebase I didn't type a single like of code for as well as one where I wrote all the code for.

I'm not saying "this is the way", I'm writing about it for the same reason I
always write about things. I'm just trying to make sense of things.

There's no doubt that this workflow feels like working with a junior developer.
As much as I prefer comparing it to writing, it needs to be said the metaphor of
having junior developers with lighting typing speed hold its water as well.
