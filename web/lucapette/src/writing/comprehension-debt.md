---
title: Comprehension Debt
description: or, as I like to call it, the better-worse trade-off
date: "2026-04-22"
tags:
  - ai
  - programming
keywords: ai,programming
draft: true
---

One of the most interesting things about programming in the age of AI is that
everything keeps getting better and worse at the same time. This is also
representative of the post COVID pandemic world _and_ perfectly aligned with the
current geopolitical landscape. That, of course, is content for a different
article.

Here I want to talk about how I'm dealing with a specific challenge I'm facing
with coding agents: comprehension debt. Let me provide some context before I
share my understanding of this challenge and how I'm coping with it.

First off, we're talking about "automatic programming" (coined by antirez and
used here for lack of a better term). Meaning a model, via a coding agent, does
pretty much all the typing based on prompts I write. For the curious, here's my
tooling at the time of writing:

- OpenCode

  I think there are no major differences here between tools but I'm
  also not really interested into a "comments section" war about them.

- MiniMax 2.7 high-speed plan

  MiniMax is practical, dependable, and quite fast on the high-speed plans. The
  subscription also comes with audio/image/speech generators you can use through a
  friendly official cli and it has two MCPs remote servers for image understanding
  and web search (I use the latter very much). All in all, big fan of minimax.io work.

To best explain comprehension debt, let me pull from two connected ideas:

- Everything changed so nothing did.
- Everything gets better, everything gets worse.

## Everything changed so nothing did

I use this catchy phrase to anchor the idea that now that typing is gone from
the every day programming workflow (if you don't think that's the case, you have
some tooling catch up to do), I constantly get the feeling I'm starting over
with the craft. It's a whole new thing because, well, I was spending most of my
programming time typing and now there's very little typing going on. Also, I
type almost exclusively English sentences.

Feels like a new job right? But then during these sessions, like clockwork, I
run in the exact problems I was running before automatic programming was a
thing. Too many changes in one commit, not enough test coverage, the design of a
module is not flexible enough, I misunderstood some requirement. And so on.

Yes, it feels like everything changed and maybe it did _but_ the same principles
and best practices we had before still apply. In fact, that's the only thing
that _really_ changed: everything we do is amplified by the ridiculous typing
speed we have nowadays so our principles are even more relevant than before
automatic programming was a thing.

Since the tooling now is much more powerful, we have to be a lot more careful. I
like driving racing cars (I'm an avid sim-racer!) so allow me a racing driving
comparison: it feels exactly like going around a track with a road car and then
jump into the gt3 version (basically the same car, stripped down of all comfort
features and powered up for speed). The gt3 is much much faster but
one mistake and you're in the wall.

## Everything gets better, everything gets worse

I started doing automatic programming in January 2026. At the time of writing
this article, that's three short months. It feels like at least a year of
progress with the tooling. OpenCode got better, more reliable, more polished.
That didn't change the needle but felt great. Models got smarter and much much
faster (at least the Chinese ones, yes I should write about the Chinese AI
landscape). That did change the needle quite a bit.

If your car gets faster from one day to the other you're not gonna be faster on
track at first try. There's a bit of relearning. It's also more dangerous
because the car _is_ faster. That's exactly what I experienced in the past month
or so. I got faster but I also made more mistakes. The quality of the code
started going down and I tried different ways of coping with it. The core
problem was I was getting more and more detached from the codebase I was working
on. Hence, the title of this article and the next paragraph.

## The comprehension debt challenge

The simplest way I can describe the comprehension debt challenge is that it's
much harder to know and conceptualise a codebase you didn't type out than a code
base you did type out yourself. It's obvious too but that doesn't help.

The assumption here, a very strong one to be clear, is that I'm talking about
automatic programming and not vibe coding. In both approaches, you have a model
produce code for you. But in the former, you read the code before you ship it.
Or, more accurately, you're confident enough about your code to ship it to
production. In some cases, say a database or the linux kernel, I'm sure you'd
want to read every single line of code. In a product development workflow, I can
imagine you can compromise a bit and don't really read every single line. But
you do need a clear picture. And that's the point.

The challenge is that it's getting harder and harder to deal with comprehension
debt as the months go by because coding agents and models are improving at a
higher rate than our ability to cope with it. Automatic typing is getting faster
and faster means the debt grows faster and faster. The situation is
unsustainable without a structured approach.

There are at least two separate problems to deal with here:

- The average quality of the code isn't very high. Models have a bias for
  shortcuts, duplication. They leave dead code around.
- The quantity of code a model can produce for a feature spanning multiple
  modules is often very large. Making it very hard for a human to understand
  what's going on at glance.

Now the former problem is easier to mitigate and the current approach I use help
quite a bit (more on this in my "programming in the age of ai" LINK HERE). A
combinations of language rules, skills, and carefully selected mcp servers make
the LLMs product higher quality code from the get-go. Once the code is there, a
solid suite of CI tools with lots of tests and very aggressive linting cleans up
the code quite nicely.

These tools help a lot with the low level aspects of code quality but do pretty
much nothing on what I like to call architectural cohesion. In short, coding
agents are very reliable typists but they're terrible architects and even worse
organizers of code. They can write a single method flawlessly but mix up things
together in a class/file/struct/whatever that clearly don't belong together. As
soon as you look at the code, you notice all kind of things that make no sense
at all. There's no design. It's probabilistic typing after all.

That's where the real challenge of comprehension debt lies. Because, of course,
in order for you, the human, to correctly assess the design of a new feature you
have to know how the system is put together. More importantly you need to have a
vision for how the different components should interact, which responsibility
should be where. Nothing new right? Well yes and no.

The point is that while the principles stayed the same, now you can have an LMM
produce weeks of work in hours so the gap between how the code works and your
understanding of it can widen quickly to a point it's probably easier not to
look than try to understand it.

Short but necessary detour: I do understand vibe coding. It gets things done and
can work well in many contexts. I also like the political implications of it
(assuming the trend of local models getting better and better doesn't change):
it will make building products more accessible. But, personally, I can't imagine
being responsible for a production system with paying customers where I have to
treat my code base as a black box. I suppose there's a future where this is just
how it works but, frankly, given how low is the quality of the code the models
produce I think that future is far and surely not something I can do right now.
I just don't trust the typists.

My focus though is automatic programming and I am struggling with how fast the
comprehension debt grows but I did land on a workflow that I like very much and
seems to work well enough.

This process feels very close to how my writing process (for the most curious
see "on writing" where I wrote about writing LINK HERE) which makes sense.
Automatic programming sessions feel a lot more like writing because I'm
operating closer to my thoughts than the instructions the computer needs.

In short, here is how it works:

- I design a big feature with the agent.
- I then have the agent write all of it.
- I check that the tests the agent wrote are testing at the right level of
  abstraction. Put it differently: I verify I can freely change internals
  without having to change the tests (one more example of the principles stayed
  the same)
- I make a local commit.

I do this many times in a row also because, most of the time, I'm actually
dealing with at least two projects very different in nature and have two running
sessions with my agent.

At some point though (say after three or four commits), I start to feel my
understanding of the codebase is drifting. I notice a method that looks good but
I don't understand why the agent put it a specific place. Small things. I admit
this part of the process is unstructured at the moment. I'm sure I'll come back
for another article (and then actually make a series out of this?) to discuss
it.

Once I feel uneasy, I stop going for more features/commits and start a reading
session. All I do is to leave TODO comments around. Sometimes there's straight
up questions for the agent, sometimes it's clear instructions because I know
what I want.

Finally, I commit all the TODOs and start a new session with the agent with the
goal of solving as many todos I just added as possible. Often in these "todo
tackling" sessions, I read some more code and end up producing more TODOs.

I iterate on these sessions until I'm happy again with my understanding of the
codebase which, almost always, means I have no TODOs again.

As I was mentioning, this feels a lot like my writing process where I type out a
whole draft without much thinking. I just want to get all my content out first.
And then do a series of refining passes. Fix the grammar, the typos. Remove
entire sentences or paragraphs.

It's indeed remarkably similar to what happens with automatic programming: I
first have the agent type out all the code very fast, get a first draft out, and
then I do slow moving sessions where I make incremental improvements. These
changes are mostly reductions. Code that can be simplified, duplication that can
be removed, "almost" dead code that can be removed with a bit of prep. Not that
I strive for perfection but the process does remind me of the famous quote:

> In anything at all, perfection is finally attained not when there is no longer
> anything to add, but when there is no longer anything to take away

This way I get myself to a place where I know a codebase I didn't type a single
line of code for as well as one where I wrote all the code for.

I'm not saying "this is the way", I'm writing about it for the same reason I
always write: I'm just trying to make sense of things.

Happy automatic programming everyone! Let me know if this resonates with you.