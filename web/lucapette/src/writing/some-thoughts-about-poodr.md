---
tags:
  - books
  - ruby
date: "2013-01-21T00:00:00Z"
description:
  A few thoughts about Practical Object-Oriented Design In Ruby by Sandi
  Metz. Published by Addison-Wesley in 2012
keywords: object-oriented programming, ruby, book, review, poodr, Sandi Metz
title: A few thoughts about Practical Object-Oriented Design In Ruby
---

Object-Oriented Design is a big part of the debate the Ruby community has had in
the last couple of years. People are writing blog posts, giving talks at
conferences and writing books on the subject.

OOD is nothing new, let's say it, but I think the status of many Rails projects
is the reason why it gained attention. Note that I'm not blaming the framework,
I'm making a living by using it so that would be a little silly. I'm saying that
if you're writing non trivial applications with Rails you can end up
asking yourself why everything looks so messed-up and is hard to maintain.

The first question I ask myself when I consider reading a technical book is: _is
this book worth my reading time?_ Well, I think ["Practical Object-Oriented
Design In Ruby"](http://www.poodr.info/) finally fills the gap for a need that
was pretty clear to me: explaining simple idiomatic OOD using simple examples.

So yes, the answer is yes. The book is worth reading, definitely.

# The book

OK, let me focus on the book itself now: it explains _simple_ OOD that _feels
like Ruby_ using _proper examples_. I divide my short review in three
paragraphs, one for each word I put in italics.

## Simple

[@sandimetz](https://twitter.com/sandimetz) writing is dead simple. Every
sentence is clear and well crafted. She often uses metaphors in the book and
most of them are perfect.

I'll share an example of a concept that I find crucial for basic understanding
of OOD. I think messages are the key concept of OOD; sending messages is the way
we make things work in OO languages. It's the way our objects interact and get
their job done.

The problem is that most of the time we keep thinking about the classes. We
write classes with methods and not objects that send messages. Sandi Metz, while
discussing how to find the public interface, came up with a paragraph that I
**love**:

> Changing the fundamental design question from "I know I need this class, what
> should it do?" to "I need to send this message, who should respond to it?" is
> the first step in that direction.

Where the direction is moving from class-based design to message-based design.
Then a masterpiece phrase:

> You don't send messages because you have objects, you have objects because you
> send messages.

That's the kind of awesomeness you'll find in the book. It's full of sentences
dense and simple at the same time. I think it's the first technical _Ruby_ book
in which I was actually highlighting sentences.

## Feels like Ruby

The techniques she presents throughout the book will always feel like Ruby code
and not something ported from a different language. I won't show you any example
because it would probably be out of context and won't make any difference. What
I can tell you is the feeling I had while reading the code in the book.
Generally, the code presented is simple and readable. It's exactly the Ruby code
that made me fell in love with the language a few years ago.

This is great for two reasons:

- It's the first time that I read code samples in Ruby on the subject that can
  help you shaping the API of your objects in a way they become polite citizens
  of the Ruby world.

- [@sandimetz](https://twitter.com/sandimetz) repeats it many times in the book
  that the goal of OOD is reducing costs. I can't agree more and this is the
  second reason why I think the code samples are great. While reading articles
  about OOD techniques in Ruby, most of the time I had some difficulties reading
  the code. There were too many levels of indirection or maybe just too many
  things. It felt wrong because Ruby has a clean and simple syntax so it should
  feel simple to read. In this book the examples are always readable.

## Proper examples

The author did a great job here. In a certain way this point is connected with
the previous one since most of the examples involve code.

The examples are abstract enough to let the author talk about the concepts
behind OOD techniques and concrete enough to show you good pieces of code. It
feels like a new new thing in the world of Ruby books.

There is another very good book out there about OOD in the Ruby community -
[Objects on Rails](http://objectsonrails.com/). The book is great and I
recommend it heartily. Unfortunately it uses a blog as an example. I talked to a
lot of people about the book and I got this sad response from many of them:
"Yeah, it's cool but man it's too much complicated for a blog". Of course,
that's not book's fault. It's just that we keep fixating on the code. Because
we're programmers. For this very reason, the code samples are crucial for the
success of this kind of book.

# My conclusion

If you're interested in the topic, this book will be a joy to read. I have a
very long queue of technical reading and I put this book in the middle of it
since I want to re-read it soon.

My suggestion is to read it. It's really worth the time. It's literally full of
great thoughts on the topic.
