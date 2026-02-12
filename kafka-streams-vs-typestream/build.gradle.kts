plugins {
    id("java")
    id("application")
    id("com.github.davidmc24.gradle.plugin.avro") version "1.5.0"
}

group = "me.lucapette"
version = "1.0-SNAPSHOT"

repositories {
    mavenCentral()
    maven("https://packages.confluent.io/maven/")
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

application {
    mainClass = "me.lucapette.Main"
}

dependencies {
    implementation("org.apache.kafka:kafka-streams:3.5.0")
    implementation("org.apache.avro:avro:1.11.3")

    implementation("io.confluent:kafka-avro-serializer:7.5.0")
    implementation("io.confluent:kafka-streams-avro-serde:7.5.0")
    implementation("org.slf4j:slf4j-api:1.7.32")
    implementation("org.slf4j:slf4j-simple:1.7.32")
}
