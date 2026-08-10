# System Design & Architecture

## 1. Overview
EventHub is designed as a modular monolith with decoupled background processing. The architecture prioritizes data consistency and low-latency responses for the main booking thread.

## 2. Request Lifecycle

### Authentication Flow
1. User provides credentials.
2. `AuthService` validates against MySQL.
3. JWT signed with RSA256 private key.
4. Subsequent requests include JWT in `Authorization` header.
5. `JwtFilter` validates signature and populates `SecurityContext`.

### Async Processing Flow (RabbitMQ)
1. `BookingService` successfully commits a booking to MySQL.
2. `BookingPublisher` sends a `BookingMessage` to the `booking.exchange`.
3. RabbitMQ routes the message to the `notification.queue`.
4. `NotificationConsumer` (running in a separate thread) picks up the message.
5. Consumer triggers `PdfService` and `EmailService`.

## 3. Caching Strategy
- **Type**: Look-aside caching with Redis.
- **TTL**: 10 minutes for event metadata.
- **Eviction**: Cache is evicted or updated on event updates/deletes to prevent stale data.

## 4. Monitoring & Observability
- **Spring Actuator**: Provides health, info, and metrics endpoints.
- **Prometheus**: Scrapes `/actuator/prometheus` for time-series data.
- **Micrometer**: Custom counters for successful bookings and collision rates.
