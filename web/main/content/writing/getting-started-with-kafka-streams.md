---
favourite: true
title: "Getting Started With Kafka Streams"
description: "A primer to help you write your first Kafka Streams application."
date: "2022-10-20T00:00:00Z"
tags:
  - kafka
  - kafka streams
  - kotlin
keywords: kafka, kafka streams, kotlin
---

{{< message class="is-info">}} This article assumes the reader has a good grasp
of Kafka basic concepts: topics, consumers, consumer groups, offset management.

It's also a long read. You will find a table of contents right after the
introduction.{{</ message >}}

Ever since I started working with Kafka Streams, I have been noticing an
interesting, somewhat polarising phenomenon about the relationship developers
have with this library.

More often than not, they fall into one of the two opposite-side categories:

- They're experts. They know how this technology works, they appreciate its
  beautiful design, and its powerful ideas.
- They're intrigued by the praises, but they never manage to get into it. Their
  understanding of Kafka Streams is not sufficient. The library never "clicked"
  for them.

The goal of this article is to provide a starting point for the people in the
second category before they approach the official documentation.

Before we dive into the world of Kafka Streams, let me make a few premises.

First, the code samples are written in [Kotlin](https://kotlinlang.org/).

While I personally enjoy working with Kotlin, I'm not trying to make some point
about it by using it here. There's nothing special about it in the context of
Kafka Streams applications.

I chose Kotlin because its syntax is much terser than Java, so the few snippets
of code I'll share almost look like pseudocode; it'll keep the conversation
focused on the concepts.

Then a note about the official documentation: I'm **not** trying to undermine
the official documentation. I think it's awesome.

This article reflects on my experience of teaching the basics of Kafka Streams
to a number of very talented developers.

Over the years, I have been asked a few recurrent questions by developers who
had done a first pass at reading the official docs.

I've always found this interesting because the official docs provide all the
answers. Somehow a few concepts did not stick with people; hence the questions I
kept getting.

My (very) personal explanation is that Kafka Streams, due to the nature of the
problem it solves, comes with a lot of new concepts that overwhelm you a little
and make you miss the details.

This article introduces only a few concepts, hand-picked from the recurring
questions I received over the years.

Having said that, let's dive into it together, shall we?

- [What is Kafka Streams, exactly?](#what-is-kafka-streams-exactly)
- [How does the Kafka Streams API look like?](#how-does-the-kafka-streams-api-look-like)
  - [Why do we need a streaming library?](#why-do-we-need-a-streaming-library)
  - [Stateless computations](#stateless-computations)
  - [Dealing with state](#dealing-with-state)
    - [Ignore it](#ignore-it)
    - [Start over every time](#start-over-every-time)
    - [Use a persistent database](#use-a-persistent-database)
  - [Joining datasets](#joining-datasets)
- [How does Kafka Streams work?](#how-does-kafka-streams-work)
  - [Topologies and nodes](#topologies-and-nodes)
  - [Tasks and threads](#tasks-and-threads)
- [Next steps](#next-steps)

## What is Kafka Streams, exactly?

Kafka Streams is a Java library for writing streaming applications. Scala is
also officially supported.

Yes, it's that simple. Kafka Streams is _just_ a library.

Beware I'm not trying to undermine the effort that went into building it. It's a
remarkable piece of technology and I've been its biggest fan for a long time.

What I mean with _just_ is a very high praise.

I value simplicity and Kafka Streams uses a simple programming model: you write
your app, and then you run it. Just like any other app.

It's worth underlining because most of the tooling out there with similar
capabilities has a very different programming model.

Generally, you have to write an app and "give it" to a system and then this
system runs it. The development workflow is a little unfriendly, especially when
you compare it with adding a library to your existing app.

When I defined Kafka Streams earlier, I was deliberately vague about the second
part of the sentence that included "for streaming applications".

The Kafka Streams API is wonderfully familiar. The basic idea of its core API is
that it provides you with the same methods you're already using to operate on
collections.

Most high-level programming languages nowadays have methods to `map`
collections, `filter` them, `groupBy` them, and so on.

Kafka Streams takes these familiar APIs and applies them to stream processing.
It just works!

It means that you can express non-trivial streaming computations with a few
lines of code, which doesn't feel like it's solving some "special" streaming
problem.

Because the API looks so familiar, it's easier to reason about code and
introduce newcomers to a Kafka Streams application.

If you're like me, you're probably asking yourself "How does this work?". Don't
worry, I wrote a [whole section](#how-does-kafka-streams-work) about it.

Now that we know what Kafka Streams is, it's time to check out how its API
works.

## How does the Kafka Streams API look like?

Before showing any sample code, let's dig a little into why Kafka Streams
exists in the first place.

I feel like it's easier to make its core ideas "click" with a bit of a
high-level context.

### Why do we need a streaming library?

The main goal of Kafka Streams is to simplify the development and the operation
of streaming applications.

The question really is: what's the deal with streaming applications?

The "problem" with streaming applications is that they require a mental shift
from more "traditional" data approaches.

Dealing with unbounded datasets makes some concepts more relevant. You have to
actively care about them.

The most prominent concepts are:

- `Time` - You're dealing with "data in movement". As in the opposite of "data
  at rest" which is what you deal with when working with data in a "traditional"
  relational database.
- `State` - Since data is always moving, some common computations need to deal
  with state. For example: if you want to count how many incoming events have
  some specific property, you need to store data about past events.

Things get really interesting when you need to compute data on more than one
dataset at the same time (meaning you're combining both time and state).

How does Kafka Streams help you deal with these concepts?

Kafka Streams provides elegant abstractions that make working with these
concepts much easier. Which, in turn, helps you write performant and reliable
streaming applications.

It's time we look at some code.

A fair warning before we dig into code samples: I wouldn't read too much into
the design of these streaming apps. The examples are deliberately trivial and
purposely designed to discuss Kafka Streams concepts.

In the [next steps](#next-steps) section, I'll be sharing a list of pointers to
help you make Kafka Streams applications production-ready.

The code of the examples is available on
[github](https://github.com/lucapette/getting-started-with-kafka-streams/).

Each snippet I share is a self-contained example, so it should be easy enough to
play around with the code (the header comment should help).

The README contains instructions on how to load the testing data I've been using
for this article into a local Kafka installation if you want to follow along.

### Stateless computations

Now, for the sake of the conversation, let's imagine we have a `tweets` topic
where each record is (surprise!) a tweet.

Our first task is to take incoming tweets, make them shout, and send the
resulting tweets into a new topic.

Here's the code:

```kotlin
// Ex1.kt

streamsBuilder
  .stream<String, String>("tweets")
  .mapValues { tweet -> tweet.uppercase() }
  .to("tweets.shouting")
```

The instance `StreamsBuilder` is the starting point of the internal DSL Kafka
Streams provides. We are calling `stream` on it which creates an instance of a
`KStream`.

A `KStream` is what Kafka Streams calls a "record stream". It's the natural way
we think about streams of data. Each incoming record is appended to the stream
and therefore "flows" through the computation.

On the `KStream` instance, we
[fluently](https://www.martinfowler.com/bliki/FluentInterface.html) call
`mapValues` which does what it's called (there's also a `map` method. More on
this later) and then `to`, which is Kafka Streams' way to produce data into a
topic.

Since it's the first example, let me point out a few more general things.

First of all, it's worth noticing how little code it is compared to the consumer
group API. Kafka Streams is obviously abstracting away a lot of details.

Because the abstraction is so comfortable, I often find myself defaulting to
Kafka Streams even when it isn't strictly necessary.

Over the years, my strategy has become "always use Kafka Streams unless there
are very strict requirements". The Kafka Streams API makes me much more
productive.

Since the API is so familiar and concise, it's easy to reason about what's
happening here. There's no polling, no offset management, no loops. Even the
concept of "Kafka record" isn't mentioned.

It reads like "we're reading from a tweets stream, we're uppercasing each tweet,
and finally send the result to a shouting tweets topic". Almost plain English.

This is the core value that Kafka Streams provides to developers: it abstracts
away so that you can focus on your streaming computations.

Now let's assume that for some reason you need to filter out all the tweets with
mentions before shouting them. What would that look like?

We need a way to parse tweets for mentions. We could do it manually but there's
an official Java library called
[twitter-text](https://github.com/twitter/twitter-text).

Here's the code:

```kotlin
// Ex2.kt

val extractor = Extractor()

streamsBuilder
  .stream<String, String>("tweets")
  .filter { _, v -> extractor.extractMentionedScreennames(v).isEmpty() }
  .mapValues { tweet -> tweet.uppercase() }
  .to("tweets.no-mentions.shouting")
```

It only took one line of code to implement the requirement.

The code still reads like plain English. This library feels nice!

If you're new to Kafka Streams, you may be thinking "OK this is all nice but is
it really worth the trouble? I can do this with the official clients and it
would only look a little more verbose".

I'm personally a little resistant when it comes to adopting libraries with a
large API, so I'm sympathetic towards this argument.

Also, you'd be right.

If we stopped here, Kafka Streams would only feel like a nice-to-have. Most
likely, we'd keep using the official clients and be done with it.

So let's introduce some use cases where the difference is more evident.

### Dealing with state

Say we need to keep track of the most frequently used hashtags because we want
to display some "Trendy hashtags" somewhere.

Before we discuss how a Kafka Streams application solves this problem, let's
take a moment to think how we would approach this requirement if we were to
solve it without Kafka Streams.

We can meet the requirement this way:

1. Only consider tweets with hashtags.
2. Extract a list of hashtags from a tweet.
3. For each hashtag `E`:
   1. Increase a counter `C` of the tuple `<E, C>`.
   2. Output the updated tuple `<E, C>`.

`1.` and `2.` seem pretty straightforward. We use the official twitter client to
extract hashtags.

Maintaining a counter for each hashtag also seems pretty easy. We can use a Map.

For example, we could do something like this:

```kotlin
// Ex3.kt

val tweets = listOf(
  "incoming tweet #example #kafka",
  "another tweet with an #example hashtag",
  "#kafka is amazing",
)
val extractor = Extractor()
val countByHashtag = mutableMapOf<String, Long>()
tweets.flatMap { tweet ->
    extractor.extractHashtags(tweet)
}.forEach { hashtag -> 
    countByHashtag[hashtag] = countByHashtag.getOrDefault(hashtag, 0) + 1 
}

println(countByHashtag)
```

The core idea is that we maintain a map of the counts of the hashtags we have
seen so far (the variable `countByHashtag`). Every time we see a hashtag, we
increment its counter.

Fairly easy, right?

Well, not if we would be doing this in the context of a streaming application.

The problem with this approach is that we would be maintaining state in memory
and that isn't a viable solution for many reasons.

The most obvious problem is restarts. If (when) our application goes down, we
lose track of all the tweets we have seen so far.

I can think of three ways to deal with state:

#### Ignore it

This may work in some situations depending on the nature of the data and the
exact requirements you need to meet.

It's a pretty narrow space of use cases, but I'm sharing anyway this option has
been in my blind spot at times.

#### Start over every time

You re-process all the tweets you have already seen so your `countByHashtag` is
up-to-date and then you "keep going".

This only works with very small datasets. That is not so common in streaming
applications.

It's also not a future-proof solution given that restart times will grow
linearly with the size of the tweets topics.

#### Use a persistent database

You back up your `countByHashtag` variable with a persistent database so it can
resume work on restarts.

This is the most desirable solution and, life being life, it's also the hardest
to implement.

There are some challenging questions you need to answer:

- Which database is a good fit for this problem?
- What's a good strategy to store which offsets of which partitions have already
  been consumed? (otherwise we can't resume on restart)
- When the application restarts, what does the restoration process look like?
  How fast is it?
- What are we supposed to do when the database is unavailable?

I've seen lots of "solutions" for dealing with state, especially before Kafka
Streams was released. I think you can guess why I used quotes 😁

It's interesting to see how a relatively simple problem became tricky as soon as
we needed to deal with state. This is a pervasive problem in our industry which
somewhat justifies the "X-less" trend of the past decade. That's a story for
another article.

If you spend a minute pondering these questions, one interesting but
odd-sounding thought may cross your mind.

The challenge here is that we need to maintain state using some database. But...
Kafka is also a database, isn't it?

It does things its way, but it can _definitely_ store things. So what happens if
we use Kafka to keep track of things?

Kafka Streams _is_ the answer to this question.

That's another core selling point: if you use Kafka Streams, you won't have to
deal with any of these questions. Kafka Streams takes care of it all for you in
an elegant and transparent way.

But wait, there's more. It's the best part too.

If we use Kafka Streams to deal with state, the code looks like this:

```kotlin
// Ex4.kt

streamsBuilder.stream<String, String>("tweets")
  .flatMapValues { tweet -> extractor.extractHashtags(tweet) }
  .groupBy { _, hashtag -> hashtag }
  .count().toStream()
  .to("tweets.trends.by-topic")
```

All these questions we asked ourselves have been answered in the most elegant
way. They're all handled by the library.

This application correctly and automatically resumes on restarts. It can scale
horizontally by adding more instances of the same app (you'll find an "appId" in
the code samples, more on this later).

Except `toStream` (more on this in the next paragraph), the API
still looks familiar and still has that plain-English feel to it.

Kafka Streams is a remarkable library: you can focus on designing your
computations and let it deal with the details.

### Joining datasets

So far I omitted scenarios that involve more than one input topic. I wanted to
keep the focus of the conversation on stateless vs stateful computation.

While time is somewhat always present when discussing streaming applications
(due to the nature of the paradigm itself), things get more interesting (read as
"even trickier") when our computations involve multiple topics. Particularly
when we need to join them.

Joining two datasets is a common operation in relational databases. This
familiarity does not translate well to streaming because in streaming we mostly
deal with unbound datasets (data is "in motion" after all).

If _both_ datasets we want to join are _unbounded_, then we need to deal with
_windowing_. The idea being you join datasets on a condition (like the `on`
clause of a SQL join) over a specific time-frame. Since the data is unbounded,
you pick windows of time in which you join the datasets.

Windowed joins are complex. I won't discuss them here – a good introduction to
them would take as much as the rest of this article, which would make the
"getting started" idea of this article a lot less meaningful.

But let's look at a scenario where one dataset is unbounded and the other is
not, aka un-windowed joins.

That gives us the opportunity to get a feel for how joining looks like and to
point out a few other important details.

For the sake of this discussion, say we need to enhance our "Trendy hashtags"
list with a description of each hashtag. Something like this:

| Hashtag   | Description                  | Tweet count |
|-----------|------------------------------|-------------|
| Kafka     | The best database out there! | 2           |
| Book      | Reading improves your life   | 2           |
| Severance | Sci-fi at its best           | 1           |

We already have the "hashtag" and the "tweet count" data. We'll introduce a new
topic called `hashtags` for the descriptions so that we can join the data.

Here's how the code looks like:

```kotlin
val descriptions = streamsBuilder.table<String, String>("hashtags")

val hashtagsCount = streamsBuilder.stream<String, String>("tweets")
  .flatMapValues { tweet -> extractor.extractHashtags(tweet) }
  .groupBy { _, hashtag -> hashtag }
  .count()

hashtagsCount.join(descriptions) { count, description ->
  "$description - $count"
}.toStream().to("tweets.trends.by-topic-description")
```

As in the previous examples, the Kafka Streams API almost feels like plain
English. Let's go over the things.

First of all, there's a `table` method which creates an instance of `KTable`.

A `KTable` is a powerful abstraction Kafka Streams calls a changelog stream.

While record streams (what `KStream` abstracts) always append new records to
their dataset, changelog streams only do so if the record isn't present in the
dataset (it uses the record key to check presence).

When a record already exists, its value is updated with the most recent version.

This abstraction is really powerful and useful. You'll be using `KTable` a lot
once you start writing your own Kafka Streams application.

`KTable` is perfect for our use case because we want to join each hashtag with
their most recent description.

By choice, we're using an inner `join` as it helps us with moderation. If we
don't have a description for a given hashtag, we won't output its value (because
it won't join). Of course Kafka Streams provides a `leftJoin` method (and other
types of join as well).

The rest of the code is familiar to us because we're reusing the computation
from the previous example. The only difference is that before streaming out
results, we're now joining our group and count (also a `KTable`! Which is why we
need that `toStream` before we can `to` the records) with our description
`KTable`.

We map the joined data to a String for the sake of simplicity. It's a way to
defer discussing serialization to the last section of this article and keep
ourselves focused.

Last but not least, the most important consideration: Kafka Streams takes care
of managing _state and time_ for us.

Just think about it: how many things you'd need to take care of if you didn't
have a join API and you had to join this data manually?

It's a cool mental exercise that helps you understand how valuable Kafka Streams
really is.

The few examples I presented in this section merely scratch the surface of what
Kafka Streams can actually do.

I tried my best to keep it short (and obviously failed at that) so there are
lots of omissions. I'll provide a few [next steps](#next-steps) to cover some of
these omissions.

## How does Kafka Streams work?

So far I put a conscious effort into avoiding some "official" and "formal" terms
that are everywhere in the official docs and other online resources.

These terms are important but, in my opinion, they're too specific for a first
introduction to Kafka Streams.

Now that we've gone over some basic concepts, we're ready to dig a little deeper
into Kafka Streams vocabulary.

What's a better excuse than looking under the hood and seeing how Kafka Streams
does things?

### Topologies and nodes

When you write a Kafka Streams application, the skeleton of the code looks like
this:

```kotlin
val streamsBuilder = StreamsBuilder()

// your stream processing goes here

val topology = streamsBuilder.build()

val kafkaStreams = KafkaStreams(topology, streamsConfig)

kafkaStreams.start()
```

Let's go over these steps in detail:

- You create an instance of `StreamsBuilder`.
- You create and connect stream processing **nodes** by calling a fluent API
  (most often called the Kafka Streams DSL).
- You build a **topology** by calling `streamsBuilder.build()`.
- You create a `KafkaStreams` client.
- You call `streams.start()` to start your computation 🎉

Unsurprisingly, all the examples we've seen follow this structure. But we've
just introduced two new terms: topology and node.

Instead of coming up with my own definition, let me share the definition from
the official [Java
Docs](https://kafka.apache.org/33/javadoc/org/apache/kafka/streams/Topology.html):

> A topology is an acyclic graph of sources, processors, and sinks. A source is
> a node in the graph that consumes one or more Kafka topics and forwards them
> to its successor nodes. A processor is a node in the graph that receives input
> records from upstream nodes, processes the records, and optionally forwarding
> new records to one or all of its downstream nodes. Finally, a sink is a node
> in the graph that receives records from upstream nodes and writes them to a
> Kafka topic.

What the official docs are telling us is that when we create a Kafka Streams
application, we're building a topology (a graph).

A bunch of streaming nodes we connect together (via fluent API calls) _is_ our
streaming computation.

With these definitions in mind, we're ready to zoom in a little more.

### Tasks and threads

When you start a Kafka Streams application, the library does a lot of
"administrative" work for you.

Things like checking that all input topics are there, checking that joins are
correctly co-partitioned (more on this later).

Kafka Streams creates internal topics if needed, and starts a bunch of "admin"
threads to handle state stores (more on this later), stand-by replicas, and so
on.

Once the "admin" stuff is done, Kafka Streams starts processing incoming
records.

In order to achieve high-performance, the library breaks down the topology in
tasks (instances of `StreamTask`) using a number of input topics partitions.

The number of tasks is fixed and the assignment of partitions to tasks never
changes. That simplifies the job of the library – no coordination is needed to
work on these tasks.

The actual work is done by threads (instances of `StreamThread`). Each thread is
responsible for a number of tasks. The number of threads can be configured and
the upper limit (not enforced by the library) is the number of tasks.

This makes sense because you can't be doing more parallelism than the number of
input partitions you have.

Once started, each thread goes into a two-phase loop:

- First it does a familiar "poll phase". It consumes a number of records from
  input partitions and queues them for processing.
- Then it does de-queues and executes the actual processing.

This last step is where the abstraction ties everything together. If you look at
the source code of Kafka Streams, you'll see that each node class implements a
`process` method.

Kafka Streams uses the definition of the topology to correctly route "new
records to process" to the right node and call its corresponding `process`
method.

## Next steps

I wrote this article with the goal of extracting enough concepts out of Kafka
Streams so that newcomers could get a sense of how much the library can do for
them.

I can't say if I succeeded (you can, and your feedback would be highly
appreciated) but I know I left very relevant things out of the conversation.

All the examples I shared in this article are "real", meaning you can download
the [source
code](https://github.com/lucapette/getting-started-with-kafka-streams/), start a
Kafka cluster, and play around with them.

It's working code but it's far from being production grade.

While "production-grade Kafka Streams application" is its own article, I think I
can at least provide a bit of information here that may take a while for you to
come across otherwise.

The first thing that comes to mind is that we only worked with primitive types
(strings and numbers). In reality, you're more likely to run into more complex
data types and need to learn about
[Serdes](https://kafka.apache.org/33/documentation/streams/developer-guide/datatypes.html).

In our last example, I showcased a very specific type of join called `KTable` to
`KTable` join. There's much more to joining streams and the [official
docs](https://kafka.apache.org/33/documentation/streams/developer-guide/dsl-api.html#joining)
have a detailed explanation of join semantics.

I also only briefly mentioned
[windowing](https://kafka.apache.org/33/documentation/streams/developer-guide/dsl-api.html#windowing).
It's a complex and fascinating topic which, as I already said, would need its
own "getting started" article (nudge me about this, please!).

Another topic I also very briefly mentioned is
[co-partitioning](https://kafka.apache.org/33/documentation/streams/developer-guide/dsl-api.html#streams-developer-guide-dsl-joins-co-partitioning).
It's really important that you understand co-partitioning requirements before
you ship your first application to production. You may get very "funny"
surprises otherwise.

When we talked about state, we didn't discuss where Kafka Streams stores this
information. The place is called [local
store](https://kafka.apache.org/33/documentation/streams/architecture.html#streams_architecture_state).
The way Kafka Streams ensures your application can resume work on restart is by
backing these local stores with "internal topics".

Kafka Streams exposes an API to access these local stores. You can query this
local store via [interactive
queries](https://kafka.apache.org/33/documentation/streams/developer-guide/interactive-queries.html).

I wrote about how to write [HTTP endpoints with Kafka Streams Interactive
Queries]({{< ref
"/writing/http-endpoints-with-kafka-streams-interactive-queries" >}}). It's an
exciting (and advanced) feature that unlocks interesting use cases.

The easiest way to improve our examples would be to
[name](https://kafka.apache.org/33/documentation/streams/developer-guide/dsl-topology-naming.html)
all the nodes of our topologies. If we don't name them, Kafka Streams generates
the names itself and while they're somewhat helpful, the names are not exactly
human-readable.

Kafka Streams application scales horizontally in a nice way. We got a glimpse of
that when we discussed [tasks and threads](#tasks-and-threads).

You can start more threads on your Kafka Streams application but you can also
start [more
instances](https://kafka.apache.org/33/documentation/streams/developer-guide/running-app.html).

When I sat down the first time to write this article, my goal was to make it as
short as possible. Over the few writing sessions, it became increasingly clear
that the article wouldn't be short.

After all, the topic is so vast that there are entire books about Kafka Streams
(my personal recommendation is [Kafka Streams in
action](https://www.manning.com/books/kafka-streams-in-action)).

In fact, there's much more to it than I covered. From here, I would probably
start from reading the [developer guide for Kafka
Streams](https://kafka.apache.org/33/documentation/streams/developer-guide/).

{{< typestream >}}
