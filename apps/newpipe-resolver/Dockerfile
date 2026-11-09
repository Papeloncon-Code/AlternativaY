FROM gradle:8.11.1-jdk17 AS build
WORKDIR /workspace
COPY settings.gradle.kts build.gradle.kts ./
COPY src ./src
RUN gradle --no-daemon clean test shadowJar

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /workspace/build/libs/todotube-newpipe-resolver-0.1.0-all.jar /app/app.jar
ENV PORT=8080
EXPOSE 8080
USER 10001
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
