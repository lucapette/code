---
tags:
  - books
  - rspec
date: "2011-09-01T00:00:00Z"
description: Published by The Pragmatic Programmer in December 2010
keywords: the rspec book, ruby, book review, David Chelimsky, tdd, bdd, cucumber
title: A review of The RSpec Book
---

As usual, my considerations grouped by chapter:

### Introduction

The book starts with an introduction to the reasons behind BDD. It's a cool
introduction, short and clear. It's very useful if these topics are new for you.
if you need a spectacular and short introduction to BDD/TDD reasons watch
[this](http://vimeo.com/23061155) by [Corey Haines](http://coreyhaines.com/).

### Hello

The chapter follows the every-good-programming-book-starts-with-a-hello-world
rule. The author provides two examples: a spec with the class described by the
spec itself and a cucumber feature with its step definitions. If you already
know this stuff, you can skip the chapter.

### Describing Features

The chapter starts with a brief description of a game that guides the reader
throughout the book. The author explains the rules of the game in a nice way. He
describes how to extract stories from a project and write cucumber features and
scenarios. If you are new to cucumber you may find this chapter enlightening.

### Automating Features With Cucumber

Writing features and scenarios is like writing in less or more plain English.
That is nice but it's not strictly related to the quick feedback you need while
developing. So the author introduces you to step definitions and the various
parts of a step: given, when and then. A very clear explanation.

### Describing Code With RSpec

Cucumber is your friend when you are at the application level but, when you need
more granularity in your automatic tests, you would like to use RSpec. The
chapter presents the anatomy of a spec. The first paragraphs are interesting,
the point of view of the author is simple and clear. It explains details without
wasting your time. Then it goes on with the red/green technique and you’ll read
how to describe code behaviour (it's all about behaviour! a nice
[guy](http://dannorth.net/) would say). The chapter finishes with refactoring.
BDD gives you confidence with refactoring. That’s why I'm in love with it.

### Adding new features

When you add a new feature to a project, you may break both your features and
your specs. That's just fine, the author guides you through adding new features
and getting all things working quickly.

### Specifying an algorithm

This chapter is one of my favourites. It contains a number of important things.
First of all, it gives you a great piece of advice: start with the simplest
thing and then go on with the next simplest. Following this path you find nice
opportunities to refactor code without losing confidence. If you break
something, your specs will tell you. In short, rapid feedback is key.

### Refactoring with confidence

I've just said that the previous chapter is one of my favourites. Well, maybe
this one is even better. The author introduces you to code smells. A code smell
is "a hint that something has gone wrong somewhere in your code". It's a very
enjoyable chapter.

### Feeding back what we've learned

This is a wrapping up chapter that will show you how to experiment with code in
order to understand if there is room for improvements.

### The case for BDD

The part of the book devoted to BDD as a practice and a technique starts with
this chapter. The author gives you a bit of background about BDD, some
fundamental reasons behind it. A very readable chapter.

### Writing software that matters

The chapter goes beyond the reasons and gives you a concrete perspective of
how to apply BDD to projects.

### Code examples

The chapter covers the basic syntax of RSpec. It is very informative and I think
you'll enjoy it.

### RSpec::Expectations

I really liked this chapter because how the author explains things. It is
detailed and simple. In particular, I enjoyed the paragraph "How It works"
related to `have` methods.

### RSpec::Mocks

The chapter explores the world of mocks and stubs. It gives you a complete view
of names and options that you have when you need mocks.

### Tools and integration

RSpec has a nice executable, you can use it in a terminal. The author will
show the numerous options the executable has. Furthermore, he will give you a
short description of how to integrate RSpec with Rake, autotest and TextMate.

### Extending RSpec

RSpec is a polite Ruby citizen. This chapter covers the configurations you need
to know if you want to change the default behaviour of RSpec.

### Intro to Cucumber

The chapter gives you an effective introduction to the crucial aspects of
Cucumber.

### Cucumber details

This chapter goes straight to Cucumber details. Informative.

### BDD in Rails

Rails is everyone's framework. This chapter tells you how to get a good working
BDD cycle in Rails. Furthermore, it explains how to set up a Rails project with
RSpec.

### Cucumber in Rails

Like the previous chapter but for Cucumber.

### Simulating the browser with Webrat

Webrat is a nice DSL that helps you testing an application by _simulating the
browser_. It allows you to test how various layers of a Rails application work
together.

### Automating the browser with Webrat and Selenium

Webrat helps you to simulate the interaction with your application as if the
test were executed by a browser. However, this can't help with pages with rich
JavaScript interactions. Selenium can help with that and the chapter covers
basic aspects of integrating RSpec, Webrat and Selenium.

### Rails views

The chapter answers the question “Why do I have to test views in isolations?”
with nice reasons. It teaches you how to test your Rails views and how to mock
ActiveRecord Models.

### Rails controllers

As the previous one but for controllers.

### Rails Models

As the previous one but for models.

The book contains three appendixes and the first one is wonderful. You'll read a
nice introduction to a really wonderful project:
[rubyspec](http://rubyspec.org/). I strongly recommend you to take a look to
this project.

## What I liked most

This book covers topics I like very much, so it would be strange if I disliked
it. **You surely have to read this book** if you care about the topics covered.
What I really likes most is the care for details. For example, you'll find many
things covered with implementation details about the framework. This approach
increases the quality of a technical book and I'd like to see this kind of
details in other books too.

## What I disliked most

Nothing in particular. The book covers many other things apart from RSpec and,
ironically, this could be considered a flaw because you would prefer to stay
focused on the framework. However, the other topics are quite interesting to
read so I don't consider it to be a problem.
