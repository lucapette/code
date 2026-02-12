---
title: "Utility Modules Aren't Useful"
description: "Why I favour small purpose driven modules over big utility ones."
date: 2022-06-22T08:56:02+02:00
tags:
  - programming
keywords:
  - programming
  - practice
---

If [someone](https://twitter.com/taniarascia) I admire encourages me to
[write](https://twitter.com/taniarascia/status/1522337429881081856) about
something, I will. So here we go again.

A few weeks ago, Tania asked an intriguing question on Twitter:

> Does anybody have a really good system for organizing utils/helpers? Or is it
> always just chaos?

My TL;DR answer to utility modules is "don't create them".

As I said on Twitter, it sounds cheeky but I'm not trying to be funny or clever
about it. I say "don't have utility modules" because I believe this approach
leads to a much better organisation of internal libraries.

It's hard for me to expand on such a nuanced topic on Twitter, so with Tania's
encouragement, I've decided to write about it.

## It's always chaos

If you do have a utility module, it's always chaos. I definitely agree with
Tania on that.

The problem with a catch-all solution is that it brings in a variety of
well-known problems (not a big fan of the word "anti-pattern" but I can see why
someone else would use it here).

Once a utility module is in place, people will find it easier to add "one more
function" there instead of introducing a new one. So, over time, you'll end up
with one giant module that exhibits a lot of problems:

- There're all kinds of unrelated code in the same place. You will need to
  change the same library very often. Depending on how your CI/CD pipeline
  works, it's at least inefficient and at worst very costly.
- Given that lots of code is unrelated, you'll also end up with very different
  abstraction levels in the same library.
- Most of the codebase will use just a few functions from the utility module but
  still depend on one large library. This makes your dependency graph rather
  unhelpful. You can't gain much of an insight into a specific part of the
  codebase knowing that it depends on the utility module. Because, well, almost
  everything does anyway.

So if utility modules are a problem, what's a better approach? After all,
reusing code is a fundamental abstraction we can't do away with.

You want to eliminate the catch-all nature from the equation. Trivially put,
instead of doing `utils.TrimLeft`, do `StringExtension.TrimLeft`.

You want to go from a catch-all utility module to many little purpose-specific
libraries.

In a way, my answer is somewhat funny because you can read it as "have lots of
utility modules".

I won't try to provide code samples as they'd make sense only in the context of
the language they're written in. Libraries tend to be very idiomatic, so the way
you reuse code is tightly connected to the nature of the language.

One concrete example: languages like Ruby or Kotlin allow to you to do
[extension oriented
design](https://elizarov.medium.com/extension-oriented-design-13f4f27deaee).
That's really different from the way you would reuse code in, say, Golang or
Java.

To keep things practical, I'll discuss both the scenario in which you already
have catch-all utility modules and the one in which you don't.

## If you have them, get rid of them

It's never too late to get rid of a big catch-all utility module. It's a healthy
way to reduce technical debt.

The goal is to break down a big module into smaller purpose-driven modules. In
practice, it means a few things. Let's go over them one by one.

Some smaller candidate modules will be immediately obvious. The most common deal
with strings and dates. They're also the easiest to extract.

I start with these obvious modules so that the setup cost of a new library can
be absorbed without too much overhead. This cost which varies a lot depending on
the nature of the codebase. More on this later.

Once you're done extracting the obvious things, you'll dig deeper in the
remaining functions.

You will find functions that are used once or twice in the whole codebase. My
suggestion is to go with duplication rather than [the wrong
abstraction](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction).

Meaning that if a function is used only once or twice, I don't mind getting rid
of the abstraction all together and have a little duplication.

You will also run into some functions that are used a lot but have nothing to do
with each other. That is the "core" problem of having introduced a catch-all
library.

The approach I use here is to introduce a library for each function first. That
makes it easier for me to see what can be refactored to become part of the same
library.

In my experience, the hardest part of this process is naming. I keep it simple
and [name things what they do]({{< ref
"/writing/my-programming-principles#name-things-what-they-do" >}} "my
programming principles - name things what they do").

## If you don't have them, don't introduce them

It sounds easier than it actually is to never introduce a utility module. The
problem – as for extracting modules from a catch-all library – is the setup cost
of a new library.

In most codebases, adding an internal library is costly. There are many tasks
involved with hosting it and releasing new versions.

That's why developers tend to introduce a utility module. They pay for this
setup cost once and then run with it for a long time. And then they end up with
the giant ball of mud we've already discussed.

The first time you find yourself wanting to add an internal library, reflect on
this setup cost with the goal of minimising it for the future.

The cheaper the setup cost, the easier it will be to never introduce a catch-all
module.

Unfortunately, my advice here may not be practical depending on your context. My
favourite solution to this problem is to organise the whole codebase into a
mono-repository.

I have all kinds of reasons to prefer a mono-repository (enough for a "the
appeal of mono-repositories" article). The easiness of adding small,
purpose-specific internal libraries to the codebase is among the most important
reasons.

## Conclusion

I hope I managed to articulate the cheeky "best way to handle utility modules is
not to have them". I like this topic because the advice sounds reasonable to me
but, in reality, it's often met with a lot of scepticism.

It funny how in an industry where the only constant is change we're in fact
pretty resistant to it. This, however, is a topic for a different article.
