# Process

> No process is a process too. A bad one.

As process is a generic word, here is my definition:

> A process is a set of correlated procedures that aim to solve a specific
> problem. Each procedure involves the work of one or more people.

This description fits most things we do at work everyday and, yet, we often
ignore process design. The challenge is that building a process for solving a
problem isn't as appealing as solving the problem itself.

For example, take bug fixing. Write a test to expose a bug, then fix the bug,
and finally ship the fix to production – this sequence has an immediate impact
on the system. It's an exciting and fun activity. On the other hand, designing
the process to report bugs and triage them doesn't sound as interesting. So what
happens in practise is that most teams end up with a bug triage process they did
not design. Which, in turn, means that they don't agree with some parts of the
process. It's no surprise that they don't like working with it. Because _no one_
chose it, the results are rarely good.

Processes are designed to solve a problem. One way to make them more appealing
for your teams is to shift people's attention from the processes themselves to
the problem they aim to solve.

If you make your team members part of the problem-solving activity, designing
processes also becomes more inclusive. You get fresh ideas from the actual users
of these processes. You increase your chances of designing more usable and
enjoyable processes.

In this chapter, I focus on the processes that I believe have the biggest impact
on the productivity and happiness of a team. Often productivity and happiness go
together, but it's possible to run productive teams that are unhappy and
inefficient teams that are happy. Teams that don't possess both properties tend
to break after a few months. Well-designed processes help minimise the risk.

## Estimation

Individual contributors often have problems with estimations. The reasons are
well-known: software is hard, there are too many details to take into account,
and no one can consistently consider every aspect when estimating.

Because of these well-known problems, both individual contributors and their
leaders tend to overestimate _everything_. It's only human to do so and, over
time, teams stop trusting the accuracy of their own estimates.

The lack of trust in estimations is tragicomically common in our industry and no
strategy works better than removing the process completely. If no one trusts
estimates, what's the point, right?

The problem is that whoever asks for an estimate – be that product managers, the
marketing department, the actual customers (that's the best option!) – this
estimate or timeline is relevant to their work.

How do we find a balance between stakeholder needs and the hard truth that
the estimation process is inaccurate, nonsense, and unproductive?

At my Latin class, the teacher would tell me _virtus in media stat_. It
translates to "virtue stands in the middle".

It's a nice principle that always comes to mind when I discuss estimation
process. You can design a process that removes estimations from your daily
operations and still gives a somewhat accurate estimation to whoever needs it.

The key is to focus on what makes estimates hard: product development isn't
predictable therefore our estimation capabilities are bad.

I invite you to take a minute and think about the situations in which you said
to yourself "This feature takes X much time to complete" and you were actually right.

Done? Good.

I've spent a great deal of time thinking about this and I found that predictable
features show the following characteristics:

- The effort is the _smallest possible_ in the given context.
- During development, there was no back and forth between whoever specified the
  feature and whoever built it. The input was clear, no questions arose. After
  all, the feature was so small that the _input was minimal_.
- After the feature was deployed, there were no hot-fixes. The deployment was
  smooth, the system just kept working. After all, the diff was so small that
  the system _almost didn't change_.

Unfortunately, most features don't mark all these checkboxes.

They _should_ though.

A feature built via "a small diff" that went from start to rollout without any
problem _is_ the perfect scenario.

The sceptical here would say: it's called perfect scenario because it never
happens. I don't disagree with that, but I prefer to apply the following
principle instead:

> Strive for perfection, but accept that done is better than perfect.

The balance between an ideal and real world scenario is important and it should
always be taken into account. _Virtus in media stat_.

In an ideal world, all features would require "a small diff", have a perfectly
understandable input, and ship to production with no problems.

I know that the reality isn't so simple, but the ideal scenario is giving us a
clear indication: small diffs are better than large diffs. They lead to short
work in progress, and easy deployment. So striving for perfection in this
context means:

> What if all features we develop were as small as possible?

Well, all features would mark the three checkboxes I've just discussed… right?
And that would result in a perfectly predictable flow!

Here is a trivial example:

- You have to develop a large feature.
- After some discussion, you break it down into 10 "small standard
  features".
- You know your "small standard feature" takes half a day.
- You are looking at a week of work.

Splitting guarantees predictability: if every single feature we build takes half
a day, we know exactly how long anything takes.

The challenge moves away from guesswork and becomes getting better at breaking
down work into small, coherent, deployable chunks of work. That's the process
you want to use to mitigate the unpredictable nature of product development.

Focusing on splitting features has interesting side-effects on the communication
infrastructure of a team. Continuously breaking down big features into small
parts requires a lot of communication. It's a gym for empathy, too. It may be
hard to break down a big feature into smaller chunks for a reason: be that the
product angle, the design one, the technical feasibility, and so on. These
situations help team members put themselves into other people's shoes and bring
everyone closer. They can finally see each other's problems and then, with some
practice, start anticipating them. Team members get closer and collaborate
better if they have to break down features all the time. If that gets you a
predictable flow, why wouldn't you try it? I personally see no downsides.

## Workflow

I use "workflow" as a generic term for "how you organise your teams to get
things done". In product development teams, I use the term to describe the
systematic organisation of the journey an idea goes through to become a feature
we ship to production. Of course the journey involves other activities: fixing
bugs, data analysis and reporting, infrastructural improvements, and so on.
There are no two companies using the exact same workflow. There is always
something slightly different about the way a team handles their tasks.

Workflow is the most visible and obvious process we use at work everyday. All
methodologies aim to offer simple and effective ways to organise, distribute,
and visualise work. That's why it's so central to many conversations, to the
point of coming up on job ads and during interviews. In this context, I focus on
the workflow we use to develop features when the input is ready. Product
discovery, design of user experience and interfaces is a broad fascinating
topic, but it's out of the scope of this book.

Over the course of the last few decades, there has been a lot of development on
the subject. People came up with different methodologies and approaches. These
approaches are all slightly problematic in the same way: they assume teams can
adapt to a specific process. The assumption, frankly absurd, is that every team
can be productive with the same process. What happens in practice is that every
team creates their own version of whatever methodology they think they're using.

These slight differences create an internal vocabulary and a set of specific
processes that are often not documented anywhere. The implicit knowledge
complicates onboarding and makes the day-to-day operation of the team somewhat
confusing.

Teams _are_ different, so there is no good reason to adopt a methodology just
because it worked for someone else. Of course it's helpful to know how
other teams organise their workflow, it can inspire you to try new ideas.

Each methodology is a complication of the simplest workflow possible: you have a
few things to do, you pick one and do it, when you are done you start over. A
product development workflow may have a few stages like "quality assurance" or
policies like "choose what to do for the next two weeks" on top of this simple
concept. As it often happens, the industry solves the same problem with many
different solutions. All of them have one thing in common: they are all
over-engineered. I advocate for simplifying as much as possible first, and then
focusing on what you want to add to this process based on what works for the
team.

I advocate for a "just-in-time to-do, doing, done" workflow. An uninteresting
long name.

Since it loosely resembles Kanban, I often refer to it as "my version of
Kanban". Kanban marks a lot of checkboxes I care about. It's not a methodology
and it doesn't tell you how to organise your workflow. It provides guidance on
how to improve your processes and keeps the focus on visualisation of the work
in progress. Kanban doesn't try to standardise the way a product development
team works, so it fits nicely with the idea of simplifying the process as much
as possible: work your own way and improve it constantly.

The most important aspect of "just-in-time to-do, doing, done" workflow is the
just-in-time part. It has important implications, so let me clarify those first.

Some workflows batch tasks together and we often call batches sprints. Managers
love these batches of work to-do; they can aggregate work and play the deadline
game using sprints as immutable blocks of work. The keyword here is "immutable":
nothing ever goes according to the plan. Immutable blocks of work don't exist in
practice. Moreover, sprints delegate down to the teams the main responsibility
of engineering managers when it comes to workflow: making outcomes predictable.
Team members have too many details to take care of, there is way too much going
on in their daily operations. You can't expect them to come up with accurate
estimates. Batching doesn't help the people doing the job and doesn't make the
outcomes predictable – unless the input is steady and uniform.

This is where the just-in-time part comes in. A just-in-time process means
people take the "next thing to do", put it in "doing", and then release it to
"done". Right now, I'm oversimplifying so we can keep the focus on the
just-in-time aspect.

Batching workflows assume that there is a specific moment in time when someone
brings in more work. Just-in-time workflows assume that there is always more
work people can pull from. It's a different assumption, a more flexible one if
you ask me.

In practice, you can still batch to-do work _before_ team members run out of
work. A just-in-time process is more flexible because it can adapt to whatever
phase your project is in. There are no two weeks that look the same in a product
development team, so optimising for a process that quickly adapts to your needs
pays back immediately.

One critique that often comes up when I discuss this workflow is that you can
only implement it if everyone in the product development value chain (from
stakeholders to developers, passing by product managers, designers, and so on)
agrees and commits to it.

I actually agree with that! It's my favourite aspect of this approach: it's
obvious you need everyone involved to agree on the way to work. The point is:
this is always true, no matter what workflow you implement in your teams. I
prefer how explicit and intense this approach is compared to _hiding_ behind
story points and sprints. How often have you heard things like "Sorry, can't fix
this bug this sprint". A just-in-time workflow doesn't provide that kind of
excuse.

In a real world project, the three stages "to-do, doing, done" are rarely
enough. Keep simplicity in mind:

- If you are starting out, start with these three stages only. Work won't always
  fit into one of them. Let the design of new stages emerge from your actual
  day-to-day work.
- If you already have a process with stages, look out for stages that are either
  always empty or always full. You can refactor your workflow by either removing
  some stages or breaking them down.

What matters the most in this just-in-time process is how accurate the
visualisation of each stage is. While this seems obviously a good thing, you
rarely find an accurate visualisation of who is doing what (not to mention why)
in a product development team. Describing with precision what's being worked on
is crucial for engineering managers. You can't improve what you can't see.

Ask yourself if what you see in your workflow visualisation is what's really
happening in your team. No visualisation can ever be perfect. That's OK, but any
degree of visualisation accuracy is the starting point of the "continuous
improvement" Kanban is famous for. Leading doesn't mean taking all the decisions
on your own, and improving the workflow itself is no exception. Making sure
everyone feels comfortable to propose a change in the workflow is the key to
"kaizen". To find out if you are "kaizen enough", ask yourself: how often do we
tweak our workflow?

If you haven't changed anything for a long time, chances are something is wrong
now, because the only good explanation would be that there is nothing left to
improve. I have yet to experience that.

## Work in progress

A just-in-time process has one tricky aspect: limiting work in progress (WIP for
the rest of the chapter).

First of all, a just-in-time process can't properly function if everyone is
working on something new at the same time. Because if that's the case, then
there is no one left to move anything else forward in the workflow. Pay
attention to the dynamics a just-in-time workflow generates. We get excited for
new things, and it's natural to want to start working on a new feature as soon
as we run out of work. This leads to those "there is too much going on"
conversations we all have had. To avoid "being busy being busy" congestions in
the workflow, teams need to do less. It's hard to see because it's a bit
counterintuitive: when "there is too much going on" everything feels already
slow, so how come doing less would help? The answer is that context switching
costs time but that cost is hard to visualise.

"There is too much going on" means there are too many unshipped features. The
team goes back and forth between too many things, so nothing moves forward fast
enough:

> Context switches have a cost that's proportional to the size of your WIP. The
> higher your WIP, the more context switches occur.

In the ideal scenario, at least one person is available at any point in time to
do the next thing (this doesn't mean they just pick up the next feature). For
example, if you have a team of four people, ideally there are no more than three
things going on. The question is: how do you ensure WIP is always respected?
Answering this question is hard, making everyone understand WIP limits is very
challenging, and you can't assume everyone is even aware of the problem. Some
tools let you set WIP limits at stage level (they often call stages columns
nowadays), but that doesn't solve the problem. It's only an annoying visual
clue, something has _already_ gone wrong.

The best way to solve a problem is preventing it from happening, and it's
possible to do so with WIP limits. A just-in-time workflow needs constraints to
limit WIP. Here's an example of a constraint: some actions can be performed only
in a specific order. As this is too abstract, let me provide you with a
real-world example from my past experience.

The following constraint assumes everyone can pick up a feature from every stage
in your process (reinforcing the idea that there are ["no privileges, no
elites"](2-culture.md#no-privileges-no-elites)). Here are the rules:

- A team member can't pick up a new story if they don't "push something down to
  the next stage". In other words, they can't pick up a new story if they don't
  contribute to moving things in the workflow first.
- No one pushes work they produced on their own down to the next stage. For
  example, if someone developed a feature, they can't ship it to a further
  stage.

The combination of these two rules creates a constraint that auto-limits the
workflow. If these two rules are never broken, team members pick new features
when that's the only thing they can do. Picking up something new becomes a
special moment because it doesn't happen so often any more and it's the perfect
time to play the estimation game. While in [Estimation](#estimation), I make the
argument of focusing on breaking down features into the smallest possible diffs,
I still see value in the estimation process itself. Assuming t-shirt size for
effort, my reasons are the following:

- Common understanding

  If one developer estimates a feature as `S` and another as `XL`, chances are
  at least one of them didn't understand the requirements. You can think of
  estimation as a ritual that gives people a chance to clarify misunderstanding
  _before_ the work starts.

- Data, data, data

  The data collected with estimations provides insights and correlations that
  help you "stay kaizen" over time. If you have the data, you can look for
  correlations. For example, you can check if there is any correlation between
  the size of features shipped and bugs. A great exercise.

- Keep WIP in check

  Once a team runs into too much WIP a few times, people start seeing patterns
  that lead to the unpleasant "there is too much going on, nothing happens".
  Estimation helps anticipate the situations in which rules break and
  conversations like "You know, I wouldn't start this feature now. There are a
  lot of things we can test or review" happen often. That's a fantastic way for
  a team to auto-regulate WIP.

Estimates have a bad reputation because they are never accurate, so putting
effort into coming up with numbers seems like a waste of time. The underlining
assumption is that you can't estimate a project properly. This is when
self-limiting WIP is so important, it's the core of the conversation about a
"just-in -time to do, doing, done" workflow. Now let me recap what we discussed
so far:

- You simplify your workflow as much as you can.
- You estimate work anyway, even if you don't share it.
- You have a self-limiting WIP.

If you analyse the data of such a process, you find a strong correlation between
the story size and the efficiency of the overall process. Specifically, the
smaller the average story, the more efficient the process. The reason seems
obvious without data too: smaller chunks of work get completed faster, they are
easier to review, ship, and test. Putting together the three ingredients and the
fact that smaller stories are better is key to accuracy. I like to sum it up
this way:

> If all we do takes half a day, we only need to know how many things we have to do
> in order to know when we complete a specific project.

The assumption is _strong_: everything you do can be broken down into the
smallest units of work possible. The benefit is _equally_ strong: you can
literally say in which day of the month you will be able to ship a non-trivial
feature.

In [Communication](3-communication.md), I mentioned that you should strive for
the smallest backlog possible, but not smaller. Let me expand on that.

A small backlog communicates well the idea that "this is what comes next". As it
often happens, good communication has good side-effects. Making the backlog as
small as possible but not smaller makes you see that stage starvation is
beneficial.

Usually the development workflow is a pipeline in which you push things from
left to right. A good just-in-time workflow works the other way around: work is
pulled from a previous stage once a given stage starves for more work. It seems
like a semantic difference between pushing and pulling work, but it's much
deeper than that. Starving stages start with starving the "to do" stage which
means work doesn't pile up. The less work there is to do, the less risks come
out of something else going wrong. When some work goes wrong, it travels back to
the previous stages of the process. This hurts the effort you put into limiting
work in progress. By definition, you can't predict unexpected problems so you
can't build a workflow that auto regulates its WIP from the perspective of the
backlog. You _want_ to put as little work as possible in the pipeline of work so
that the team can recover quickly from unplanned work. The ideal scenario is
that you are constantly about to run out of work but you never really do. It
enables a highly flexible relationship with product management too. The product
team can change plans whenever they want as long as the work they prepare is
ready to go.

## Project management

As a leader, you can help make sure that units of work are as small as possible.
Tiny units of work increase predictability. Everyone likes predictability. What
comes handy in a "just-in-time to do, doing, done" workflow is some project
management skills.

For someone leading a team of developers, project management means designing and
executing good rollout plans. We ship features and sometimes they are so big that we
need to plan for shipping them. For example, you may find yourself discussing the order
in which things need to go live during a code review. That's way too late. The
best moment to discuss a rollout plan is _before_ any of the work starts. I like
to remind people of this with a catchy quote:

> Weeks of coding can save you a few hours of planning.

People do underestimate the value of a little planning versus total
improvisation. I'm obsessed with tiny units of work not only because they can
bring predictability, but also because they help a great deal with basic project
management techniques. In order to manage a project efficiently, ask yourself a
few questions:

- What can be done in parallel?

  If you can't leverage the power of your team, then working in a team becomes
  frustrating.

- What's in the critical path and what isn't?

  Flag units of work that are critical to your goal. A unit of work can have only
  two states: critical or not. This point is crucial because it helps everyone:
  from external parties interested in the success of the release to the team members
  who want to know what's needed for a successful release. My favourite side-effect of flagging
  units of work as relevant to the critical path is that it minimises the risk
  of breaking a release for some silly reason. A good example, which I've seen
  in the real world more times that I can count, is failing to release an
  application on time because we forgot to localise some copy. Localisation may
  not be the hardest task to complete, but sometimes software doesn't
  work without it.

- How can you better schedule units of work?

  Once you have split work in critical and non critical, you already have two
  smaller sets of problems to solve. You focus first on the critical work. The
  way you prioritise your work _becomes_ your rollout plan.

These three questions all share an interesting property: the smaller the average unit
of work, the easier it is to answer each one of them. One reason more to be
obsessed with tiny units of work.

Thinking of releases as projects to manage gives you good indicators of the
seniority of your team. No matter what your definition of "senior
programmer" is, it's fair to assume that one trait senior people share is their ability to
get things done. It's hard to get things done by improvising. A little
planning goes a long way. In this sense, you can think of project management as
a mentoring tool, too. You can teach your teams to solve bigger problems using
simple project management techniques:

- Break down work into the smallest units possible, but not smaller.
- Separate work in critical and non critical.
- Prioritise so that the rollout plan makes sense.

## Tooling

Tooling seems out of place in a discussion about processes and product
development teams. But, especially in the long term, it has an impact on the
processes you build and on your culture. I often frame conversations about
tooling as a "building versus buying" conversation.

In most teams I worked, we didn't build any tooling for our workflow. We bought
bug tracking software, task management, chat system, and so on. It seemed obvious to me
that you should never build such a tool. My opinion changed a few
years ago while I was doing research into digital Kanban applications.

I have "my own definition" of Kanban, so the research was quite frustrating.
Tools did either too much or not enough. At some point, I started to consider
building the simplest tool that could implement Kanban the way I wanted. And it
was an intense fight with myself. I wasn't used to the idea of building workflow
tooling for my own teams. What convinced me at the time was a mix of frustration
for "X does too much, Y doesn't do enough" and my own obsession with Kaizen.

I've often found myself feeling limited by how much I could bend the tool at
hand while trying to continuously improve processes. In most teams, it takes
months to understand "how we use the bug tracker", even though it's the same
tool you were using a month ago in another company. Continuous improvement is too
vital to scaling processes in product development teams for anyone to overlook
opportunities.

Be aware that I'm not trying to suggest you should build workflow tooling all the time.
What I'm suggesting is that building _some_ tooling can act as a high
multiplying factor for improving your processes. As in every discussion about
"building versus buying", the expected return on investment should drive your
decision. Consider what to build for your workflow. A great starting point is a
small tool that visualises your workflow. Shed some light on those dark corners
in your processes, look for issues that come up too often.

A while ago, while leading a team, I noticed that people would ask at the stand-up
why a story was blocked literally every time we had a blocked story.
When we built our own digital Kanban application, we made it a requirement to leave
a comment every time someone blocked stories. The questions went away.

This is a tiny improvement, but I wouldn't underestimate its power. Such
improvements to your workflow allow individual contributors to change their
workflow. Now I invite you to reflect on how often in your career you found
yourself in a team that could change their workflow without hacking the tooling
at hand. I would bet it didn't happen that often. In my experience, most teams
give for granted that you only build tooling for your own infrastructure. You
automate builds or the way you deploy localised content to your website. I'm not
trying to undermine those initiatives, quite the opposite. They're important.
Encouraging the team to look for improvements in these areas is part of your job
as a leader. In practice, you won't need to do much about this because
developers feel the pain of tedious or error-prone tasks every day, much more
than their leaders. They work with these tools (or the lack of) every day. On
the other hand, people busy with day-to-day tasks have a harder time looking for ways to improve
workflow-related processes. There is even a cultural factor, a sort of social
pressure among developers to accept processes as they are because someone else
takes care of them. How many times have you heard a developer complain about issue
tracking tools? Probably plenty of times. But you probably don't hear so many
developers proposing a different tool. It's understandable because it would be
a complicated change for a company; even though it would still be more
constructive than just complaining. Even more rarely, developers propose changes to
the processes they are part of. And if they don't, that's on their leaders. It
is a leadership duty to make sure team members have the right to improve the way
they work.

Which tools you buy and how you use them, which tools you build and why you
choose to build them is part of your culture. Culture makes a big difference in
scaling processes. There's no process that works forever.
Processes could always be improved and the reason is simple: a
process changes slower than your needs do.

## On-call policy

On-call policies are given for granted. So much that there's a market for
applications that manage the process. It often goes like this:

- The company needs engineering support 24×7.
- Therefore someone needs to sacrifice their sleep.
- The company pays for it. Often not nearly enough.

Taking on-call policy for granted means assuming that no one can ever build software
that runs 24×7 without human support. What happened to us building software
that can run without humans looking at it all the time? Imagine we'd build
bridges that require engineers to constantly check that there aren't too many cars
on it. No one would ever want to cross such a bridge.

Our industry sets the bar for quality as low as it gets. Applications that
barely work are considered good enough. This is the underlying assumption
behind "24×7 engineering support". Relying too much on the on-call duty makes us lazy: we
build software knowing that it's OK that it might fail in production.

Instead, I suggest you focus your efforts on designing processes that make
on-call policies obsolete. There's probably no way to eliminate the on-call duty
entirely, but designing the best on-call policy is the wrong incentive for a good
software. Striving for software that doesn't break every day creates better
design incentives. Of course I'm not trying to trivialise the challenge. I know
this is a difficult problem, so let's break it down into smaller ones and try to
solve those.

Why does software stop working in production and needs human intervention?
Here's a list of reasons to get the conversation started:

- Resource saturation: a machine runs out of memory, processors, disk space,
  bandwidth.
- Third-party systems stop working.
- The failure use case wasn't covered by any test (manual or automated).

Designing a little process for each of these problems mitigates risk and makes
the systems more resilient. One effective approach is to design a checklist you
_insert_ into your workflow. For the sake of this discussion, let's assume you
have a stage in your workflow called "code review". When features are
ready for review, a minimum of N developers must approve the change before it
can move forward. Having a checklist in place to guard the code being deployed works
great in practice. What to put in such a checklist is too specific to your
workflow and your business, but here are some examples to get you started:

- Are third-party tools configured correctly in the env?
- Did we benchmark this query against users with more than X orders in our
  system?
- How many requests per second can this endpoint process?

Crafting a good checklist is hard, but don't worry too much about it. As
everything else, the best approach is to start small and iterate. Look out for
problems that come up often and ask yourself: how do we prevent this from
happening altogether?

> Designing great checklists is fun! It's like writing unit tests for processes.

The idea is to build small processes that keep raising the quality of the
systems we work on. Instead of incorporating on-call in your design process,
build a culture that fosters quality over speed and people over their code.
Working code, velocity, and stable systems will follow.

We all know that systems fail anyway sometimes, no matter how hard we try to
prevent it. There's a certain degree of randomness we have to account for in any
non-trivial production system. In practice, people may need to work overtime because of a
bad outage. So take that into account for your compensation
structure. Pay people handsomely for overtime. On-call is a disruptive policy,
it damages people's private life and the employer should pay accordingly for
it.
