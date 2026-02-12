# Change Data Capture

Change data capture (CDC) is a data integration technique that allows you to
track all the changes made to one or more tables in a relational database.

My primary use-case for CDC has been to sync data between a relational database
and a Kafka cluster. [Debezium](https://debezium.io) is the de-facto standard
way to do change data capture with Kafka. It integrates perfectly with the
ecosystem via Kafka connect.

## Debezium embedded

Recently (nov 2023), I found out that you can embed Debezium in your database
and couldn't help by trying it out. I took some notes along the way:

- The example in the [official
  docs](https://debezium.io/documentation/reference/stable/development/engine.html)
  is bare but functional.
- Obviously I run into the "Postgres server wal_level property must be 'logical'
  but is: 'replica'" error. I found a cool way of changing this in my dev
  postgres server:
  1. `ALTER SYSTEM SET wal_level = logical;`
  2. restart the server. Nice!
- I got a sample app running in no time:
  - The api is really nice, in fact you can change the format in which you receive the data with one line of code.
  - I wish there was a simple way to get the schema on its own (you can get it
    inside the data values itself but that's a little cumbersome)

The code looks like this:

```kotlin
val engine = DebeziumEngine.create(KeyValueChangeEventFormat.of(Json::class.java, Json::class.java))
        .using(props("engine-${UUID.randomUUID()}", "foo"))
        .notifying { record ->
            println(record)
        }.build()

    val executor = Executors.newSingleThreadExecutor()
    executor.execute(engine)

    Runtime.getRuntime().addShutdownHook(Thread {
        engine.close()
        executor.shutdown()
    })
```

I have an [example repo](https://github.com/lucapette/embedded-debezium) in
Kotlin if you want to play around with this.
