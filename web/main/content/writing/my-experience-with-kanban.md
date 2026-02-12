---
tags:
  - "engineering management"
date: "2015-07-06T00:00:00Z"
description: How I think Kanban works and what I like about it
keywords: kanban, management, productivity, team, development
title: My experience with Kanban
---

I've been wanting to write about Kanban for a long time. Sharing the way we
organise processes is vital to the development of the techniques themselves.

We try things out and see what works and what does not. Most of the time this
process is too slow as we do not share as much as we could with the people
trying to solve similar problems. Or, even more dangerously, we do things by the
book since we believe there is one true way. I believe there is no such thing as
"the true way" when it comes to putting more than one brain together to build
something. Not to mention the fact that most books tend to generalise a lot as
they want to reach a broader audience and in many cases the result is an
unusable, inapplicable set of rules. I do not think what I am saying is
controversial either. Quite the opposite: I give for granted we have to adapt
whatever process to the team we are working with.

Before moving forward, I want to stress the fact that what I am trying to do is
sharing what I think Kanban is and in no way you should _just_ do what I am
discussing in this article. All teams are different by definition so there are
chances my ideas may work for you. Take everything with a grain of salt, my goal
for this article is to provide you with food for thought about process.

## By the way, what is Kanban?

Well, this is a good question. I have no idea what "we use Kanban" means for
other people, whoever you ask you get a different answer. But I know what it
means for me and here are the key points:

### Everyone owns everything, everyone does everything at every stage

I consider every version of Kanban is a variation of the sequential stages: to
do, doing, done. As we are talking specifically about development it is likely
to imagine there is at least one stage for QA (I like to have two). Many teams
assign different people in their team different roles. Each person in a specific
role would move things from a stage to another or have a special right or duty
at a stage. In my view, this is **wrong**. I design processes so that everyone
can do and will do everything at every stage.

I have a few reasons for "gently forcing" my teams to work this flatly. For
starters, I do not like "special rights". I worked for companies where
developers could not access production machines (which is a bad sign), I even
worked for a company where developers could not access staging machines.

Everyone does everything means everyone can help improving every stage, everyone
gets the full picture, everyone feels the pleasure and the pain of what works
and what does not in the process. The side-effect of forcing a no-roles policy
is that it helps forming a team quicker and to introduce new members to an
existing team. The reason is quite obvious but often overlooked: if everyone
does everything people need to talk to each other more to get or give help about
specific tasks they're trying to accomplish. You are not creating sub-teams
inside your teams, great communication is key.

### Focus on what is in progress

I like this aspect of Kanban: after a while people get used to the fact that too
much work in progress is not good. Being 100% busy is _never_ a good thing; Old
school managers shake their head when they hear me advising your team should
never be fully busy.

I like it so that everyone runs out of work almost daily. I design my processes
so that people will run out of things they can start working on. The reason is
simple: writing the code is the fun part. But writing code doesn't ship it to
production. Code needs to be reviewed, tested, and validated in different
environments. The rule I came up with in order to be sure people focus on what
is actually important (aka shipping code that makes your customers happy) is
simple but strict:

> you cannot start working on anything new unless something else you did not
> write the code for can be moved further in the process

Whatever that's test, review, deploy code (whatever: it does not really matter).
This rule forces people to think about the process itself. Starting to work on
something new is exciting but it has no impact until it is released. And that is
what matters for the focus. I will admit it is not always easy to work this way.
Everything comes with trade-offs and the downside of being always about to run
out of work is that managers have to work more than usual. This process requires
constant attention.

### No batching, everything is done just in time

This aspect is particularly tricky as it needs help from outside. Generally,
product managers must see the benefits of forgetting to plan in batches. No
batching means no recurrent meetings about what we are going to work on the next
week (two weeks or whatever). Batching is typical of Scrum (at least in my
experience) and it comes with two things I do not like:

- It lets your managers relax as it is easier for them to manage teams in
  strict cycles so they end up not helping to improve processes for the people
  that are actually working.
- It slows down reaction time. You cannot easily start working on a feature that
  was completely unplanned two days ago and it is now high priority because your
  business demands it. And if you work for a startup you really want to be able
  to respond to whatever kind of request comes from the rest of your company.

A completely just-in-time process requires a lot of daily work from all parties
in order to check if things are being worked on accordingly to priorities or
they are actually ready to be worked on. Which, in this specific case, requires
product help.

### Kaizen is not just a fancy word

[Kaizen](https://en.wikipedia.org/wiki/Kaizen) sounds like a fancy word to me so
I generally do not even mention it in discussions about Kanban. I do prefer the
simple "continuous improvement". There is no need to have read a Kanban book to
know what you mean with it.

I think this is vastly underestimated, at least that's the feeling I get when I
talk to people about Kanban. The key is making sure everyone feels comfortable
to propose a change in the workflow. Staying humble and asking everyone to be
involved in the process of improving your own processes is the very core of
Kanban in my opinion. A good benchmark would be: how often do you tweak your
workflow? The answer will tell you how kaizen you actually are. And if you are
not changing anything does that mean there is nothing left to improve? I would
really doubt that. Trying to continuously improve your workflow is one of the
few situations that justifies recurring, topic-bound, meetings. These meetings,
if well run, have a great impact on your team: they will start owning their own
workflow. That is the ultimate goal of my process.

## Good for starters

Despite the variance of personal interpretations, We can probably agree on the
fact a Kanban workflow is some variation of the "to do, doing, done" sequential
stages. That's the very reason why I think it is good for starters.

Having junior people in your team is _necessary_ so you workflow must not be a
barrier. The less new-comers have to learn the better:

> Kanban is easy to use but hard to understand

that is the reason why I like it for starters. It is a bit like Ruby. You can
start being productive with Ruby in a few hours. It is almost like speaking
English with your computer. But then it does takes some time to actually
understand more advanced concepts. Kanban is really the same: you can start
using it your first day at work: you just move things to the right of your
board. But it takes a while to understand the benefits of the deceptively
approach.

## Make the WIP obvious

This is the hardest part in my experience. Making work in progress obvious to
all people involved and helping them understand why we want to limit the work in
progress has been always the most challenging aspect of implementing a healthy
process for me. Of course, it may be my own limitation, I do not exclude that. I
think there are a lot of different ways you can make sure you know what is
really being worked on. Here tooling can make a difference. I like very
colourful boards where each colour means a different, distinct thing. What
happens often is you have too many cards of a specific colour. Common sense will
scream "hey, there are a lot of things we could deploy to production today, it
does not make much sense to start working on new stories".

In general, [standups]({{< ref "/writing/my-experience-with-standups" >}} "my
experience with standups") help keeping an eye on the WIP. I am not a big fan of
standups (it is just a personal preferences and you should never go for your
personal preference: it is a team decision) but I have learned how to appreciate
the time it gives me and my teams to look at how things are going every morning.
As I said, I find it hard to make WIP obvious to everyone and sometimes I find
my teams with a huge WIP. Now, this is the part of "we use Kanban" I am trying
to focus more on. I have not found a solution that satisfies me yet and I would
like to hear other people's opinion on this topic. Of course, a satisfying
answer is a trick that lets the teams figure out on their own that there is too
much going on.

## Estimate anyway

The traditional game of estimates makes no sense at all to me. You know the
game: developers say something is bigger than it is in order to protect
themselves from unplanned work while stakeholders try to "steal" from those
estimates so they can get "more" done. We all know things take the time they
take and I do not really understand why this dancing madness even exists.

Of course, business still needs estimates, right? That is a legit question. And
my answer is this: trade estimates for flexibility. The benefit of being always
able to change what we are going to work on in a few days is much more valuable
than "accurate estimates". Having said that, I still prefer developers to give
estimates to themselves. I like t-shirt sizes, letters are not that easy to sum
up. I ask for estimates are:

- Common understanding. If one developer says S and another says XL there are
  high chances one of them did not understand the requirements. There are
  chances none of them did.
- Retrospectives. If you plot graphs that show you how big the stories you
  shipped over the past weeks are, you will find surprising answers. At least
  that is what happens to me all the time.
- Keep WIP in sync. If you keep the rule that people will have to estimate
  stories anyway, they will ask in a chat or in person about estimating the
  given story. That helps people say "Umm, you know, I wouldn't start this story
  now. There are a lot of things we can test or review". It is a well worth
  benefit.

## Get graphs about your work

I have just mentioned I am always surprised when I plot graphs about what we do.
And that is a quite good reason to get graphs. Sometimes simple graphs like a
breakdown of the story size or the story type (bug, feature, IT feature and so
on) will show things you did not know about your work. Whenever I show these
graphs to my teams, I'm happy to see they care about the insights, they care a
lot. And they will ask questions which will lead to further improvements in your
process. A warning for those managing one than more team: these graphs are not
meant to measure any absolute quality of your teams. So you should not use them
to compare them. To be fair, you shouldn't be comparing them anyway.

## Kanban does not matter

This process served me well for a decade now but I do prefer to warn people once
again: it is no silver bullet. In the end, every technique you end up using to
organise your day is a set of trade-offs, a specific set of limitations you give
to yourself in order not to lose control completely. They all work this way and
Kanban is not special. I am convinced the key of good management and effective
teams is communication. It is the hard part, the really challenging one. We
often mistake faults in our communication for faults in our processes. I will
tackle in another article soon enough.

{{< leading-developers >}}
