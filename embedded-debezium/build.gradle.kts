plugins {
    kotlin("jvm") version "1.9.20"
}

group = "me.lucapette"
version = "0.0.1"

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
    implementation("org.slf4j:slf4j-api:2.0.5")
    implementation("org.slf4j:slf4j-simple:2.0.5")
    implementation("io.debezium:debezium-api:2.4.2.Final")
    implementation("io.debezium:debezium-embedded:2.4.2.Final")
    implementation("io.debezium:debezium-connector-postgres:2.4.2.Final")
}
