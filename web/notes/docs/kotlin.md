# Kotlin

Since March 2022, I've been learning [Kotlin](https://kotlinlang.org).

## General observations

There are too many testing libraries. I guess you could say it's a young language.

The inheritance syntax felt a little strange at first:

```kotlin
class Thing(words: List<String>)

class Subthing(words: List<String>, more: String): Thing(words)
```

There's some confusion around logging but I blame Java for it. [Kotlin
logging](https://github.com/MicroUtils/kotlin-logging) seems nice.

## Idioms

### Class methods

```kotlin
class Thing {
  companion object {
    fun hello() {
       println("hello")
    }
  }
}

Thing.hello() // hello
```

### Block method

I don't know if I have _invented_ this name but here's what I mean:

```kotlin
fun thing() = blockMethod {
  doSomething()
}
```

It makes function definitions (especially with coroutines) very readable.

Functions that return strings are a practical example of this:

```kotlin

override fun toString() = buildString {
  appendLine("one line $stuff")
  appendLine("another line with $more")
}
```

### Default block

Again not sure if I have _invented_ the name but here's what I mean:

```kotlin

// instead of doing this
val thing = if (maybeBlankThing.isBlank()) args.first() else maybeBlankThing

//do this

val thing = maybeBlankThing.ifBlank { args.first() }
```

### Singleton pattern

It's really nice when you don't have constructor parameters:

```kotlin
object ThingContainer {
  private thing = Thing()
  init {
    // do something with thing
  }
  fun get(): Thing = thing
}
```

## gRPC

I knew this was going to be a little painful. But in the end I got the thing up
and running in a couple of hours.

I also run into this [issue](https://github.com/grpc/grpc-java/issues/8981) yay.

## Ktor

This framework looks very interesting. Some ideas are fresh especially for the
Java world. It feels like kotlin itself: in a sweet spot between Rails (Ruby)
and Spring (Java).

## Meta-programming

I wrote a [configuration library](see
https://github.com/typestreamio/typestream/tree/main/libs/konfig). Here's how
the API looks like:

```kotlin
@KonfigSource(prefix = "server")
data class ServerConfig(val host: String, val port: Int)

@Test
fun `can load a simple config`() {
  class App(konfig: Konfig) {
    val serverConfig by konfig.inject<ServerConfig>()
  }

  val konfig  = Konfig("src/test/resources/application.properties")
  val app = App(konfig)

  assertThat(app.serverConfig.host, `is`("localhost"))
  assertThat(app.serverConfig.port, `is`(4242))
}
```

The library can also do "fancy" nested configs. Writing it has been pretty
interesting but I had to figure out too much on my own. Docs aren't great for
meta-programming.

I also played around with method extensions: [klogger.kt ·
GitHub](https://gist.github.com/lucapette/3dd7eca10c47de69864bac844b8d0d04).

## Coroutines

Coming from go didn't help. Maybe it even made it worse for me.

Goroutines felt much easier to start with (the pitch "add go to a function call"
is strong) but coroutines seem well thought through once you start to grasp what
structured concurrency is about.

I should have watched [this](https://www.youtube.com/watch?v=a3agLJQ6vt8) first.

## Extension-oriented design

The name comes from
[this](https://elizarov.medium.com/extension-oriented-design-13f4f27deaee)
article by Roman Elizarov.

At first I was a little sceptical about this because I come from Ruby and we
definitely used to abuse the feature there. I probably feel more comfortable
with it in Kotlin because it's a statically typed language.

Here's an example of how I'm using it:

```kotlin
private fun GenericRecord.toNamedValue(field: Schema.Field): NamedValue {
    return when (field.schema().type) {
        Schema.Type.STRING -> NamedValue(field.name(), StringValue(get(field.name()).toString()))
        Schema.Type.INT -> NamedValue(field.name(), IntValue(get(field.name()).toString().toInt()))
        else -> throw IllegalArgumentException("Unsupported type: ${field.schema().type}")
    }
}
```

I own `NamedValue` and its subclasses but I don't own `GenericRecord` since it
comes from the Avro official library. This extension method allows me to write
very nice code like:

```kotlin
  val values = mutableListOf<NamedValue>()

    genericRecord.schema.fields.forEach { avroField ->
        values.add(genericRecord.toNamedValue(avroField))
    }
```
