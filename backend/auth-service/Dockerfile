# =============================================================
# Auth Service — Multi-Stage Dockerfile
# Build context: backend/ (parent directory)
# =============================================================

# ─── Stage 1: Build ───────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-17-alpine AS build
WORKDIR /app

# Step 1: Copy parent POM (defines the multi-module project)
COPY pom.xml ./
COPY common-library/pom.xml ./common-library/pom.xml
COPY auth-service/pom.xml ./auth-service/pom.xml

RUN mvn dependency:go-offline \
    -pl common-library,auth-service \
    -am \
    --no-transfer-progress \
    -q || true

# Step 5: Copy source code (cache busted on every source change)
COPY common-library/src ./common-library/src
COPY auth-service/src ./auth-service/src

# Step 6: Build auth-service and its dependency (common-library)
#         -pl: only process these modules
#         -am: also build dependency modules
RUN mvn clean package \
    -pl auth-service \
    -am \
    -Dmaven.test.skip=true \
    --no-transfer-progress

# ─── Stage 2: Runtime ─────────────────────────────────────────
# JRE-only image (~100MB smaller than full JDK)
FROM eclipse-temurin:17-jre-alpine AS runtime
WORKDIR /app

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only the final JAR from the build stage
COPY --from=build /app/auth-service/target/*.jar app.jar

RUN chown appuser:appgroup app.jar

USER appuser

EXPOSE 8081

# JVM tuning for containers:
#   UseContainerSupport     - respect cgroup memory limits (default in JDK 11+)
#   MaxRAMPercentage=75.0   - use up to 75% of container memory for heap
#   ExitOnOutOfMemoryError  - fail fast on OOM instead of thrashing
#   security.egd            - faster SecureRandom for token generation
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-XX:+ExitOnOutOfMemoryError", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
