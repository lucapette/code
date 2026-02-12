# Embedded Debezium

This project is a trivial example of how to use the [Debezium Embedded
Engine](https://debezium.io/documentation/reference/2.4/development/engine.html)
to capture changes from a postgres database.

I wrote it while prototyping a new feature for
[TypeStream](https://github.com/typestreamio/typestream).

## Setup

Assuming you have postgres installed, run [scripts/setup.sh](scripts/setup.sh)
before you open the project in intellij.

The code assumes you have a postgres database running on `localhost:5432` with
your username and no password. Check the props in
[Main.kt](src/main/kotlin/Main.kt) if you need to change this.

## License

[MIT](/LICENSE)
