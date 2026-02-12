import io.debezium.engine.DebeziumEngine
import io.debezium.engine.format.Json
import io.debezium.engine.format.KeyValueChangeEventFormat
import kotlinx.coroutines.cancelChildren
import kotlinx.coroutines.runBlocking
import sun.misc.Signal
import java.util.Properties
import java.util.UUID
import java.util.concurrent.Executors


fun props(name: String, table: String): Properties {
    val props = Properties()
    props["name"] = name

    props["connector.class"] = "io.debezium.connector.postgresql.PostgresConnector"
    props["offset.storage"] = "org.apache.kafka.connect.storage.FileOffsetBackingStore"
    props["offset.storage.file.filename"] = "/tmp/offsets.dat"
    props["offset.flush.interval.ms"] = "60000"

    props["database.hostname"] = "localhost"
    props["database.port"] = "5432"
    props["database.user"] = System.getProperty("user.name")
    props["database.dbname"] = "embedded-debezium"

    props["plugin.name"] = "pgoutput"
    props["table.include.list"] = "public.${table}"
    props["topic.prefix"] = name
    return props
}


fun main(): Unit = runBlocking {
    Signal.handle(Signal("INT")) {
        this.coroutineContext.cancelChildren()
    }

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
}
