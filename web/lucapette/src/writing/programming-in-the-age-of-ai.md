---
title: Programming in the age of AI
description: or, as I like to call it, a much much faster horse
date: "2026-02-25"
tags:
  - ai
  - programming
keywords: ai, programming
---

AI grew on me slowly at first and then very quickly: in the past 8 weeks my
programming workflow has changed more than the past 20 years put together. I do
know this sounds like an exaggeration but it is true. In fact, that's the reason
I'm writing this article: I'm just trying to make sense of this mess.

Before I dive into this, let's go over some basic premises.

First of all, I'm specifically talking about AI tooling for developers in this
article and, while I also use AI chats ([DeepSeek](https://chat.deepseek.com)
with search is my thing) a lot, my personal workflow has not changed that
radically yet. I said yet because I just got a Sipeed LicheeRV Nano. I have some
ideas I want to test with [picoclaw](https://github.com/sipeed/picoclaw) and if
that leads to a change anywhere close to the one I just went through as a
programmer, you can expect a "life at the age of ai" article in a few weeks.

Then, let's be honest about this, no one knows what's going on or what
programming will look like next year, let alone in 5 years or a decade. Those
who say they do are the ones that understand this the least. So writing about
this is a mitigation function: it's how I deal with uncertainty. To be
extra-clear, I'm not going to tell you what to use, how to use it, or if you'll
have a job or not in a few years; although I do have opinions on this and will
briefly touch upon it. I'm just trying to make sense of this mess by going over
what has changed for me and how I'm dealing with it.

Lastly, inspired by Mitchel Hashimoto worthy read [My AI Adoption
Journey](https://mitchellh.com/writing/my-ai-adoption-journey), a necessary
disclaimer:

{% message "is-warning" %}

This article was entirely hand-written by me. In fact, I have a whole editor
setup with no integrations, plugins, etc. to avoid even the temptation and the
distraction of using AI for my writing. There should be no need to say this, but
I know there is.

{% endmessage %}

## What changed

At first, say mid 2023, I had some pretty mixed results with AI tooling. I used
GitHub Copilot for a while then moved on to JetBrains AI offering. Some of it
was excellent, and it was improving so quickly I already had to say "there's no
way back from this". Especially the autocompletion stuff, truly excellent
results. But none of this led to a radical change to the way I approach code. It
felt very much like incremental change up to this point.

Things changed quite radically a few weeks ago when I gave coding agents a try
again. I say again because I had tried a few at the end of the summer of 2025.
At the time, nothing impressed me about it. Then at the end of January 2026, I
downloaded [opencode](https://opencode.ai/), hooked my [DeepSeek
API](https://platform.deepseek.com) keys and gave it a try.

The rest of this story feels like magic: without realising it, I almost
_completely_ stopped writing code manually. It happened so quickly I realised
this was the case only when a friend asked me about how I had integrated
opencode with IntelliJ (I had not!). I'll dig more into this in a minute because
there's a lot to say but let me put this differently for a bit of perspective: a
tool I had never used before, a tool that is not even a year old got me to a
place where I almost type no code myself in less than a month. Nonsense.

Why it happened is key: the tooling produced _usable_ and coherent output from
the get-go. I said usable because most of what I can extract from these
[automatic programming](https://antirez.com/news/159) sessions is nowhere near
what I consider production-grade code. The point though is that it's almost
always usable so I can iterate on it quickly to get production-grade code out of
the agent work.

In short, what changed is conceptually very small: I just don't type code
any more. In the past few weeks, I've asked myself more than once if I still
need a fully-featured editor. Honestly disorienting question as a programmer.

This conceptually tiny change to my workflow has had all kinds of implications
for how I do things now. So let me try to give this some structure in the
next paragraph.

## How it changed

It's time to make something clear: I don't vibe code. Where the definition of
vibe coding is: "I ship code without looking at it". Now, to be fair, I managed
many vibe coders in my career. People ship code that I would barely consider a
draft so I think the tooling here is only acting as an amplifier of pre-existing
(or lack of) fundamentals. Having said that, I'm also in that weird spot where I
don't trust vibe coders at all but also those who say "I don't use any AI in my
programming tasks" because I do know how helpful the tooling is now if you know
how to leverage it. Be aware though: I'm not trying to say "I'm better than
those who vibe code" (I know you internet strangers, that's what you're thinking
right now), I'm underlining that my goals as a programmer have not changed. I do
care about the craft as much as I did 8 weeks ago so I'm not gonna ship code I
don't understand or, worse, haven't even read. I get why some (most? honestly I
can't tell) vibe code all day. I don't judge but I also don't share the
approach.

The point is that this conversation around what changed only makes sense if you
don't vibe code either. "What now that we don't need to type code any longer?"
is a relevant question only if you'd rather know what you're shipping. If that's
the case, then this workflow poses several questions and I will try to answer
some. Otherwise, I'm afraid this whole article won't resonate much with you.

The craft has not changed structurally. One small but time-consuming piece of
the puzzle got much, much faster: we've got a much, much faster horse now and if
you
had to go from A to B a much, much faster horse would only get you from point A
to point B several times quicker than your average horse. The questions around
your trip wouldn't change: do I know where B is? Is B the right place? Should I
have been in A in the first place?

Now that the AI tooling is so good, I've got to answer these structural
questions a lot more often than I did before because I waste no time typing
code. In fact, I type no code.

This is an enormously deceptive change. On one hand, it simplified the job very
much. There's a whole category of tasks I don't have to deal with. Opening
files, browsing around just to type one line, making some stupid change because
some library API has decided to change their public interface for no reason. All
of this is taken care of by a tool that never gets tired, never gets annoyed,
very rarely gives up (yeah some models actually do that!). On the other hand
though, this change exposes the weakness of your fundamentals much faster. Now
more than ever small commits, solid testing, a sound understanding of how
different components of a system interact and depend on each other, and all the
professional practices you're familiar with are more needed than ever before. It
should be obvious, really: we can and are producing a lot more code at an
increasingly higher pace. Everything gets amplified.

When I first started using opencode on a daily basis, I made many obvious
mistakes (obvious in retrospect that is) and often found myself nowhere close to
where I wanted to go. In a way, it's like learning to drive a car when you only
know how to ride a horse, which makes the famous quote kinda funny, doesn't it?
A car _is_ a much, much faster horse. That's the point I'm trying to make.
That's how it changed in my opinion. The best part of this: the quote is fake. I
feel like there's another AI metaphor in there. But I digress.

Shipping code without typing any of it requires a very different modus operandi.
The challenge is that it's somewhat easy (maybe even natural) to reach flow
state while typing code. The workflow is also very rewarding: you write code,
you test, you ship. A very addictive loop. Programming with a coding agent is a
whole different game. First of all, you're operating at a "new" level since your
main output as a programmer is mostly plain English. You write prompts now.
There's also no active effort in producing code. You're not typing after all. I
understand this may sound obvious but the lack of effort in the production step
is critical: it is so much harder emotionally to reach flow state. It's half the
excitement of not having to do the typing yourself, half the fact that you're
not used to just being a reader as a programmer. The writer part is gone.

Furthermore, large features take some time for the agents too, so you can't stay
around and stare at their work. I mean... you can, and I don't judge, but I
surely can't reach flow state that way, so this requires a different strategy.

Before I explain my strategy, let me share more details on how my programming
sessions look nowadays. In short, I'm either:

- Planning a new feature with my agent.
- Reading the code the agent produced in my editor.
- Quick-fixing things with my agent.

At a glance, the most noticeable thing is that now I spend two thirds of my
programming time inside opencode. Again, and I can't stress this enough, I
started
using opencode less than two months ago.

This approach is a child of a trial and error process that is too tedious to
explain and definitely not interesting to read. What matters is that this
workflow gives me two things:

- I still understand the whole code base I'm shipping to the same degree as
  before.
- I move significantly quicker than I did before.

As I discussed, the first point is currently a red line for me (I say currently
because who knows what programming will look like in 5 years, right?) so let's
go over speed. Measuring productivity is some tricky business because it's
obviously hard to quantify and most, if not all, KPIs (like pull requests
opened, lines of code, commits) make no sense. Fortunately, I'm a freelancer so
I have quite a tight relationship with time as a professional since (not my
choice) I charge my customers mostly by the hour.

What I'm trying to say is that I can see my speed has changed significantly
(which, short-term, may even be detrimental to my business. See why I don't like
charging by the hour? It's a dumb incentive structure for both parties...). I
won't be putting a number on it because that makes no sense to me. What I can do
though is to share examples of how my productivity has changed and what the
tooling has unlocked.

This may feel like a big detour from explaining my strategy to reach flow state
but, in fact, increased productivity is a direct consequence of the initial
struggle to find flow state again.

What I do is this: I run concurrent sessions with my coding agent. Key point:
the sessions I work with are in completely different stages, often even from
different projects. I always have a couple of sessions that I know will take
some time. That gives me the opportunity to do a few things:

- I can batch "reading time". I literally get into my editor and just read the
  code for a while. I often leave TODOs around. They're almost like mini prompts
  now. Funny (?) note: while writing this, I realised this is the _only_ typing
  I've done inside a coding editor in the past 2 months.
- I can spend much more time thinking about what I want a feature to look like.
  In my allotted time for work, I don't have to budget for typing! Before this,
  I used to feel I was often rushing into a solution too early. I know some
  (most?) of you would argue this is what makes TDD so helpful, but that never
  made sense to me; in fact, writing the tests first always feels like rushing
  into a specific design even earlier. In planning mode, I do _not_ want to
  think about what the code looks like, so not being in an editor staring at a
  test spec is a feature, not a bug. It allows me to operate at a more human
  level. This may as well be the most important point of the whole article: I
  now have a planning tool I can use while I am in flow state. As a programmer,
  no tool was ever any good for planning and designing features for me.
- I can reward myself with a session of rapid fixes when I feel the codebase is
  drifting a bit. These sessions feel very very good: I can focus on what to
  fix. I tell the agent exactly what I want. They're very good at tiny fixes. A
  ton of tiny incremental changes in rapid succession are such a gift to my mood
  during longer sessions.

Constantly switching, _when I want to switch_, between reading, quick fixing,
and planning is what keeps me in flow state. Of course this works for me because
I'm quite good at context switching. That's the best consequence of having been
a manager so often in my career and I doubt this strategy would work for me
otherwise. And I have no clue if I would had any answer on how to deal with the
lack
of flow state.

So, right now, you may be asking yourself "but Luca what's the gain in speed
look like?". Well that's the thing: in order to reach flow state I have to force
myself to work on more than one thing at the same time. This used to be
detrimental to my ability to keep up the quality of a codebase and now it is
instead necessary to ensure my productivity. Context-switching a lot has allowed
me, for example, to complete some personal projects I've been putting aside for
years (almost a decade really) in a matter of days while not skipping one bit on
my clients' projects.

For example, the article you're reading is now a [11ty.dev](https://11ty.dev)
website. I migrated away from [hugo](https://gohugo.io), merged my notes website
into this one, moved the code into a monorepo in two days while being high on
pain because of an extremely annoying health problem _and_ working regularly for
my clients. Also, I wrote _zero_ lines of code for this migration. It's quite
remarkable: this may have taken weeks otherwise which is why I've been meaning
to do it for years but never did. Automatic programming allowed me to do this
without almost noticing. One evening I decided to give this migration a try, I
launched opencode with [MiniMax](https://www.minimax.io/) and planned the whole
migration. The plan was so solid it gave me the confidence to try right away.
Two days after that I shipped the new website.

Another example of how my productivity increased: "write it twice" became so
cheap I can do it all the time. "Write it twice" is my way of saying that, in
order to achieve a great design, you have to solve a problem end to end just to
understand whether you chose the right trade-offs, constraints, and so on. My
experience is that the first solution is always suboptimal. Therefore, the best
design comes from solving the same problem twice back to back. The dream is to
write a scoped but end to end solution only to throw the code away and then
immediately start over. The second time you'll design a system in a much more
conscious way: you understand trade-offs better, you know where you can cut
corners and where you have to get it really right, you know what needs an
extensive test suite... you get it.

In the real world, you don't get many chances of experiencing this. In fact, the
last time it happened to me it was at [airy](https://airy.co/), already almost a
decade ago. In total, I got this chance in real world projects three times in
two decades. The reason is obvious: it's often stupidly expensive to implement
this strategy. Like my friend [Thomas](https://www.linkedin.com/in/tenyako/)
would say: "most times we just put our MVPs in production and forget they're
MVPs".

In the past two months though, I "wrote it twice" more than once already. In one
case (I can't really disclose details as it's clients' work), I wrote a whole
MVP in Go and then immediately threw it away to rewrite it TypeScript. This
would have been a week-long rewrite because, well, I'd have to type all the code
again, in a different language too. Most likely, I would have just kept going
with the suboptimal solution. Instead, knowing there was going to be no typing
involved, I took all the specs, docs, types, tests along with me into a long
(maybe an hour?) planning session in opencode to do a full rewrite and then had
the agent go over each step of the plan under my active supervision. The rewrite
became a detail.

I could make more examples but it's pointless in a way because I know most would
just want me to say something dumb like "I'm 2.7x faster" but I'm not gonna play
that game. I can imagine some would say I executed this migration 5x faster than
I
would have without AI tooling. It's true but this isn't a valuable general
number is it? What I know for sure is that there's no going back to manually
type out code like a caveman. It's a question of what should I do about it.
Hence the next paragraph.

## What am I doing about it

As I said, no reason to believe we're ever going back to manually typing out
code. In fact, to make this point I often find myself telling people "we're all
assembly programmers now". What I mean is that most of our tooling is built for
a process (typing) that is disappearing quite quickly.

Here's an example: after a long planning session with the agent (I have the
agent to interview me in depth for larger features), I ask the agent to write
the plan into a markdown file and have it track progress with a plain txt file.
[AiHero](https://www.aihero.dev/) taught me this approach. It's stupidly simple
and works quite well in practice but, let's be honest, this isn't tooling. This
is us coping with the reality we do not need to type out code any longer _and_
the tooling is deficient.

I have no long-term answers to this but I'm sure I'll come back to tooling in my
articles in the future many times (I can see myself writing some of this
tooling...) but I do want to share how I'm coping with some obvious deficiencies
of early 2026 automatic programming.

Let's proceed with the most obvious bit: the output produced by the agent may or
may not be great. In my experience, there's considerable variance and probably
too many reasons why the output quality varies so much. Even in the most
mundane tasks, the agents are often messy:

- They leave dead code around all the time.
- They don't do even the most obvious gardening.
- They're too biased toward duplication.
- They're also too biased toward local problems, there's no big picture
  solution.

In short, they don't do any design and they don't care. They're pretty much the
worst programmer you've worked with. But instead of showing up half naked and
drunk
at work (true story...), they just can't ever stop typing random code. It's easy
to forget they're not smart at all because we, the humans, experience
"intelligence" via language and these models are very good at mimicking
language. But of course they've got no clue which part of your system needs to
change soon because you have to accommodate for that upcoming feature. They're
glorified, stupidly resource-hungry parrots so the design is up to you.

The way I approach this mess is by trying to mitigate risk from both sides of
the production process.

_Before_ the agent produces any code, I try my best to give it enough context so
they don't get lost and produce total nonsense. I believe things will change a
lot here quite rapidly in the next 12/24 months so going into the details too
much doesn't help. It's probably also quite personal as it does depend on the
existing context after all. A few really obvious things that work well for me
right now:

- Progressive disclosure (again
  [aihero.dev](https://www.aihero.dev/a-complete-guide-to-agents-md#use-progressive-disclosure)
  taught me that) does make rules much more effective. Having said that, they're
  still hit and miss. For example, I really can't stand the comments models
  produce so I have shouting rules about it. The comments are almost totally
  gone.
- The [Context7](https://context7.com) mcp improves the quality of most code.
  Especially in TypeScript. I do have to remind the agent to "use context7 for
  API docs" often enough.
- Planning first then building obviously leads to higher quality output. But
  even here I'm quickly developing an intuition for situations in which I think
  the plan means something and the agent understands something else. So I ask
  the agent for a bit more details sometimes as my default instructions for
  planning are something along the lines of "be super brief".

As for what happens after the agent produces any code, the key improvement is
somewhat obvious: the automated feedback process you have in place to check your
codebase after you make a change needs to be as good as possible.
To me, this is the main argument in favour of "ai tooling amplifies your
fundamentals". The more your codebase speaks you to, the fewer mistakes the
agents make. And how talkative your codebase is entirely up on you. Here's some
obvious things:

- Statically typed languages are better (if this annoys you, you should know
  it's the reason why I wrote it this way) because the compiler speaks a lot.
- Tests that actually test things are very very helpful because they break when
  you actually break something.
- Aggressive automated linting also speaks a lot.

I found that being super explicit with the agent at every step (think like "when
you're done, run this command to check your work) greatly improves the quality
of your automated typing.

This conversation makes me think we need to rethink the tooling from the ground
up. Right now we're using agents to automatically type all of our code but
there's no integration with the rest of the toolchain. For example, I've
already found myself thinking I should automate the commit process completely so
that I can have the agent automatically add context for itself as metadata in
each commit. Not to mention a bit of a vertical integration with the rest of the
product development value chain. I suppose that's what
[entire.io](https://entire.io) wants to do. I have similar ideas but I don't
have 60 millions 😉.

As I mentioned before, I do believe we're all assembly programmers and, maybe
the only actual "bold prediction" I'll make in this article, we're going to see
new, higher-level, languages come out in the next few years. Every existing
language feels kinda low level now because, well, you can go from how you
imagine something should work to the thing being in production without typing
once. That makes you feel you're not so attached to syntax any more. So the
question is what does an "AI native" language look like? I'm [not the only
one](https://lucumr.pocoo.org/2026/2/9/a-language-for-agents/) asking this
question. I have some guesses and some biases but that's probably good content
for a different article.

## How do I feel about it

I thought I'd conclude this article by writing about my (our?) emotional state
toward this mess we're in.

Let's get on with the most obvious, jarring question: will we have a job in a
few years? Assuming that no one actually knows the answer there's a couple of
things I want to say here because I don't seem them mentioned often enough.

The bad part: the number of available jobs is bound to go down. At least for a
while, maybe even quite a while. Especially if you take into account the
geopolitical implications of the AI race which... we shouldn't do this here
otherwise this article will be a book by the time I'm done. The reason is
unfortunately obvious in my opinion. Imagine CEOs, especially in western
cultures, hear developers say "OMG man this AI stuff is amazing, we don't need
to type any more. We can finally focus on the good stuff!". Your avg John Smith
CEO is going to hear "I don't need developers any more". In fact, this is
already happening.

Now I don't want to speculate too much in this context (I'll write more on this
if asked to) but I believe we'll reach a critical mass of [comprehension
debt](https://x.com/jeremytwei/status/2015886793955229705) and then realise we
need to slow down and hire again. There's a lot more to say about this but,
again, this wrong article. The TLDR is: it'll get worse, probably much worse,
before it gets better again. Anyway, we've been way too privileged in our
profession. We do deserve the pain.

More bad: this is hilarious because in theory it's a good thing but in practice
it's not. In the past two months I have had some of the most fun programming
sessions of my life. How is this bad? Well, it's way too addictive. I have not
figured out how to deal with this in a structured way so right now I'm dealing
it by forcing myself to do something else. I think I know why it's so addictive:
the flow state you reach when going back and forth with the agent for a while is
"purer" than your average programming session. It makes sense: you're operating
at a higher level. It's closer to actual thinking. It feels good but it also
makes you tired faster.

The good part: honestly it's wild I don't see people mentioning this more often
but, really, the job was never about typing? Typing was always the most tedious,
error-prone part of the job. As soon as you let go of the need to type, aka your
ego of being fully in charge of the process, you realise that only the fun part
of the job is staying: the beauty of imagining a solution and seeing it come
together.

More fun: thinking big doesn't tire you or scare you that much any more because
there's a lot less effort into actually producing the artifact. Yes, it's not
perfect. Far from it. But I can see a future where you can just talk to your
agent about code like they're sitting next to you.

My conclusion at the time of writing is that AI tooling is the biggest change
for programmers since the introduction of C. It's wild and crazy and scary and
fun but I'm grateful I'm around for this. If you made it this far, thank you! I
hope you get to enjoy this ride as much as I am.
