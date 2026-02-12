# HTTP Endpoints with Kafka Streams Interactive Queries

A demonstration application showing how to expose Kafka Streams interactive queries through HTTP endpoints.

## Overview

Trivial example application built to accompany the article "HTTP endpoints with Kafka Streams Interactive queries". Shows how to create REST APIs that expose Kafka Streams state stores for real-time querying.

## Features

- Kafka Streams application with stateful processing
- Interactive queries exposed via HTTP endpoints
- Word count stream processing example
- Spring Boot integration for web endpoints

## Tech Stack

- Kotlin
- Apache Kafka & Kafka Streams
- Spring Boot
- Gradle build system

## Usage

1. Start Kafka cluster locally
2. Run the Spring Boot application
3. Send data to input topic
4. Query state stores via HTTP endpoints

## License

[MIT](/LICENSE) Copyright (c) [Luca Pette](https://lucapette.me)