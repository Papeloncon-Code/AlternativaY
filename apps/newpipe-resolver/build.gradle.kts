plugins {
    java
    application
    id("com.github.johnrengelman.shadow") version "8.1.1"
}

group = "work.papelon.todotube"
version = "0.1.0"

java {
    toolchain { languageVersion.set(JavaLanguageVersion.of(17)) }
}

repositories {
    mavenCentral()
    maven { url = uri("https://jitpack.io") }
}

dependencies {
    implementation("com.github.teamnewpipe:NewPipeExtractor:v0.27.0")
    implementation("com.fasterxml.jackson.core:jackson-databind:2.18.2")

    testImplementation("org.junit.jupiter:junit-jupiter:5.11.4")
}

application {
    mainClass.set("work.papelon.todotube.Main")
}

tasks.test { useJUnitPlatform() }

tasks.shadowJar {
    archiveClassifier.set("all")
    mergeServiceFiles()
}

tasks.build { dependsOn(tasks.shadowJar) }
