---
title: "HTTP endpoints with Kafka Streams Interactive Queries"
description: "How to build HTTP endpoints with Kafka Streams Interactive Queries"
date: "2022-04-03T00:00:00Z"
tags:
  - kafka
  - kafka streams
  - kotlin
keywords: kafka, kafka streams, kotlin
---

{{< message class="is-info">}}

Interactive queries are a somewhat advanced topic in the context of Kafka
Streams application, so this article assumes the reader knows the basics of
Kafka Streams.

If you'd like to learn more about Kafka Streams, check out [Getting started with
Kafka Streams]({{< ref "/writing/getting-started-with-kafka-streams" >}}).

{{</ message >}}

[Interactive
queries](https://kafka.apache.org/documentation/streams/developer-guide/interactive-queries.html)
enable Kafka Streams application to query their persistent local stores.

The Kafka Streams API also provides a mechanics to query the state of remote
application instances.

The feature enables us to build HTTP endpoints with interesting properties.
Since any architecture has its trade-offs, we'll discuss them once we've built a
simple interactive query endpoint. It's easier to go over pros and cons of this
approach with a concrete example in mind.

So what are we building here?

For the sake of the discussion, we'll imagine a _purposely_ trivial application:
we collect words from a Kafka topic and then expose a `/search` endpoint that
takes a word and returns its count.

This requirement gives us enough to discuss the underlining architecture of this
approach.

To build this application, we'll use [Kotlin](https://kotlinlang.org/) and
[Spring Boot](https://spring.io/projects/spring-boot).

I'm not trying to make some point about these tools by using them here. There's
nothing special about them in the context of Kafka Streams applications.

It's worth mentioning though that HTTP endpoints with interactive queries only
make sense on JVM as they're a feature of the official Kafka Streams library.

Here's the code of our topology:

```kotlin {linenos=true, hl_lines=[6]}
private fun buildTopology(): Topology {
    val builder = StreamsBuilder()

    builder.stream<String, String>("words", Consumed.`as`("words_input_topic"))
        .groupByKey(Grouped.`as`("group_by_word"))
        .count(Materialized.`as`("words_count"))

    val topology = builder.build()

    log.info(topology.describe().toString())

    return topology
}
```

Even though it's a simple topology, there are a few things to note:

- Each node of the topology is named. It's good practice: the [official
  documentation](https://kafka.apache.org/documentation/streams/developer-guide/dsl-topology-naming.html)
  does a great job explaining why.
- The log statement on line 10 is helpful especially in the early phases of
  developing a new Kafka Streams application.
- The highlighted line is where we're telling Kafka "hey I'm going to ask you
  about this store later by calling it `words_count`". We cannot write the search
  method without it.

Speaking of the search method, here's the code:

```kotlin
@PostMapping("/search")
fun search(@RequestBody input: SearchRequest): ResponseEntity<SearchResponse> {
    val store = kafkaStreams.store(
        StoreQueryParameters.fromNameAndType(
            "words_count",
            QueryableStoreTypes.keyValueStore<String, Long>()
        )
    )

    val count = store.get(input.query) ?: return ResponseEntity.notFound().build()

    return ResponseEntity.ok(SearchResponse(input.query, count))
}

//I like to put these classes at the end of the controller file when they're so small.
data class SearchRequest(val query: String)

data class SearchResponse(val word: String, val count: Long)
```

Easy enough. We're telling Kafka Streams "hey remember that store I asked you to
name for me? I'm going to need it now". Then `store.get(input.query)` gives us
the count of the word we're looking for. The operator `?:` is called the [elvis
operator](https://kotlinlang.org/docs/null-safety.html#elvis-operator) and is
Kotlin idiomatic way of saying "if X is not null then X otherwise Y". We're
using it here to return `404` when queried for a word we do not know anything
about.

Let's test this, shall we?

The first thing we need it to create the topic:

```sh
bin/kafka-topics.sh --bootstrap-server localhost:9092 --create --topic words --replication-factor 1 --partitions 3
Created topic words.
```

{{< message class="is-warning">}}

**Warning:** neither the code nor the settings presented are recommended for
production use.

Production readiness code and configuration would add too much detail and reduce
clarity.

At the end of the article, I provide a list of recommendations for
production-ready Kafka Streams applications.

{{< /message >}}

Now let's add some words to the topic:

```sh
# using https://github.com/httpie/httpie to send a POST request
# to an endpoint that I added to our application (you'll find the code in IngestionController.kt)
http localhost:8080/accept word=kafka

HTTP/1.1 200
Connection: keep-alive
Content-Length: 0
Date: Sat, 02 Apr 2022 07:16:16 GMT
Keep-Alive: timeout=60
# imagine more of this...
```

After playing around with the endpoint a little, the topic looked like this:

```sh
bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic words --from-beginning
kafka
kafka
kafka
kafka
kafka
kafka
franz
franz
franz
caste
caste
kafka
kafka
trail
castle
```

Now we can check the interactive query. It should give us `1` for `trail` and
`8` for `kafka`:

```sh
http localhost:8080/search query=trail
HTTP/1.1 200
Connection: keep-alive
Content-Type: application/json
Date: Sat, 02 Apr 2022 07:19:26 GMT
Keep-Alive: timeout=60
Transfer-Encoding: chunked

{
    "count": 1,
    "word": "trail"
}

http localhost:8080/search query=kafka
HTTP/1.1 200
Connection: keep-alive
Content-Type: application/json
Date: Sat, 02 Apr 2022 07:19:35 GMT
Keep-Alive: timeout=60
Transfer-Encoding: chunked

{
    "count": 8,
    "word": "kafka"
}
```

It works... right?

Well... not quite 😒

For this test, I run one application instance therefore the local store
contained _all_ the state.

Let's see what happens if we add one more instance.

To keep it simple, I run both instances on the same machine. The INSTANCE_ID
determines the name of the state directory:

```sh
SERVER_PORT=8081 INSTANCE_ID=1 java -jar build/libs/interactive-queries-0.0.1-SNAPSHOT.jar
```

After a quick rebalancing process, both apps are in running state, and we can
test the endpoint again:

```sh
http localhost:8080/search query=kafka
HTTP/1.1 404
Connection: keep-alive
Content-Length: 0
Date: Sat, 02 Apr 2022 08:18:13 GMT
Keep-Alive: timeout=60

http localhost:8081/search query=kafka
HTTP/1.1 200
Connection: keep-alive
Content-Type: application/json
Date: Sat, 02 Apr 2022 08:18:18 GMT
Keep-Alive: timeout=60
Transfer-Encoding: chunked

{
    "count": 8,
    "word": "kafka"
}
```

If we'd put a load balancer in front of our two instances right now, we'd get a
404 for around half the requests. Obviously the endpoint isn't really working.
Why?

In order to achieve data parallelism, Kafka Streams relies on the same ideas
(and implementation) of consumer groups.

If we run a Kafka Streams application with multiple instances, the local state
of each instance will contain only a a slice of the state (based on the
partitions it has assigned).

This is what we need to care when building an HTTP endpoint with interactive
queries. To make this work, we need to rewrite our search endpoint using the
[RPC
mechanism](https://kafka.apache.org/documentation/streams/developer-guide/interactive-queries.html#adding-an-rpc-layer-to-your-application)
Kafka Streams provides us.

It's a two-step process:

- We configure the RPC endpoint via `StreamsConfig.APPLICATION_SERVER_CONFIG` so
  that each instance tells the coordinator how other instances can reach them.

- We change the search endpoint to fetch the word count via the RPC endpoint
  when we detect the word requested is not available in the local store.

Here's the new search endpoint:

```kotlin
@PostMapping("/search")
    fun search(@RequestBody input: SearchRequest): ResponseEntity<SearchResponse> {
        val store = kafkaStreams.store(
            StoreQueryParameters.fromNameAndType(
                "words_count", QueryableStoreTypes.keyValueStore<String, Long>()
            )
        )

        val keyQueryMetadata =
            kafkaStreams.queryMetadataForKey("words_count", input.query, Serdes.String().serializer())

        return when (val activeHost = keyQueryMetadata.activeHost()) {
            HostInfo(config.rpcHost, config.rpcPort) -> {
                val count = store.get(input.query) ?: return ResponseEntity.notFound().build()
                ResponseEntity.ok(SearchResponse(input.query, count))
            }
            HostInfo.unavailable() -> ResponseEntity.notFound().build()
            else -> fetchViaRPC(activeHost, input)
        }
    }
```

It's a little more complicated now because it knows about other instances. Let's
see if it works:

```sh
# First we start two instances
SERVER_PORT=8080 INSTANCE_ID=0 java -jar build/libs/interactive-queries-0.0.1-SNAPSHOT.jar
SERVER_PORT=8081 INSTANCE_ID=1 java -jar build/libs/interactive-queries-0.0.1-SNAPSHOT.jar
# logs not shown... there's a lot of it in Kafka Streams applications :)

# Once both apps are in running state, we can test the endpoint again
http localhost:8080/search query=kafka
HTTP/1.1 200
Connection: keep-alive
Content-Type: application/json
Date: Sun, 03 Apr 2022 07:08:26 GMT
Keep-Alive: timeout=60
Transfer-Encoding: chunked

{
    "count": 8,
    "word": "kafka"
}
http localhost:8081/search query=kafka
HTTP/1.1 200
Connection: keep-alive
Content-Type: application/json
Date: Sun, 03 Apr 2022 07:08:30 GMT
Keep-Alive: timeout=60
Transfer-Encoding: chunked

{
    "count": 8,
    "word": "kafka"
}
```

It works now 🎉🎉🎉

We get a count no matter which instance we hit. So now we could put a load
balancer in front of them and clients could start querying for words.

Now that we know how an interactive query endpoint looks like, we're ready to go
over trade-offs.

An endpoint that uses interactive queries is _first of all_ a Kafka Streams
application so most considerations that apply for a Kafka Stream application
apply here. Such applications have a pretty peculiar deployment strategy. For
example, there's no way to do rolling restart. This strategy conflicts with how
Kafka Streams applications do parallelism. You can't really start a new version
of an app with new code _but_ the same `StreamsConfig.APPLICATION_ID_CONFIG`:
the app would immediately go into rebalancing mode to reassign some of the
partitions. So what are the options?

If your endpoint can afford a little downtime, you can just take it down and
start the updated application. Generally, restoration is really fast (thanks to
those persistent stores we use for interactive queries).

Often though even a little downtime might be problematic. In such cases, the
easiest way out is to deploy a new version of the application all together
(meaning with a new app id).

While I don't really advocate for "immutable deployment" in general, that's
probably the simplest strategy here. Also, it's worth noticing you must deploy
an new application _anyway_ in case you change the topology of your app.

Since you know upfront you will need to recompute the whole state sometimes, how
long this process takes is very relevant to the way you operate the endpoint.
Fortunately, it can be estimated with great confidence. You need to know your
end-to-end throughput (how long it takes a record to travel the whole topology
from input nodes till the terminal) and how many records you have in your input
topics. That's the whole formula.

While such an "immutable" strategy may feel too complicated (well it indeed is),
it enables interesting testing strategies.

For example, I often found myself writing scripts to compare the JSON response
of two different versions of an endpoint. That gave me very high confidence that
the new version did was working as expected.

Another interesting consequence of this strategy is that it often enables "wild"
experimentation with new versions. Because the increased confidence often leads
to leap changes in a topology, after all you can verify new versions with great
accuracy without impacting the production endpoint.

Operating interactive queries endpoint is almost the same operating a regular
Kafka Streams application:

- You definitely want to be looking at lag. After all, the main argument for
  having an interactive query endpoint is its "freshness".
- You want to keep an eye on the disk space of each instance. You'd be getting
  all kind of "interesting" failures if one of your interactive queries runs out
  of space.
- You want to continuously collect throughput metrics about your application.
  You can do that using the lag of internal topics as a proxy. Often that's a
  good indicator. Sometimes, the nature of a topology (especially when there's a
  lot of grouping going on) is such that the app will "naturally" slow down its
  throughput over time.

If you made it this far in the article, I would not be surprised if you're not
sure there are good use cases for interactive queries HTTP endpoints. After all
these applications seem pretty tricky to operate and deploy.

So here's a list of considerations that can help you orient yourself better:

- Despite the funny deployment strategy, a Kafka Streams application is still
  _just_ a bunch of Kafka consumers/producers. Meaning you can compute and serve
  pretty complex data, at "Kafka speed", while _not_ needing to operate any
  other store. It's hard to imagine you can achieve comparable performance with
  _just_ one store.
- Up to your number of partitions, you can just add more instances to improve
  parallel processing of your data.
- The local stores update really fast, so the endpoints we'll build respond to
  change quickly. If the endpoint does key lookups, you can keep response time
  always pretty low. Especially if you employ a fast RPC layer.
- Your applications are self-sufficient in terms of state. If you'd put all of
  your data in Kafka then you could stretch this idea quite a bit. You would end
  up with services that build their own state locally and do not need to talk to
  each other. Less dependencies, no shared state. One store remote store
  (Kafka), one local store (RocksDB): both handled kind of automatically by the
  fluent API Kafka Streams provides. To be fair, this last point deserves to be
  its own article. Nudge me if you're interested, it'll speed me up :)
- As long as all the information we need is available in some Kafka topic, we can
  build HTTP endpoints that do not depend on other endpoints (by querying them
  via HTTP). We avoid the traditional pain of a micro-services architecture
  where a service calls a service that calls a service and so on.
- We also avoid the usual headaches of a more traditional architecture where
  Kafka is used, at best, as a ingestion and transport layer where we move the
  data into a separate store (for example, Cassandra). Keeping the two stores in
  sync is a full time job. Relying on interactive queries has a much lighter
  impact on the infrastructure. There are fewer moving parts so less things will
  break.
- Kafka Streams uses persistent local stores _anyway_ for caching (so that
  restarting a Kafka Stream app does not have to read the whole computed state
  from internal topics). If you're building Kafka Streams applications, you can
  immediately rely on interactive queries (as long as you're on JVM).

The one use case where I think interactive queries endpoints are actually a bit
of a stretch is those situations in which your endpoint _always_ needs all of
the state to compute the response.

For example, imagine we'd change our `/search` endpoint so that it also needs to
return things like "top X words by count" or "least recurrent words of the
month".

In such cases, you'd always need to query all the instances which may turn a
little slow (or just make the response time of your endpoint unpredictable).

Having said that, I would consider building a separate interactive query for
such a use case if you know your system can afford to run the endpoint on a
single instance.

As I mentioned, the code and the settings I wrote for this article are not
recommended for production usage. So, as promised, here's a production checklist
for interactive queries endpoints:

- You want to setup your Kafka Streams application so that it's resilient to brokers outages:

```java
// from kafka streams in action. Great book!
Properties props = new Properties();
props.put(StreamsConfig.producerPrefix(
 ProducerConfig.RETRIES_CONFIG), Integer.MAX_VALUE);
props.put(StreamsConfig.producerPrefix(
 ProducerConfig.MAX_BLOCK_MS_CONFIG), Integer.MAX_VALUE);
props.put(StreamsConfig.REQUEST_TIMEOUT_MS_CONFIG, 305000);
props.put(StreamsConfig.consumerPrefix(
 ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG), Integer.MAX_VALUE);
```

- You want to do some [RocksDB
  tuning](https://github.com/facebook/rocksdb/wiki/RocksDB-Tuning-Guide).
- Kafka Streams stateful topologies come with internal topics. Often, it's
  helpful to do some manual tuning on them. The pointer here is "now you know
  that's an option to consider".
- The RPC mechanism we implemented for this article may not be the best for
  production especially if your fetching a relatively large amount of data
  (there's a lot of serialization overhead with a JSON via HTTP endpoint as
  RPC).
- You want integration tests. Put some data into input topics, wait a bit (this
  needs a little care), hit the endpoint and assert results. This will give you
  high confidence your endpoint is working as intended.
- The number of partitions you choose of the input topics is always relevant,
  especially so in an interactive queries endpoint.

I'm using the [demo app](https://github.com/lucapette/interactive-queries) we
built for this article as a Kotlin playground, so I will probably work on some of
these points myself. If you're interested, check the issues as I generally use
them as a TODO list and maybe give it a star :)

{{< typestream >}}
