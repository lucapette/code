---
title: "My Programming Principles"
description: "What guides me after 20 years of writing code for a living."
date: 2022-05-12T10:12:13+02:00
tags:
  - programming
keywords:
  - programming
  - principles
favourite: true
---

{{< message class="is-info">}} This is a _long_ read. You will find a table of
contents right after the introduction.{{</ message >}}

One day, during a post-game interview, elite chess Grandmaster Alexander
Grischuk was asked the routine question: "How long have you been preparing for
this game?". With his famous wit, he answered:

> I've been preparing my whole life.

A beautiful answer. It applies to _any_ job: _all_ your past experiences
contribute to some extent to the decisions you make today. So I've been thinking
about how this idea applies to my career. It turned out to be an intriguing
writing challenge. While intuitively I know I follow some principles when I'm
writing code, I couldn't immediately structure or name them.

The article you're reading is a (very long) answer to the question: How have I
been preparing for the code I'm about to write? My desire to define these
principles – and learn more about myself in the process – was too strong, the
challenge too interesting. I couldn't pass on it so here we go.

I grouped the principles into categories: existing codebases, greenfield
projects, and general ideas. While it sounds a tad obvious you want to approach
new projects and existing codebases differently, I encountered enough
over-engineered or under-engineered (isn't that a thing? It's almost as common)
solutions in my career. More often than not, approaching an existing codebase
like a greenfield project or, worse, the other way around was the reason why
their solutions were incorrectly sized.

Before I move on to the principles themselves, I want to mention that I find the
title of the article a little pretentious. I went with it anyway because it fits
the topics covered better than anything else I could think of.

- [How I approach an existing codebase](#how-i-approach-an-existing-codebase)
  - [Read features end to end](#read-features-end-to-end)
  - [Small changes, fast feedback loops](#small-changes-fast-feedback-loops)
  - [Test in production](#test-in-production)
  - [Be a gardner](#be-a-gardner)
- [Starting from scratch](#starting-from-scratch)
  - [Documentation driven development](#documentation-driven-development)
  - [Throw it away first](#throw-it-away-first)
  - [Make it work, make it good, make it fast](#make-it-work-make-it-good-make-it-fast)
- [General principles](#general-principles)
  - [Prose not poetry](#prose-not-poetry)
  - [Facts > Assumptions](#facts--assumptions)
  - [Name things what they do](#name-things-what-they-do)
  - [Write the code you'd like to use](#write-the-code-youd-like-to-use)
  - [Let the design emerge from the code](#let-the-design-emerge-from-the-code)
  - [Write actual tests](#write-actual-tests)
  - [Balance your confidence](#balance-your-confidence)

## How I approach an existing codebase

The codebases I have in mind are so large that you can't keep an accurate
representation of all their parts in your head. You may know some parts very well,
but there are enough unknowns and you can't make a significant change without
careful planning.

I don't think I can provide a good example of what's a "large enough" codebase
because that's probably too personal. Let's go with "large enough for me, the
reader".

### Read features end to end

When I'm new to a large codebase, I read features end to end _before_ making any
change. People often call it code safari but I'm not a fan of the metaphor. I
like to call things what they do so the principle goes by "read features end to
end". Yeah, I get it. It's boring. I like it that way.

Approaching a new codebase can get a little overwhelming. Sometimes I don't know
where to start, which system maps to which part of the codebase. To orient
myself, I read a whole feature end to end.

For the sake of discussion, let's consider a web application composed of
multiple services. One page in the app has an "innocent" button that starts a
sequence of processes that ultimately result in sending a PDF report via email.
You might have seen some variation of this.

The idea is that I go on a hunt. I start searching for the code that renders the
button. Trivial – but I know I will discover things: how/if we do i18n, what kind
of frontend framework we're using. Most importantly, I ask myself questions
like:

- Oh, we have our own css framework. Why?
- What's up with all these data attributes? I haven't seen any of that when I
  was checking the website from home. We stripping them down?
- Why are we stuck on such an old version of X?

Using my brain as storage is a waste. The saying goes ["the shortest pencil is
longer than the longest
memory"](https://www.youtube.com/watch?v=vIW72VXMPHo&t=344s) so I write
everything down.

When I know which service handles the click on the report button, I go down one
layer and keep reading. I keep going until I find my way to the email service.

Once I'm done, I have many questions in my notes. That's when the hard work
starts. I reorganise them:

- Questions for myself. A sort of a to-do list of things I know I want to dig in
  personally.
- Questions for those who know the codebase better than I do and can get me up
  to speed faster.
- Idioms. Every codebase has its ways of doing things.

I'll get some answers to these questions so that I can draw a basic map to look
around the codebase. I often repeat the process a few times before I start
making any changes.

What I like the most about this principle is how trivial it sounds when I
describe it, and how helpful it is when I use it.

### Small changes, fast feedback loops

Focused, short, productive programming sessions are the typical scenario for
this principle. The idea is trivial: I change a few lines _or less_ before
seeking feedback. I mean _literally_ the smallest possible change I can think
of. The size of the change (as small as possible) and the speed of iteration
(how fast feedback about the change reaches me) are equally relevant to me. The
workflow looks like this:

- I change very little. A few lines _or less_.
- I seek feedback.
- If it works _so far_, I repeat.

The key is _so far_. I have mental checkpoints marking the progress. "I changed
this line, stuff still works". Yes, it's that trivial. As soon as my feedback
loop shows something unexpected, I go back one checkpoint because "it worked
before I changed that". I can be radical with my reaction to unexpected
feedback: I often just delete the last change and start over.

Here's how I implement this workflow: I set up a custom, project-specific REPL
_before_ I change any code. The tooling isn't relevant to the principle. It can
be TDD, it can be print statements (yep, I just said that), whatever. The point
is that it has to feel exactly like read-eval-print loops. They're really fast.
Once that experience is in place, I can start changing a few lines _or less_ per
time and apply the checkpoints process I just described.

You can (and with that I mean you should) apply this principle also to the end
result of good programming sessions: deployable artifacts. There's
[evidence](https://www.goodreads.com/book/show/35747076-accelerate) that smaller
changes lead to higher productivity. They're safer to deploy and roll back if
needed. They're easier to review and therefore move faster through the
production pipeline.

I know this principle has a striking resemblance to TDD because it's the most
frequent feedback I get when I talk about it with other programmers. "Why don't
you just do TDD all the time?" – they wonder. The answer is that I almost never
practice TDD. Let me explain:

- TDD feels great as a workflow. It resembles the "REPL experience" I'm so fond
  of. But TDD quietly brings a design constraint to the table. When I'm writing
  code, I'm mostly typing out the solution I modelled in my head: it's a
  transcription exercise for me. TDD always forces me to shift my mental model a
  bit so that the code is more testable _upfront_. While there's nothing wrong
  with making code more testable, doing it while I'm discovering how well the
  model in my head translates into actual code doesn't work for me. The friction
  between what I want to write and what TDD wants me to write has always had a
  negative impact on my ability to program effectively. In practice, I only TDD
  small bug fixes.
- TDD is primarily a development technique. Its artifact is unshipped code.
  Unfortunately, we can't say that the code we write works – even if it's perfectly
  tested – unless it works in production. That's why I want more than TDD from my
  "REPL experience", I want to [test in production](#test-in-production).

### Test in production

I can hear [mipsytipsy](https://twitter.com/mipsytipsy) in my head saying "fuck
yeah!" every time I mention this principle.

Here's what it means to me: I want to expand the boundaries of my "REPL
experience" enough to include my production systems in the loop. I'm not
satisfied with a tight feedback loop while writing the smallest possible change.
I want to ship it to production in _minutes_ and find out if it works there.
What's the point of putting a lot of effort in writing the "correct" code if I
don't know if it works in production?

The urgency of shipping code to production has a positive effect on the culture
of a product development team. I have seen it first-hand many times: we want the
"REPL experience" to include production? We're going to need fast CI and CD
pipelines. We're going to need ways to observe the impact of changes on our
production systems. Rollbacks have to be cheap. We may want to use feature flags
so that the deployments are safer. We may _not_ want a staging environment so that
the pipeline to production is shorter. All of it contributes to the speed of
iteration (from "Boyd's Law of Iteration").

The cultural pushback I get when I say "test in production" is fascinating
because we _all_ test in production when we ship the code _anyway_. It makes
sense to do it consciously. It creates a safer, more efficient environment for
feature development.

Testing in production and small changes feed on each other. The faster your lead
time, the more likely you'll ship smaller changes. The smaller the change you
ship, the safer your deployments. The safer your deployments... you get it, it's
a circle!

### Be a gardner

Code gardening is the act of changing code to improve it just a little. You make
an error message more understandable, you use a more idiomatic way to write
those three lines, you align that test with your internal conventions. The
codebase is a living organism: it's a garden and you take care of it every day.
You prevent bad habits from forming, you heal that one spot that is a bit sick, you
don't forget to water the plants. My first encounter with this analogy is a
[commit](https://github.com/rails/rails/commit/fb6b80562041e8d2378cad1b51f8c234fe76fd5e)
made by [@fxn](https://twitter.com/fxn). It has stuck with me ever since.

The way I do gardening evolved over time. I used to add some gardening to
existing tasks. I grew out of it because it polluted code reviews with unrelated
things and increased the size of a change. I value small changes more than
gardening.

Nowadays, I have a small workflow to structure my gardening activities. I take
notes of the little things I want to do while I'm doing other tasks. Sometimes,
I share these notes with my teams (it really depends on the team and the context
they're in) to help other people become gardeners. Then I use this to-do list as
a personal reward system. I get done what I need to and then I treat myself to
improving that test that produces those annoying warnings. I have seen it at
play with other programmers as well once they form the habit. The reward system
is simple and effective: it allows people to make small improvements _all the
time_. Gardening shows care for the codebase and caring makes working on the
same codebase more sustainable over time.

Being a gardner is easier if you're already making _small changes_ and you're
already _testing in production_. The ability to improve a codebase is often
limited by the cost of deployment: the higher the cost of a deployment, the less
likely one can be a good gardener. It's all connected.

## Starting from scratch

Since it's less common, I feel privileged (or unlucky, it depends on the day
honestly) that I've been in charge of brand new, multi-year, projects many times in
my career. These projects were all different, they involved a different team
and a different company every time. But the fact that I had to start from scratch
in all of them gave me an opportunity to try things out and see what
worked and what didn't. The following principles are my favourite parts of what
worked.

### Documentation driven development

More than a decade ago, I ran into [readme driven
development](https://tom.preston-werner.com/2010/08/23/readme-driven-development.html).
I was happy I could give a name to something I had already been doing for a few
years. Since then, I tweaked the name of the principle to "documentation driven
development" because it's a tad more general and flexible.

The idea is to write documentation for a system as if the system were already
done. It's my favourite system design technique. The beauty and the irony of
this approach is that I write the docs first so I can put some constraints in
place. I can then reflect on their consequences with a lower effort (compared to
building the system). Consciously chosen constraints are the foundation of a
good design.

The type of document, its length or the number of details in it are all
project-dependent parameters, so it's hard to provide concrete examples. There
are some things I have in any document, though:

- **Scope**
  : When it's done, what will the system do? Even more interesting, what will it
  not do? Answering these questions gives me some boundaries so I can stay on
  track and focus on the essentials.
- **Organisation**
  : Can I picture the different parts of the system? How do they interact with
  each other? A few diagrams go a long way. I sketch a few to get a sense of how
  to split responsibilities among the different parts. It also helps me
  understand what the highest level building blocks of the system should be.
- **Prioritisation**
  : Where do I start from? What needs to be already in place to start working on
  a specific part of the system? I write down the order in which it makes most
  sense to start building things. Depending on how the system is organised, I
  write down the parts that can be parallelised.

If I work in a team, this document also functions as a hub for async
collaboration. I want to make sure we're on the same page before we move from
writing for humans to writing for machines.

### Throw it away first

When I think about prototyping, this quote always comes to mind:

> In theory, there's no difference between theory and practice. In practice,
> there is.

It is so apt for programming! It doesn't matter how carefully I study a problem or
how good the solution I came up with seems. Doing is always different.

Building a system is a struggle between tiny details and high level ideas. It's
implementation versus design. The harder the problem I'm trying to solve, the
stronger the tension between the two worlds. I want to make sure it's a positive
tension:

- I write a chunk of the design doc
- I write a prototype
- I throw it away
- I improve the design doc
- I write a new prototype

If the problem is complex, I may repeat this process a few times. If the problem
is trivial, I may get away with not throwing code away. I'm ready to do so when
I'm unhappy with my understanding of the problem.

Please note: I didn't say anything about what I think of the code. My best-case
scenario is that I don't hate it the day I write it and I may still not totally
hate it after a few months. So what I think about the code isn't so relevant.
Furthermore, it will change a lot anyway when I make it production ready.

This is the key idea: I write a first draft knowing I will probably throw it
away. With that in mind, I experiment, I digress a little, then I try again.

My favourite programming sessions always happen after I've thrown away at least
one prototype. These sessions are really fast: I'm kind of just typing out a
satisfying solution.

### Make it work, make it good, make it fast

This principle is a variation of the theme of the
[principle](https://wiki.c2.com/?MakeItWorkMakeItRightMakeItFast) often
attributed to [Kent Beck](https://twitter.com/KentBeck). I'm so pretentious
about it, I like my naming better.

I consider it to be the corresponding starting-from-scratch principle of [small
changes, fast feedback loops](#small-changes-fast-feedback-loops). It's almost
the same idea but the dynamics are a little different: there's obviously more
freedom of movement when writing a new system. That freedom is detrimental to
making small changes.

Often I can't change a few lines even if I wanted to: I need to write a whole
lot of code across multiple files to even see my little prototype do some basic
things. It's the nature of writing code from scratch. So here's the idea:

- **Make it work**
  : I REPL my way through code to figure out if what I put together in my head
  works in practice. I don't overthink it. It doesn't matter that the naming isn't
  good yet. It's OK, I know the code isn't production ready: I can get away
  with not dealing with corner cases, failure modes, error codes from that third-party API.
  I note things down, leave to-dos for tomorrow's Luca. It's a
  deliberate choice: my goal is to get the code together. I don't have to make
  it good yet. I don't have to ship it to production in a minute.
- **Make it good**
  : I go through my notes and the to-dos I left for myself. One by one I tick
  items off the list. With every two or three items I get off the list, I step back
  a little to evaluate the design. Now I'm making it good so I want to get down
  to details. The way the code is organised has to make sense. I care just about
  everything: I only leave out speed. I am not trying to write slow code by
  design (that wouldn't help and it's probably harder to do than it sounds?) but
  I'm also not trying to squeeze milliseconds off of every function.
- **Make it fast**
  : It's time to measure things. To be fair, this isn't always
  a required step. Often enough, code that works in production is quite good
  already for whoever is paying for it. On the other side of the spectrum
  though, there are situations in which speed is a requirement. The first two
  steps still apply. What changes is the definition of working code. I
  incorporate speed into the definition and design my "REPL experience" to
  always tell me how fast the code is. When performance is so critical, I make
  the performance scripts I wrote for my "REPL experience" a step of the CI
  pipeline. As for the actual effort to improve performance, the most basic
  workflow goes a long way: I profile the code, find the slowest bit, make it
  faster, and repeat until it's fast enough.

Over the years, I realised that this principle has an interesting side effect on how
I choose programming languages. Let me offer a concrete example.

Nowadays, I work exclusively with statically typed languages (I have probably
enough reasons to write an article about it... interested? Please, let me
know!). The ergonomics of statically typed languages allow for a much more
relaxed approach to the make-it-work phase. I really don't need to care too much
about how the code is organised or its naming. Modern IDEs are so good at
refactoring statically typed code that I can do a big chunk of the make-it-good
part literally in seconds.

Looking back on this, it feels paradoxical. I chose dynamically typed languages
(my favourite being Ruby) because of the supposed productivity gains only to
realize that I had to be much more careful (therefore slow) in the early stages
of a new project because of how hard it would to be to reorganise code.

## General principles

Is it really programming if I don't have at least some util functions? 😃

Jokes aside, there is a handful of principles I apply to any context. These
principles are my "true north" guidelines.

### Prose not poetry

Writing code is... writing. It's an intriguing form because you have two
audiences: the machine and the next programmer. To spice things up, they
couldn't be more different.

The primary audience is the machine. We often lie to ourselves and say things
like "more than anything, you're writing for the next programmer that reads your
code".

I'm sympathetic with the argument, but let's be honest: you can't ship code that
doesn't compile. It doesn't matter how readable and understandable the code you
wrote is, it doesn't work if you have a syntax error. The machine understanding
what you wrote is a prerequisite of working code; readable code isn't.

Then there's the next programmer. Humans are complicated. They have preferences
and opinions about what correct code looks like. Many factors contribute to the
readability of code and programmers often won't agree on which ones are more
relevant. So we end up contextualising the way we write code to the project it
belongs. There isn't one way of doing things.

Pleasing both audiences is a tough game and realizing that writing code is
"just" writing has been of great help.

The idea is that I think of code as if it were book. A book has chapters, the
chapters have paragraphs, the paragraphs have sentences. From the
perspective of a codebase, one way to look at it is: sentences are
instructions, paragraphs are algorithms, chapters are modules, and a book is
a system. I don't need the parallel to hold up in every situation, it's about
abstraction.

I want _homogeneous_ abstraction _within_ a layer and _heterogeneous_
abstraction _between_ layers. I don't want to jump from shifting bits in one
line to call an external service via HTTP in the next one.

A notable exception is performance. Making code faster often makes it
messier, uglier because the abstraction isn't homogeneous. You're jumping levels
often because the code on the hot path is written differently from the rest. In
this scenario, I write comments explaining _why_ the code looks the way it
does.

When I bring up this prose vs poetry metaphor, I often get the feedback that
poetry fits as well. After all, there's very structured poetry out there. The
thing with poetry though is that it's good when it says a lot with just a few
words. Poetry is terse, especially compared to prose. When in doubt, always
_prefer clarity to brevity_.

### Facts > Assumptions

I often say:

> Common sense is not so common.

It is common sense that facts are much more relevant than assumptions, isn't it?
Well, I've been bitten by the wrong assumption many times.

For example, most of the bugs I've ever fixed were the result of
miscommunication where two parties assumed what something meant without checking
if they agreed. Fixing a bug is aligning the code with the facts.

It's not a coincidence I'm mentioning bugs right now. This principle guides my
debugging sessions.

It goes like this: I read a piece of code, I know there's a bug in there. If I
can't find the bug just by looking, this principle comes to rescue: somewhere in
this piece of code there's at least one thing I'm considering a fact – but it's
actually an assumption.

So I move up one abstraction layer, I start debugging my facts, which can have
any of these outcomes:

- I find the "fake fact". Often I immediately find the bug, too. Especially when
  I was the author of the bugged code. It's kind of obvious: the bug was there
  precisely because I thought the code I wrote did X while in reality it did Y.
- All the facts are true. It means I have to go down one layer, expand the
  search, collect more facts, then go back up to start debugging the facts
  again.

I apply this principle to performance improvements as well. Early in my career,
I had a tendency to guess what made, say, an endpoint slow. Sometimes I even
changed something without measuring. When I think about it now, it makes me
smile and go "Oh, how young I was back then!".

The guessing game was stimulating, but I had to abandon it because the facts
(ah!) were showing me that it was a waste of time. I was wrong pretty often.
Moreover, I often found the results of my benchmarks so counter-intuitive that I
could only conclude that the best approach is to measure everything. Now I don't
even ask myself what makes a piece of code slow. I measure everything, I want
the facts.

### Name things what they do

Naming _is_ hard.

Having said that, we often make it harder for ourselves than it should be
because we bring aesthetics to the table. Code must be pretty so we're looking
for elegant, apt, short names for everything.

Early in my career, I struggled with naming much more than I do now because I
didn't realise a few things:

- Unless it's a trivial problem, I don't have to name things right while I am
  sketching a solution.
- Due to the intense concentration I need to write code, sometimes I don't
  realize that the names I choose are a design choice. Calling something, say,
  `JobScheduler` constrains its design and the design of whatever interacts
  with it. I called it so, therefore I will treat it so. But maybe it's not
  really a job scheduler and my design starts to drift off rails.
- My understanding of a non-trivial problem increases as I write the code trying
  to solve it.

All these considerations led me to "relaxed naming" (ah the irony of not liking
this naming 🙃):

- I call things what they do _right now_. I use the most _specialised_ name I
  can think of. The more _descriptive_, the better. Bonus points if it's
  _verbose_ and _boring_.

Yep, there's no step two.

It's a little cheeky, I'll give you that. But all in all, after 20 years I'm
finally happy with my naming process. I basically look at it the same way I look
at prototyping. Let me spell out the obvious: the thing I'm trying to name is
_new_, I am naming it now because it's not there yet. So the principle [make it
work, make it good, make it fast](#make-it-work-make-it-good-make-it-fast) works
pretty well here – except there's no step three.

"Name things what they do" also means that I prefer dull, descriptive, long
names to short, fancy, clever ones. I also despise acronyms.

I like to extend this principle to everything, including services, machines. I
prefer boring name schemes to fancy or funny ones. A trivial example:

- DO: kafka1, kafka2, kafka3
- DON'T: orion, antares, pluto

I don't have to ask what kafka1 is because I called it what it does.

### Write the code you'd like to use

I can't find the original reference, but I'm pretty sure this principle too was
inspired by Kent Beck.

This idea works well when I get stuck on an empty file. The proverbial blank
page. I have so many questions about the API of the new module I'm about to
write, the data structures I should rely on internally, the types I should
expose, and so on. It can get so overwhelming that I just get stuck.

That's where I take a deep breath and ask myself: how do I want to use this
code? Here's what I do:

- I close that empty file I was staring at.
- I open one file that would use the code I can't get myself to write.
- I write code like the problem is _already solved_ the best way I can possibly
  imagine.

The third step is hard because I have to lie to myself; I do know the code isn't
there yet. So this process only works if I jot down a solution without trying to
think of all the code I need to write to make it all work.

### Let the design emerge from the code

Good design is an exercise in patience.

It's hard to be patient when I think I have a clear idea in mind. It's half the
excitement of working on a new problem and half the impatience of not being done
with it.

I want to do it all fast and perfect. I learned that this _never_ works in
practice for me. I can't rush a good design. To complicate things, systems are
living organisms, their only constant is change. They change because of business
needs, scaling needs, or whatever. The list is too long. The point is that they
change all the time.

Evolving systems in a sustainable manner is hard. It's what I've seen most
people struggle with. Over the years, I collected a few maxims that guide me
through designing a system. Their goal is to slow me down, so I can think about
the design at the right pace. Let's go over them.

> Less is more

I "stole" the sentence from [Rob
Pike](https://commandcenter.blogspot.com/2012/06/less-is-exponentially-more.html).

I want to add as little as possible to the system so I can listen to what the
code is trying to tell me. Let me explain.

I often think about code as a bi-directional form of communication. I'm trying to
tell the machine what to do and the code tells me what to change.

The way the code looks, the way some parts need to change every time some other
parts need to change, the non-obvious ways two parts depend on each other, the
naming being a little off... So many little details! It's the code trying to talk
to me. If I'm always talking over it though, I won't be able to listen to what
the code is saying. I have to write less. Less is more.

> Simple ain't easy

Good design looks obvious. It's so simple that it has just about enough to solve the
problem. But simple doesn't mean easy.

Reaching a simple design takes the time it takes. It's a reminder I can't rush a
good design.

It's also the way I judge my solutions: I'm only happy when the code is so
simple that I feel there's nothing to remove from it any more.

> Prefer duplication over the wrong abstraction

I got this one from [Sandi
Metz](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction). She does a
wonderful job of explaining it so I won't repeat what she means. You should
read her article, she's a wonderful writer.

Exposing my teams to this idea over the past few years has been beneficial. I
often trivialised it a little for the sake of making a point while sharing the
idea with my teams: If you have duplication once, leave it be. If you have the
same piece of code in at least three different places, then you've got a good
chance for a correct abstraction. If your abstraction feels simple (ah!) enough,
go for it.

These maxims all contribute to the idea that waiting for the design to emerge
from the code is better than trying to rush into coding our current idea of good
design.

### Write actual tests

> A test must change only if the behaviour it verifies changed

No other reason is good enough for a test to change. Which, in turn, means
"actual tests" only test behaviour. I've seen tests testing language features,
or missing language features (looking at you dynamically typed languages), or
framework features.

These tests have a very annoying property in common: they change every time
production code changes. My advice is to delete them. Yes, I just said that.

When I bring this up, people usually understand my advice as either not to write
tests at all or write only integration tests.

Obviously, no point in debating the first one. Of course you should write tests
to verify your system. I'm not arguing that. I'm arguing the effectiveness of
tests suites.

As for the second point, it's true that integration tests are more likely to
suit my definition of an "actual test". I understand where people are coming
from with this. My definition though doesn't say anything about the level of
abstraction the tests should operate at. I'm not arguing _how_ to write tests,
I'm arguing _what_ to test. Test behaviour, forget the implementation.

From a practical standpoint, I do prefer integration tests. After all, with the
help of [Moore's law](https://en.wikipedia.org/wiki/Moore's_law), integration
tests are fast enough for the trade-off of, you know, actually test something.

### Balance your confidence

If I had to name only one significant change I've experienced since I started
programming, I would go for confidence. The more experienced I feel, the more
convinced I am I can solve any problem.

It is somewhat obvious that experience made me more confident. I gained
experience through trial and error. Rinse and repeat. I learned what works and
what doesn't by trying things out, often the hard way. So yes, experience makes
me confident. Sounds good, right? Yes and no. I need balance.

Confidence is good because it can make me fearless. I know you can throw any
problem at me, I will find a way to solve it.

Let me tell you a story about my first job that illustrates what I mean.

In the summer of 2006, I joined a company in Rome that processed hundreds of
millions of events per day from poker machines. At the time, the legislation in
Italy prescribed that these machines had to return 75% of winning. So our systems
collected _any_ event these machines produced. The company ran monitoring and
fraud detection algorithms.

The whole system was a large collection of stored procedures on top of a giant
Microsoft SQL Server installation (don't judge me for this architecture OK? I
didn't design it). These stored procedures parsed the events (a large blob of
text that we parsed with SQL. Yep, you read that right), stored the processed
data in various tables, and ran a bunch of algorithms on the data. It was
complicated for a young man fresh out of university.

My first big task was to make use of a reserved part of the events. In practice,
this meant that I had to figure out the impact this change had on the whole
system, aka 200+ stored procedures.

I knew I couldn't do it alone, but I tried anyway. It took me almost a week of
despair to find the courage and tell my boss I had no idea what to do. When I
talked to Mario (it was in Italy so 🤌🏻), his answer filled me with anger
first. He said something like "let's do this together, it'll take two hours to
plan everything, then I leave you alone".

Two hours?!? I had lost almost a week trying to make sense of the problem and
came up with nothing, how were we going solve this in two hours? Well, he showed
me and it was a profound learning experience.

We got into a meeting room and Mario did the most obvious thing: he broke down
the problem in small steps, one stored procedure after the other. We put the
code on a big screen and took notes. Fast-forward two hours and we had a
whiteboard full of sticky notes for every single stored procedure we needed to
change and the reason why each of them needed to change. I was amazed.

Mario had the confidence to solve the problem. He knew he could do it so there
was no fear to cloud his thinking. He sat down with me and executed a simple
process (simple ain't easy eh?) of laying down the foundation of a month of work
in just two hours. That's the kind of confidence that makes you fearless.

If confidence has such a amazing effect on your ability to my difficult
problems, what do I want to balance it with? Well _my_ confidence feeds on _ego_.
And that's a problem.

While confidence makes me fearless, ego makes me dumb. At times, I have troubles
telling them apart, after all they're close.

The difference is only the way I look at things. When I'm confident, I take my
time to break down a problem in smaller parts, I research the subject, I ask for
help, I plan accurately. When I'm high on ego I look at problems from a
pedestal, I underestimate them. I plan badly because "hey I'm great! of course I
will solve this on the go, planning is for losers".

That's why I seek ways to balance my confidence. I need enough confidence to
eliminate any fear but not too much that I get high on ego.

The way I find my balance is by putting to practice the idea "we're all junior
at most things": I learn new things. Just in the past few years I tried drawing,
rubik cubes, chess, you name it.

When it comes to programming, I try to solve problems in areas I have no idea
about or some problem that looks really hard. For example, writing a programming
language sounds hard, so I toyed with it and found out that it's indeed hard but
it's also "just" a program.

The journey is humbling and the reward is two-fold: a balanced confidence and
expanded knowledge.
