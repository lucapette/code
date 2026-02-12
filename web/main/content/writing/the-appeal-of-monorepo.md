---
title: "The Appeal of Monorepo"
description: "or how I learned to stop worrying and love monorepo."
tags:
  - programming
  - monorepo
keywords:
  - programming
  - monorepo
date: 2022-09-23T09:09:51+02:00
---

{{< message class="is-info">}} This is a _long_ read. You will find a table of
contents right after the introduction. {{</ message >}}

Before I dive into what appeals to me and what doesn't about a monorepo approach,
let me share a definition from
[https://monorepo.tools](https://monorepo.tools/#what-is-a-monorepo):

> A monorepo is a single repository containing multiple distinct projects, with
> well-defined relationships.

It's a thoughtful sentence; it underlines both the co-location of different
projects and the meaningful relationship among them.

I'm happy with this definition as long as `project=code+docs`. I never forget
about the docs.

Fundamentally, what I find most compelling about the monorepo approach is a
combination of two ideas:

- Less is more.
- Co-locating all the projects in the same repo makes it easier to impose
  constraints on the whole codebase.

These two ideas are powerful in their simplicity but, as mentioned in the
wonderful book [How to take smart
notes](https://www.goodreads.com/book/show/34507927-how-to-take-smart-notes),
"taking simple ideas seriously" is a not as easy as it sounds.

Often enough when someone says _simple_, we hear _easy_. That is a perfect
starting point for this discussion.

Here's the table of contents if you prefer to jump to a specific section:

- [Simple ain't easy](#simple-aint-easy)
- [Setup costs](#setup-costs)
- [One version to rule them all](#one-version-to-rule-them-all)
- [Ch-ch-ch-ch-changes](#ch-ch-ch-ch-changes)
  - [Atomicity](#atomicity)
  - [Small is easy, big is possible](#small-is-easy-big-is-possible)
  - [Auto-generation](#auto-generation)
  - [Increased visibility](#increased-visibility)
  - [CI \& CD](#ci--cd)
- [To mono or not to mono? Which build tool is the question](#to-mono-or-not-to-mono-which-build-tool-is-the-question)

## Simple ain't easy

Conceptually, going monorepo seems pretty straightforward. You only need to put
all your code into one repository, right?

In reality, there are many things to take into account if you want to reap all
its benefits.

If you have an old codebase with lots of projects, the migration to a monorepo
is not trivial. Each repository has its own little world of configuration,
version control history, and so on.

In most cases, there's also an educational cost. Monorepo is not as common as it
could be. Many developers, especially those that only worked in early-stage
startups, may have never worked with a monorepo before.

The irony of this is that early-stage startups would benefit quite a lot from
the simplicity of a monorepo – even if they would not use any particular
technique or tool.

Literally just having all the code in one place helps. More on this later.

The most difficult part of going monorepo is the tooling which is why I
structured the article so that the discussion about tooling is towards the end.

It's easier to talk about tooling once I discussed some benefits of this
approach.

Let's start where a new project would start: setting it up.

## Setup costs

There's a lot going on when creating a new project. A typical setup involves
implementing what I call "project infrastructure":

- Build scripts
- Test scripts
- Deployment scripts
- Permissions for version control

It doesn't seem much, but it adds up very quickly in a growing organisation. On
top of that, it's mostly done by copy and paste of an existing setup.

The problem with a polyrepo (as in the opposite of a monorepo. I stole the
naming from [https://monorepo.tools](https://monorepo.tools)) is that the setup
cost doesn't decrease as much as you'd expect from a copy and paste process (or
maybe exactly because of that?).

Furthermore, any update to the project infrastructure needs to be manually
replicated to any relevant project.

The monorepo approach is quite different.

First off, there are no setup costs for version control. New projects end up in
the same repository you're already using. It seems too obvious but I'd be
surprised to hear that you've never seen wasted time because of faulty
permissions setup.

Build, test, and deployment scripts costs decrease over time if you keep using
the same languages and framework. You're not copy and pasting setup, you're
using the existing setup.

The difference with a polyrepo here is staggering. Imagine you'd do with code
what you do with a polyrepo: always copying code instead of using
functions/modules/libraries. How does that sound?

Setup costs are still high when projects introduce new languages or frameworks
(often less of a problem that a language) to the repo.

Only some languages and frameworks receive "official" support in the monorepo
which is why teams tend to be more conservative regarding new technology.

Everyone wants to move fast but no one wants to spend days (sometimes weeks)
_before_ they can have a good developer experience using shiny new tech.

I'm using quotes for _official_ because I have seen this happening mostly
implicitly.

## One version to rule them all

As soon as a codebase consists of more than one project, questions about
versions should arise:

- Should project B use the same version of library X used in project A?
- Should we allow a new version of language Y in project C?

I say _should_ but, in my personal experience, they're never really asked in a
polyrepo setup. After all, each project is its own little world.

The larger the organisation (therefore the codebase), the more frequent
diverging versions are.

You may also run into the same problem within a monorepo. But the beauty of a
monorepo approach is that you can put simple, strong constraints in place with a
relatively low effort.

In this case, you can lift dependencies from projects and share them across
the whole code base. One version of a given dependency for all the dependent
projects.

Some [tools](https://github.com/bazelbuild/rules_jvm_external) work like this by
default. I would argue that they're "right" – this is a better default for
dependencies.

With this constraint in place, dependency versions literally can't diverge.

It's also true of language versions. For example, say your build tools only
support Java 17, then all the Java projects will support Java 17. Yes, it's that
simple.

This idea is often met with some resistance by developers because they find the
constraint too strong. In practice, I haven't met any good argument in favour of
multiple versions of the same language. There may be some exceptions for
dependencies.

This one-version approach is even more interesting with internal dependencies.
In a polyrepo setup, internal libraries must be treated as if they were a public
library. They need a release cycle.

In a monorepo setup, you can have the whole company on the latest and only
version of a given internal library.

This constraint ensures that whoever changes the API of an internal library is
also responsible for changing all caller sites.

One version of everything in the codebase will slow down adoption of new shiny
things. Which, of course, is a good thing.

Sometimes, however, certain upgrades have to happen really fast. The obvious
example is security upgrades of external dependencies.

In a polyrepo, you'd have to do the same thing in every single project relying
on a dependency.

In a monorepo, you bump the version, and you're good to go.

## Ch-ch-ch-ch-changes

I don't really need an excuse to squeeze the genius of [David
Bowie](https://www.youtube.com/watch?v=4BgF7Y3q-as) in a conversation about
monorepo, but I was genuinely thinking about him when I first drafted this
paragraph. So here we are.

Changing code is the most common operation any organisation executes on a daily
basis in their code base.

In my opinion, this is where a monorepo really shines.

### Atomicity

If all the code is in the same repo, then executing a change atomically becomes a
trivial operation compared to the same change in a polyrepo.

It's easy to underestimate the value of atomic changes, but they really simplify
many operations.

An example I like is code style conventions. Historically, I have been always
reluctant to discuss styling because these conversations felt goalless in a
polyrepo. It's often so expensive to change the whole codebase to a different
convention, you know you're not going to do it.

In a monorepo, these conversations feel different. If the team agrees on a new
convention, you're one commit away from changing the _whole_ code base to it.

The point here is not that a monorepo allows you to change code conventions
quickly; the point is that atomic changes give you options you don't have in a
polyrepo.

Another situation in which I've seen a staggering difference is ops-driven
changes. Let me provide an example to illustrate it.

Say you're deploying your applications on some Kubernetes clusters and co-locate
your deployment descriptors (a fancy name for an "ugly, big yaml file") with the
code of each project.

One day your operations team comes up with some custom resource definitions that
greatly improve the operations of your apps (think health checks, logs,
metrics). The challenge is that you need to change all your deployment
descriptors to benefit from these improvements.

In a polyrepo, you'd start thinking about some migration strategy: deprecate the
current descriptors, make a list of descriptors to change, change them one by
one. It's possible but it's not comfortable.

In a monorepo, your strategy would be very different. You'd prepare a commit
with all the new descriptors and ship it. Your operations team can do this
without any coordination with the rest of the organisation.

No migration strategy, no deprecation policy, no transition period. Yes, it's
that easy.

### Small is easy, big is possible

The fact that you can make however large, atomic changes in a monorepo makes
impossibly large changes possible.

My favourite example of this is how Stripe [migrated millions of lines of code
to TypeScript](https://stripe.com/blog/migrating-to-typescript).

Can you imagine carrying out this intrinsically complex migration while
having to do it in hundreds of repositories with as many pull-requests?

I can't really picture it.

The point is more general than this example though.

A monorepo is a number of known constraints about a codebase. Things like
"libraries are here", "all our JavaScript projects use yarn", "docs are always
valid markdown and in a docs directory at the root of each project" allow you to
design big changes to the code base you wouldn't even begin to imagine in a
polyrepo setup.

The point is that constraints unlock creativity. I believe this is valid well
outside the boundaries of a monorepo, but that's a different story.

Small changes also benefit from a monorepo approach.

Because all projects use the same "project infrastructure" (build, test,
deployment scripts, and so on), a developer can get on in a project, make a
small change, run its tests, lint its code, and finally submit a change request
without having to learn anything specific about the project apart from its code.

### Auto-generation

The most important constraint a monorepo gives you is that the code is all in
the same place. It is so obvious you must be wondering why I'm bringing it up
again.

While the fact itself is obvious, its long-term consequences aren't. Especially
to those that have never worked in a monorepo.

Let's start from the most staggering difference between a monorepo and a
polyrepo in the context of code generation: data formats and their [interface
description
language](https://en.wikipedia.org/wiki/Interface_description_language).

It's common for data formats to require generated code (the widely diffused
[protocol buffers](https://developers.google.com/protocol-buffers/) works like
that) and frankly speaking I can't imagine how this works in a polyrepo setup.
Submodules from version control? Some scripts that download a central version of
all types?

When it comes to data formats, a polyrepo just seems to be an unnecessary
complication.

In a monorepo, you have a top-level directory with all your definitions. Then
you have one auto-generated "library" for each programming language that needs
to use the data formats. And finally your projects depend on it. It feels like
it takes longer to explain that in plain English than to set it up.

Auto-generated artifacts are my favourite example of "the somewhat unintended
consequences of co-locating all the projects in the same repo".

There is a whole class of problems you wouldn't even think to solve with
auto-generated
code if you didn't have access to all the code at the same time from the same tools.
Maybe you wouldn't solve some of these problems at all.

Let me provide an example from my career to illustrate the point.

When I was working at [airy.co](https://airy.co/), we often ran into a trivial
but annoying operational problem.

Our platform was heavily based on Kafka so, often enough, we shipped new Kafka
Streams applications relying on topics that didn't exist in our production
clusters yet.

These applications would obviously crash on start 🙃. So, every time this
happened, we had to stop them, create the necessary topics manually (with the
right config!), and restart the applications.

We solved the problem by introducing a small application that found all our
topics used in the code base and generated topics creation scripts for us (with
the right config!).

You can check out its code
[here](https://github.com/airyhq/airy/blob/1b9874cf123c7531cf5cddbb3e52b3801557d5cf/infrastructure/tools/topics/src/main/java/co/airy/tools/topics/TopicsFinder.java)
(yay open source!).

This isn't rocket science but the point stands: we could only solve the problem
with a trivial approach (it's literally one Java class) because of the existing
constraints the monorepo gave us.

You can apply this idea to many things, not just code. It works well with assets
(like sharing images that have been optimised according to your needs),
translations (generating code-friendly `I18n` assets), documentation, and so on.

### Increased visibility

When working in an organisation with multiple teams, it's only natural to lose
some visibility over what other teams are doing.

There's nothing intrinsically wrong with this, and you could argue that it's
often a welcomed limitation. It allows team members to stay focused on their own
challenges.

On the other hand though, the more teams in an organisation, the more common it
is for different teams to solve the same problems multiple times, the more
communication infrastructure is needed (internal blog posts, lighting talks, and
so on) to keep a coherent vision going.

A polyrepo approach only makes this problem more evident: it's easy to miss work
in repositories you don't have anything to do with. Sometimes, even
unintentionally, you may not even see a repo because no one gives you access to
it.

In a monorepo, visibility works very differently. Everything is visible by
default, so you tend to have the opposite problem: too much information coming
your way.

In my experience, this is a far better trade-off because it allows for more
granular choices.

People can follow along a part of the system they don't work with with a minimal
effort. If they don't want to, they don't need to.

Putting all the code in the same repo also makes everything more discoverable.

You may not want to follow how your organisation does, say,
infrastructure-as-code on a daily basis, but it's great to have the option to
`cd` into `/infrastructure` and read the "internal" documentation when you get
curious.

This increased visibility also makes team members more emphatic with the rest of
the organisation because they can see the effort that goes into shipping some
features.

### CI & CD

In theory, it may be possible to continuously integrate a large code base in a
polyrepo setup. I just haven't seen that work in practice.

Every CI solution I have seen was some variation of an orchestration tool for
integration tests.

These "test all the things from all other repos" tools are fun to write. I
learned a lot by building a couple of them. But they don't work very well because
of the very nature of the problem they're trying to solve.

In a monorepo setup, continuous integration is significantly simpler.

First of all, if the languages involved are statically typed, feedback loops
tend to be really fast. Broken code won't even compile after all.

Writing these "test all the things" tools also becomes much easier because you
can rely on some specific constraints provided by the monorepo. Things like "all
Java code builds this way", "all the language X libraries are in `lib/x`", or
"you can run any web apps locally with this command" help a lot while writing
code for your test infrastructure.

In my experience, the simplest approach to continuous integration is [trunk
based development](https://trunkbaseddevelopment.com/) in a monorepo.

Honestly speaking, I don't think you can practically do continuous integration
in a polyrepo setup. It will always be slower than it should be. And this alone
is enough for me to _always_ choose a monorepo.

The difference between a polyrepo and a monorepo is also evident with CD.

In a polyrepo, CD is fine when you're working with one project. You push your
code, the CD pipeline picks it up, validates it, and deploys it. Simple enough.

This process isn't as good when multiple projects are involved.

It becomes somewhat of a manual process in which you push code to the different
projects involved in a specific order one after the other.

It's worth noticing the underlining problem: you can't really do atomic changes
to a system when multiple projects reside in different repositories.

In a monorepo, your workflow can look like this:

- A new "atomic" commit hits the main branch.
- The CD pipeline finds all the code that the commit affected.
- It calculates which projects depend on the affected code.
- It automatically deploys the projects in the right order.

A monorepo-friendly build tool can calculate [reverse
dependencies](https://bazel.build/query/language#rdeps) which is the tricky
part. Then a few lines of bash will glue the rest together and this "smart"
pipeline would be 15 lines of code or so.

Some tools, like [gradle](https://gradle.org/), can even detect changes
automatically and react accordingly.

On the other hand, I can't really think of a simple way to build this workflow
in a polyrepo setup.

My brain immediately dismisses whatever idea I come up with as too expensive,
too complicated. It's just not worth it.

## To mono or not to mono? Which build tool is the question

Over the course of my career, I chose to set up my teams with a monorepo
_almost_ every time I got the chance.

I say _almost_ because twice, even though I had already been pretty much
convinced a monorepo yields better long-term results than a polyrepo, I decided
against adopting a monorepo.

In both cases, what drove my decision what the lack of monorepo tooling for the
specific stack at hand. I came to regret the decision both times. I missed the
core benefits of going monorepo too much.

To understand a decision though, you have to look at its context and here it
means looking at how many languages and which languages specifically are
involved. This is what the conversation around tooling boils down to.

The experience will indeed vary a lot depending on which programming languages
are at play in the monorepo. Let me examine the possible scenarios.

The simplest scenario: everything is written in the same language.

If that's the case, then the support for a monorepo may be pretty good out of
the box. For example, TypeScript and Java have excellent tooling. If it's not
that good, a little scripting goes a long way.

It gets more complicated when more languages are involved. I see two different
scenarios:

- You have only two languages and both have excellent tooling. You can get away
  with gluing together the respective build tools with some scripting. It works,
  it's practical, and you get most of the monorepo benefits.
- You have a lot of languages so you need a build tool that is monorepo-friendly
  and polyglot at the same time.

Now we're at core of the question: which build tool should you choose if you
were to adopt a monorepo approach today?

My answer is quite grim. None of them is good enough for a clear-cut answer
because of their polarised JavaScript support: they either support _only_
JavaScript or they don't support it _at all_.

For example, an early-stage startup with a web product, an Android application,
and an iOS one would run into some complications adopting a monorepo because of
this.

On the other hand, using one build tool for the whole monorepo isn't a strict
requirement.

If you can have one build tool for all your languages, it's definitely better.

The most difficult challenge when adopting a monorepo in a truly polyglot
environment is being able to provide a consistent developer experience
regardless of the language.

Since build tools have different degrees of support for different languages, the
everyday experience will reflect that difference, and it will be your job to
cover that gap.

But if even you can't use one build tool for all your languages, you can (and my
point is you should) still go for a monorepo. You can slowly glue together
different parts as the need arises.

Putting all the code in the same repo and calling it a monorepo yields better
long-term results than a polyrepo. Simplicity will show its strength in the
little details of the every-day tasks.
