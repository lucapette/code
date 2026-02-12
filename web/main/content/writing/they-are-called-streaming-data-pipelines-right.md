---
title: "They are called streaming data \"pipe\"lines... right?"
description: A brief history of TypeStream
date: 2023-12-12T10:32:28+01:00
tags:
  - kafka
  - kafka streams
  - typestream
keywords: kafka, kafka streams, typestream
---

The (long but what's new) article you're reading is the background story of
[TypeStream](https://github.com/typestreamio/typestream), an open-source
streaming platform that allows you to write and run typed data pipelines with a
minimal, familiar syntax. It's the tale of how an intuition I had almost a
decade ago developed into the three foundational ideas that make TypeStream look
like this:

```js
cat /dev/kafka/local/topics/page_views |
enrich { v -> http "https://api.country.is/#{$v.ip_address}" }
```

I tried my best to make sections independent but I recommend reading them in
order as they're connected to each other the way they're presented:

- [The first intuition](#the-first-intuition)
- [Data pipelines are UNIX pipelines](#data-pipelines-are-unix-pipelines)
- [Everything is a stream](#everything-is-a-stream)
- [It is called TypeStream for a reason](#it-is-called-typestream-for-a-reason)
- [The power of abstraction](#the-power-of-abstraction)
  - [Abstractions outlive implementations](#abstractions-outlive-implementations)
  - [I don't want to bash SQL but](#i-dont-want-to-bash-sql-but)
  - [Naming is hard](#naming-is-hard)

{{< message class="is-info">}}

TypeStream is a young project so it changes all the time. Some features are
already implemented and others are being worked on. The official TypeStream
[discord server](https://discord.gg/JHYsa3xd) is the best way to ask roadmap
questions.

{{</ message >}}

## The first intuition

Almost a decade ago, I was the CTO at Marley Spoon, a small and cool startup
making the best meal kit delivery service.

One day, this must have been spring of 2016, I was in a meeting with the
engineering and product leadership. We were discussing how to leverage Kafka so
that our teams could work more independently.

We had a web store and some batch jobs "producing" orders and a variety of
services "consuming" them to implement a variety of use-cases. Kafka acted as a
transport layer and a "api" between the two worlds via a change data capture
pipeline. I'm sure this architecture is familiar to many of you, especially now
that change data capture is widely known. Back then, it was a bit more novel so
my team was a little hesitant.

The consuming side of this architecture intrigued me: there were too many
abstraction levels between our conversation and our tooling. It felt clumsy and
inefficient to me.

Now before I explain what I mean with "abstraction levels" in the context of
that meeting, let me clarify that I'm specifically talking about abstraction in
the context of developer experience. The obvious point being that we didn't
create programming languages because they were better than assembly for the
machine. We did new abstractions to improve developer experience. They're
called "high level programming languages" exactly because they're several levels
of abstraction away from the machine needs.

Of course a mismatch between the abstraction level at which humans discuss some
technical problem and the one their tooling provides is to be expected. The
point is that the closer the two abstraction levels are, the more productive
humans can be.

Now that I clarified I'm talking about developer experience, let me go back to
the meeting where I first thought of this mismatch in the context of data
pipelines.

Here's the scenario: we streamed orders to Kafka with a rudimental (by today's
standards) change data capture pipeline. Almost no consumer needed every order,
most needed a subset of orders (things like "orders to ship", "orders to pack in
NL") or parts of a subset (things like "customer's emails of orders to ship",
"list of ingredients of orders to pack in NL").

Data operations like "orders to ship" and "list of ingredients of orders to pack
in NL" were conceptually simple. But, in practice, extracting data from Kafka
topics, process them, and then send them around to other services required us to
discuss lots of details. The serialization format of the data, the schema (what
if it changes?), the actual streaming application (what language we write this
in?). Everything about it felt very low level and broke our ability to think
about these problems at a high enough level of abstraction.

Looking at diagrams on a whiteboard I couldn't help but think that most of our
data pipelines were composable little functions. We could combine them by
calling each function on the result of the previous one. A more mathematically
inclined person would have explored this concept further but I'm a programmer so
I saw a different, I dare to say, more obvious metaphor at play. These little
functions you can call one after the other looked a lot like UNIX pipelines.
Each function type is a UNIX command that does one thing, calling them in
sequence is just a command pipe.

This intuition about abstraction level mismatch between tooling and data
operations lead me to ask myself what if we could express data pipelines like
UNIX pipelines? TypeStream is my answer to that question.

## Data pipelines are UNIX pipelines

If we had TypeStream back at MarleySpoon, getting orders to ship may look like
this:

```sh
let orders_to_ship=$(cat orders | grep [.state == 'to_ship'])
```

Getting emails something like this:

```sh
cat $orders_to_ship | cut .email
```

It felt right to me but it also confused me because, for the first time in my
career, I wanted to build something that I found both really obvious and pretty
hard to build. In fact, I didn't even try building a prototype back then. I had
no idea how to write my own programming language and Kafka Streams (which is
TypeStream only runtime right now, more on this later) was very young. Also, in
spring 2016, I knew nothing about Kafka Streams.

Nowadays, the experience got much better. Thanks to amazing progress of
technology like [Kafka
Streams](https://kafka.apache.org/documentation/streams/),
[ksqlDB](https://ksqldb.io/), and [flink](https://flink.apapche.org), you can
reason about streaming data pipelines at a much higher level.  The Kafka
community made great progress. We made big abstraction jumps from "here is the
consumer group api javadoc" to Kafka Streams, ksqlDB, flink (to name a few). The
thing is though... it's not high-level enough 🙃

What is high level enough then? Well, UNIX pipelines are almost English. That is
high level enough for me. This is TypeStream's first foundational idea: data
pipelines _are_ UNIX pipelines.

At some point last year, I decided I had to look at Kotlin more closely. The
project "write a bash-like pipe to Kafka Streams applications compiler" was the
kind of project I needed to learn the language. There's no direct connection
between Kotlin and TypeStream but I can't learn a new programming language
through fictional exercises. I need something complex enough I can go at it for
a few weeks in a row. So here I was, finally trying to go one more level up the
ladder of abstraction I already wanted all the way back in spring of 2016.

The first few weeks were really fun. I got to put in practice a big chunk of the
[Crafting interpreters](https://craftinginterpreters.com/), a magnificent book
that gets you started on writing a programming language and not on talking about
writing one. By the time I could compile trivial pipelines I had spent quite
some time thinking about TypeStream and discovered two more ideas that, together
with "data pipelines are UNIX pipelines", make the foundation of what TypeStream
is today.

## Everything is a stream

Because I'm a pretty sceptical person that likes to sabotage their own plans
(I'm fun like that), while prototyping TypeStream I found myself in a strange
two-step self-feeding feedback loop:

1. I asked myself something along the lines of "well if TypeStream were a good
idea, then you could do X but sure you can't, right?"
2. I immediately found solid answers via the "UNIX metaphor". I was happy for a
   minute and then back to 1.

This is where TypeStream's second foundational idea comes in. See, when I had
the intuition of expressing a pipeline like, say, "filter book by word count >
20k" as a UNIX pipe, I didn't go any further than imagining this:

```sh
cat /dev/kafka/cluster1/topics/books | grep [.word_count > 20_000]
```

By the time I had a working compiler and was running my first TypeStream
pipeline, I realized there was a second powerful idea hiding in plain sight: the
virtual filesystem.

> In UNIX, everything is a file. In TypeStream, everything is a stream.

It's obvious: the core metaphor doesn't work without a filesystem!

Addressing data sources as filesystem paths felt so natural that I didn't
immediately realize its profound implications. For example, how would you expect
to address a postgres table? Does `/dev/postgres/db1/tables/customers` look
reasonable? I think it does. When I pitch TypeStream to backend developers or
data engineers, this is completely obvious for them. There are no questions
about the general idea of how a "data mesh filesystem" should look like.

While it's natural to think of data sources as filesystem paths, it may be a
little harder to see how well this idea fits with typical data operations. For
example, you may want to expose data via a websocket this way:

```sh
cat /dev/kafka/cluster1/topics/books |
grep The                             |
cut .id .title > /media/websocket/server1/books_notifications
```

"mounting" external "media" works great, right? Think of
`/media/elastic/cluster1/index_01` or `/media/http/server1/endpoint`. Why not?
It looks so natural.

Now let me put these two foundational ideas together to imagine how TypeStream
would deal with some common scenario. For example: stream data out of a
relational database, apply some business filtering to it, send the filtered data
around. A concrete, trivial, real-world example of this scenario is sign-up flow
processes.

Here's how I imagine TypeStream taking care of capturing new users out of a
postgres database, publish them to some Kafka topic for later consumption, and
send a welcome email to new users via a transactional email service:

```sh
let new_users = $(cat /dev/postgres/tables/users | grep [.op == 'insert'])

cat $new_users > /dev/kafka/topics/users.new
cat $new_users | cut .id .email > /media/email/welcome
```

It's surprisingly succinct. But brevity isn't the focus, that's the accidental
benefit of good abstraction. The win is that TypeStream gives you clarity _and_
brevity. This example is very succinct but lost almost none of the clarity of
the natural language description.

The abstraction levels are now close enough that some tech already covers the
gap between TypeStream and natural language. GitHub Copilot, for example,
produces valid TypeStream pipelines from plain English comments very often! A
testament to the simplicity and validity of the core ideas behind TypeStream.

After all, I invented nothing and I take no credit: UNIX pipes were there long
before I was born.

## It is called TypeStream for a reason

At this point, if you may be wondering how does TypeStream take care of things
like `cat $new_users | cut .id .email`? What's the secret ingredient that makes
it so simple and succinct?

This is where the third foundational idea comes in. It may seem less relevant to
the conversation because it doesn't directly borrow (I mean steal) from UNIX.
On the other hand though, it's so important to the developer experience it gave
TypeStream its name.

TypeStream can type-check pipelines before you run them. It has a key-value
store where keys are filesystem paths and values are serialization format
independent schema types. A key value pair looks like this:

```properties
/dev/kafka/cluster1/topics/books=Struct[title: String, wordCount: Int]
```

So when you're trying to run the following pipeline:

```sh
cat /dev/kafka/cluster1/topics/books | grep [.name ~= "the"]
```

the compiler tells you "hey there's no name field on books" and spare you the
pain of finding out later in the process.

The types metadata also help TypeStream by allowing its user a notable omission
in their TypeStream pipelines: there's no mention of serialization formats
anywhere. Is this topic avro, protobuf, json schema? The question is irrelevant
to designing a data pipeline. If you know the shape of the data you're working
with, its serialization format _is_ irrelevant to you.

One day, while prototyping the type checker, I realized TypeStream had enough
metadata information to also do some type inference on data pipelines.

Since the compiler knows the schema type of each "path" and knows the effect of
each data operator on a schema type, it can infer the resulting schema types of
each pipeline. Consider these examples:

```sh
cat /dev/kafka/cluster1/topics/books | cut .id .title > /media/http/server1/endpoint
```

TypeStream can infer that the resulting schema type is something like
`Struct[id: String, title: String]` and produce reasonable JSON for the "HTTP
media". Again, it's about developer experience: you don't need to specify the
shape of the resulting data set, TypeStream can figure it out. It also works
with more complex pipelines. Consider a "typical" enrichment pipeline:

```js
cat /dev/kafka/cluster1/topics/page_views                  |
enrich {p -> http "https://api.country.is" | cut .country} |
wc --by .country
```

Here, the compiler calculates the resulting type by "merging" page views with
the shape of "something with a string country field" that the enrichment block
produces. And then use that resulting type to type-check that `--by .country`
option. If you'd be redirecting this pipeline to, say, a redis store, TypeStream
would use the resulting schema type to make an informed decision on which data
structure to create it. Once again, it's about developer experience: TypeStream
abstracts so many irrelevant details away by leveraging "ancient" programming
concepts like UNIX pipelines and filesystem paths.

## The power of abstraction

I want to conclude this article the way I started it: discussing abstractions.
While pitching TypeStream I learned that some powerful abstractions TypeStream
enables are not obvious. But they're equally important to the developer
experience so let me get to them.

### Abstractions outlive implementations

A [tweet](https://twitter.com/gunnarmorling/status/1716878504044998914) by
[Gunnar Morling](https://morling.dev):

> An interesting recurring theme in data infra: protocols/APIs outliving
> specific implementations. E.g. #Kafka wire protocol (#RedPanda, #WarpStream as
> alternative providers), S3 API (#MinIO, #Ceph, etc.), #Postgres protocol (too
> many to list even).

applies perfectly well to TypeStream which may not be obvious unless we consider
the implications of its technical implementation.

At its very core, TypeStream is a "remote compiler": you give it some bash-like
code and TypeStream compiles it into a Kafka Streams application and run that
for you.

The key point is that, exactly because it's a compiler, Kafka Streams is "just"
a runtime. A powerful and easy to use runtime which is why I started with it.
But it's not the only possible runtime. TypeStream could compile pipelines into
flink jobs, pulsar applications, google pub/sub pipelines, whatever. TypeStream
can outlive its runtime because it's also a small programming language so it can
abstract away the runtime for you. In fact, it already does: there's no mention
of Kafka Streams in a TypeStream pipeline.

### I don't want to bash SQL but

As [Sarah Catanzaro](https://twitter.com/sarahcat21) once said: [abstractions
matter](https://twitter.com/sarahcat21/status/1719025058734379196).

The way I read her remark is that abstractions greatly contribute to the
developer experience. The fewer new concepts you have to learn, the quicker
you'll get things done.

The argument here is: if you know UNIX pipelines, you know TypeStream. There are
no new abstractions. Pipes and redirections apply to data naturally. Files are
data. Streams are data. Almost nothing to learn.

There's also a bolder hidden claim here: UNIX pipelines are a _better_
abstraction for data pipelines than SQL-like languages are. The _right_
abstraction wins over "better" syntax.

TypeStream and SQL-like languages are more or less at the same abstraction level
but I think TypeStream fits the problem space better because of the three
foundation ideas I discussed:

- data pipelines are unix pipelines. Most UNIX commands have natural
  streaming/data operations counterpart (did you know there's a `join` command
  in UNIX? That's what I mean!)
- A virtual filesystem hides lots of details. You don't need any special syntax
  to configure/interact with external sources ("media mounting").
- TypeStream treats types like a strongly typed programming language would. It
  already has basic type checking and basic inference. In the future, it'll
  allow you, for example, to refactor data pipelines across a whole organization
  automatically. Just like your favourite strongly typed language does.

To be clear, I **love** SQL. There's nothing better in the scenario "I got this
data question, give me the answer?". I apply this principle to code too.
Meaning, no-orm for me. So I'm really not trying to bash SQL here, there's
nothing wrong with it. I'm saying they're called data _pipe_-lines so a
"pipe-oriented" (my term) language fits the problem better.

### Naming is hard

Telling people what TypeStream is in a few word has proven the most challenging
aspect of the journey so far. I'm not familiar with any good cultural
equivalent, meaning I can't say something like "TypeStream is X for streaming
data pipelines", so I struggle to find quick shortcuts. The unknown variable
here is unclear because TypeStream is a small programming language but also a
platform? I settled for this:

> TypeStream is an open-source streaming platform that allows you to write and
> run typed data pipelines with a minimal, familiar syntax.

This is a good first attempt at describing something that uses well-known
abstractions in a novel way. I say "naming is hard" because I'm not convinced
"platform" conveys well enough the abstraction TypeStream puts in place here.
TypeStream isn't _just_ a compiler. It is also an orchestrator for data
pipelines. The official TypeStream CLI has a run command that looks like this:

```sh
typestream run <source-code>
```

When you invoke this command, TypeStream compiles your code and, given there are
no errors (type-checking is nice!), it launches your pipeline inside a
Kubernetes job. The interesting bit here is that TypeStream abstracts the
runtime of your pipelines away. There's no mention anywhere in your source code
that it will run in production as a Kafka Streams application. That's because
Kafka Streams is _just_ a runtime and if your pipeline should run as, say, a
pulsar application, TypeStream will happily compile your source code to it and
run it for you.

Note that here I'm talking about a different idea than "just outliving" a
runtime. As a platform, "TypeStream" abstracts both _where_ and _how_ your data
pipelines runs. In theory, knowing the shape of your data and what to do with
them is all you need to write _and_ run a data pipeline. In practice, it's not
that easy. That's TypeStream core argument: it could so it should be that easy.
