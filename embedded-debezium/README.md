# Embedded Debezium

A sample application demonstrating the Debezium Embedded Engine for capturing PostgreSQL database changes in real-time.

## Overview

Trivial example showcasing how to use the Debezium Embedded Engine to capture changes from a PostgreSQL database. Created while prototyping features for TypeStream.

## Features

- Real-time change data capture (CDC) from PostgreSQL
- Debezium Embedded Engine integration
- Kotlin implementation
- PostgreSQL WAL (Write-Ahead Log) monitoring

## Setup

1. Ensure PostgreSQL is installed and running
2. Run `./scripts/setup.sh` to initialize the database
3. Verify PostgreSQL is accessible at `localhost:5432`
4. Open the project in IntelliJ IDEA

By default, the application connects to PostgreSQL using your username with no password. Modify connection properties in `src/main/kotlin/Main.kt` if needed.

## Tech Stack

- Kotlin
- Debezium Embedded Engine
- PostgreSQL
- Gradle build system

## License

[MIT](/LICENSE) Copyright (c) [Luca Pette](https://lucapette.me)