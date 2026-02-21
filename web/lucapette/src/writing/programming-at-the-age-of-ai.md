---
title: Programming at the age of ai
description: or, as like to call it, a much much faster horse
date: "2026-02-21"
tags:
  - ai
  - programming
keywords: ai, programming
draft: true
---

AI grew on me slowly at first and then very quickly. In fact, in the
past 8 weeks my programming workflow has changed more than the past 20 years put
together. I do know this sounds too crazy to be true but it is true. In fact
that's the primary reason I'm writing this article: I'm just trying to make
sense of this mess.

Before I dive into this, let's go over some basic premises: I'm specifically
talking about ai tooling for developers in this article. It is called
"programming at the age of ai". While I also use a lot AI chats
([DeepSeek](https://chat.deepseek.com) with search is my thing), my personal
workflow has changed that radically. I suppose that may change soon enough as
I'm literally had to interrupt writing this article to receive a tiny sipeed
LicheeRV Nano delivery while I write this. If that change is anywhere close to
the scale of the change I went through as a programmer, you can expect a "life
at the age of ai" article in a couple of weeks. Stay tuned, or something.

Another maybe less obvious premise: No one knows what's going on or how
programming will look like next year, let alone in 5 years or a decade. So
writing is my mitigation function: it's how I deal with uncertainty. I'm not
trying to tell you what to use, how to use it, or if you'll have a job or not in
a few years (although I do have opinions on this and will touch upon it). I'm
just trying to make sense of this mess (yes, it's gonna be a recurring theme).

Lastly, inspired by Mitchel Hashimoto in [My AI Adoption
Journey](https://mitchellh.com/writing/my-ai-adoption-journey) (worthy read!):

> This article was entirely hand-written by me. In fact, I have a whole editor
> setup with no kind of integrations to avoid even the temptation of using AI
> for my writing. There should be no need to say this, but there it.

## What changed

Let's start by addressing the genuinely insane claim I made in the opening
paragraph of the article: my workflow has changed more in the past 8 weeks than
in the past 20 years.

Explaining this is quite simple. In the past two years, I've had mixed results
with ai tooling. I've used github copilot for a while with mixed results then I
moved on to jetbrains ai offering. Again, mixed results. Clearly there was some
good stuff into this tooling but no radical change to the way I actually
approach code every day.

Things changed quite radically a few weeks ago when I decided to try coding
agents again. I downloaded [opencode](https://opencode.ai/), hooked my
[[DeepSeek](https://chat.deepseek.com)
api](<https://api-docs.[deepseek](https://chat.deepseek.com).com/>) keys and gave
it a try.

The rest of this story feels like magic: without even realising it, I almost
_completely_ stopped writing code manually. I'll dig into this in a minute
because there's a lot to say but let me stay on this a little longer. A tool I
never used before, a tool that is not even a year old has got me to a place
where I almost type no code myself in 4 weeks time.

The way it happened is simple: the tooling (and the models) produced usable
output from the get-go. I said usable on purpose: most of what I can extract
from these [automatic programming](https://antirez.com/news/159) sessions is
nowhere near to what I consider production grade code. But the point is that
it's almost always usable and therefore I can iterate on in to get it to
production.

In short what changed is conceptually very small: I just don't type much code
anymore. In the past few weeks, I asked myself if I still need a fully-featured
editor more than once which, honestly, is quite disorienting as a programmer.
The thing is this conceptually tiny change has all kind of implications so let
me try to give this some structure in the next paragraph.

## A much much faster horse

It's time to make something clear: I don't vibe code. I'm in that weird spot
where I don't trust vibe coders at all but also those who say "I don't use any
AI in my programming tasks".

Be aware I'm not trying to say "I'm better than those who vibe code" (I know you
internet strangers, that's what you're thinking right now), I'm underlining that
my goals as a programmer have not changed. I do care about the craft as much as
I did 8 weeks ago so I'm not gonna ship code I don't understand. I get why some
(most? honestly I can't tell) vibe code all day. I don't judge but I also don't
share the approach.

The point I'm trying to make is that the whole conversation only makes sense if,
as a programmer, you'd rather know what you're shipping. If that's the case,
then this workflow poses several questions.

A much much faster horse would only get from point A to point B several times
quicker than your average horse. The structural questions around your trip don't
change: do I know where B is? Is B the right place? Should have I been in A?

What changed the most is that now I've got to answer these questions a lot more
often than I did before because I waste no time typing code. In fact, I type no
code. So when I first started using opencode on a daily basis, I made a variety
of obvious mistakes (obvious in retrospect that is) and found myself nowhere
close to where I wanted to go. It's like learning to drive when you only know
how to ride a horse. Which makes the famous quote kinda funny, doesn't it? A car
_is_ a much much faster horse. That's my point. Best part: the quote is fake. I
feel like there's another AI metaphor in that. But I digress.

Shipping code without typing any of it requires a very different modus operandi.
The challenge is that it's somewhat easy (maybe even natural) to reach flow
state while typing code. The workflow is also very rewarding: you write code,
you test, you ship. A very addictive loop.

Programming with a coding agent is a whole different world. First of all, you're
operating at different level since your output as a programmer is mostly plain
English. There's also no effort in producing code. You're not typing after all.
I understand this sounds obvious but the lack of effort is critical: it makes it
so much harder emotionally to reach flow state. It's half the excitement of not
having to do the typing yourself, half the fact you're not used to just read
code as a programmer.

Furthermore, large features take quite some time for the agents too so you can't
stay around and stare at their work. I mean, you can and I don't judge but I
surely can't reach flow state that way so this requires a different strategy.

Before I explain that, let me share more details on how my programming sessions
look nowadays. In short, I'm either:

- Planning a new feature with my agent in a new session.
- Reading the code the agent produced in my editor.
- Quick-fixing things within an existing session with my agent.

At glance the most noticeable thing is that I spend 2/3 of my programming time
inside opencode. Again, this is a tool I started using less than two months ago.
I never adopted any tooling so quickly in my life.

This approach is a child of trial and error sessions that are too tedious to
explain and definitely not interesting to read but the core point is that this
workflow gives me two things:

- I still understand the whole code base I'm shipping to the same degree as before.
- I move significantly quicker than I did before.

I discussed the first point already so let's go over speed. Measuring
productivity is some tricky business because it's obviously hard to quantify and
most, if not all, KPIs (like pull requests opened, lines of code, commits) make
no sense at all. Fortunately, I'm a freelancer so I have quite a tight
relationship with time as a professional since (not my choice) I charge my
customers mostly by the hour.

What I'm trying to say is that I can feel my speed has changed significantly
(which, short-term, may even be detrimental to my business. See why I don't like
charging by the hour? It's a dumb incentive structure for both parties). I won't
be putting a number of on it because that makes no sense to me. What I can do
though is to share examples of how my productivity has changed.

This may feel like a big detour from explaining how I reach flow state but, in
fact, it's how I realised how much more I could do in a day by finding flow
state again.

What I do is this: I run concurrent sessions in my coding agent. Key point: the
sessions I work with are in completely different stage, often they're also from
different projects. There's always one or two sessions that I know will take
some time which gives me the opportunity to unlocks a few things:

- I can batch "reading time". I literally get into my editor and just read the
  code for a while. I often leave TODOs around. They're almost like mini prompts
  now (so they read kinda funny). And while writing this, I'm also now realising
  this is the _only_ typing I've done inside a coding editor in the past 2
  months.
- I spend much more time thinking about how I want a feature to look like.
  Before this, I used to feel I rushed into a solution too early. I know some
  (most?) of you would argue this is what makes TDD so helpful but that never
  made sense to me, in fact writing the tests first feels like rushing into a
  specific design even earlier. In planning mode, I do _not_ want to think how
  the code looks like. Not being in the editor staring at a test spec is feature
  not a bug. It allows me to operate at a more humane level.
- I can choose to reward myself with a session of rapid fixes when I feel the
  code base is drifting a bit. These sessions feel like. I can solely focus on
  what to fix. I tell the agent exactly what I want. They're very good at tiny
  fixes.

Constantly switching, _when I want to switch_, between reading, quick fixing,
and planning is what keeps me in flow state. Of course this works for me because
I'm quite good at context switching. Maybe that's the best consequence of having
been a manager so often in my career. I doubt this would work for me otherwise.

So, right now, you may be asking yourself "but Luca what's the gain in speed
look like?". Well that's the thing: in order to reach flow state I have to force
myself to work on more than one project at the same time. This has been very
productive. It has allowed me, for example, to complete some personal projects
I've been putting aside for years (almost a decade really) in a matter of days
while not skipping one bt with pace on my clients' projects.

The article you're reading is now on a [11ty.dev](https://11ty.dev) website. I
migrate away from [hugo](https://gohugo.io), merged my notes website into this
one, moved the code into a monorepo. I did all of this in two days while being
high on pain because of an extremely annoying health problem _and_ working
regularly for my clients. Also, I wrote literally zero lines of code for this.
It's quite remarkable imo.

This migration may have taken weeks otherwise (which is why I've been meaning to
do for years but never did). Agent driven programming allowed me to do this in
days. One late night I decided to give this migration a try, I launched opencode
with [MiniMax](https://www.minimax.io/) and planned the whole migration. The
plan was so solid it gave me the confidence to try right away. Two days after, I
shipped the new website.

I now have a much much faster horse and that changed the picture for ever.

Another example of how productivity dramatically increased for me: write it
twice became so cheap you can do it all the time. "Write it twice" is my way of
saying that in order to achieve a great design you have to see the pain of a
design that doesn't work, the first time to solve a problem the solution is
always bad. In practice, the best way to do this is to write a system once
entirely, then throw all the code away and start again. The second time around
you design a system in a much more conscious way: you understand trade-offs
better, you know where you can cut corners and where you have to get it really
right. Traditionally, you don't get many chances of experiencing this. In fact,
last it has happened to me it was at [airy](https://airy.co/), already almost a
decade ago. And the reason it's obvious: it's stupidly expensive to proceed this
way. So most times we just put our MVPs in production.

In the past two months though, I used this approach already more than once. In
one case (I can't really disclosure details as it's clients' work), I wrote a
whole MVP in Golang and then threw it away to rewrite it TypeScript (which was a
much better fit). The rewrite took a day. This would have been a weeks long
project because, well, we'd have to type all the code again! Instead here I took
all the specs, docs, tests with me. The rewrite became a detail.

I could probably make many more examples but I think it's pointless in a way
since we're collectively unable to quantify the productivity gains. What I know
for sure is that there's no coming back to manually typing out code. It's a
question of what should we do about it. Hence the next paragraph.

## How do we adapt

As I said, no reason to believe we're ever going to back to manually typing out
code. In fact, to make a point I often find myself telling people "we're all
assembly programmers now". What I mean is that most of our tooling is built for
a process that is disappearing quite quickly.

Here's an example: after a long planning session with the agent (I literally ask
the agent to interview me in details), I ask the agent to write the plan into a
markdown file and track the progress into a txt file.
[AiHero](https://www.aihero.dev/) thought me this approach, it's stupidly simple
and works quite well in practice but, let's be honest, this isn't tooling, this
is coping with the reality we do not need to type out code any longer. And the
biggest challenge is that, wherever you look, the tooling is deficient (just
have a look at the kind of insanity popular open source projects are dealing
with at the moment).

I have no long-term answer to this and I'm sure I'll come back to tooling in my
articles in the future many times (I can see myself writing the tooling that
ain't there yet) but I do want to share how I'm coping with some obvious
deficiencies of 2026 automatic programming.

- loop checks are the most important bit. What kind of guardrails should we put in place. is spec driven better
  - I’m thinking each project should have a “ai check loop” task maybe as simple as “npm run eslint && prettier && typecheck && test”. Without that, the agent leaves way too much dead code, broken things behind. Goes often full cowboy (they do have personality though so different agents/different behaviour)
- [Beyond agentic coding](https://haskellforall.com/2026/02/beyond-agentic-coding) I agree with this. It’s harder to be in flow state with agentic programming but 1) the agents will get much much faster (I can already stay in flow in some situations like kimi 2.5 and websites, qwen and refactoring) 2) the agents UI doesn’t feel final. We’re gonna need a more thightly integrated environment (I suppose that’s what entire.io wants to do? I have similar ideas but don’t have 60 mil 😉)

- Working with minimax is teaching me that you need to know the code base to product good output. The job is changing radically around workflow and production but the conceptual mapping, the strategies and tactics are all there. Because the problem is that even the best models are messy:
  - they leave code around
  - they don’t do any gardening even the most obvious
  - they’re too biased toward duplication

- I feel like we need to store prompts with their commits so we have a history of how the machines solved a problem.
- [A Language For Agents](https://lucumr.pocoo.org/2026/2/9/a-language-for-agents/) when are we gonna see an “ai native” programming language? Will it be a derivative of go/typescript?

Very interesting concept I already feel it: [Jeremy \(@jeremytwei\) 324 likes · 10 replies](https://x.com/jeremytwei/status/2015886793955229705?s=20) “comphrension debt”. Fantastic.

(nowhere where it should be, true especially for mono repo imo)

## Emotionally

- Emotionally as soon as you let go of the need to type, you realise that only the fun part of the job is staying: the beauty of imagining a solution. Thinking bing doesn’t tire you or scare you because there’s a lot less effort into actually producing the result. It ain’t perfect. Far from it. But you can already see a future where you can just talk to your agent about code. You don’t even need to see it anymore.
- Emotionally, it’s also easier to take design decisions. I’ve always had a personal answer between two but more than often I’d refrain from stating clearly because, unfortunately, I was almost always leading the team having such a conversation. Saying “A”. Not even saying “A is better” feels way too good not to say something about me.

## Will programmers still have a job?

- Generalists vs specialists
- I think there's a long term "problem" with this approach (and with ai this may means months not years). The models abilities are gonna slow down (ironically because they're useful the internet will produce less training data by virtue of people asking less questions on websites) but their speed is gonna grow significantly (are we gonna see a new moore law?). At some point soon, the agents will produce code so fast it'll be detrimental reading it all (or reading it at all??)
