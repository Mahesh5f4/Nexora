# Concurrency & Locking Strategy

## 1. Overview
EventHub uses a multi-layered concurrency control strategy to ensure data integrity during high-contention event booking scenarios.

## 2. Distributed Locking (Redis SETNX)
The first layer of defense is a distributed mutex implemented using Redis.

### The SETNX Flow
- **Key**: `seat_lock:{eventId}:{seatId}`
- **Value**: `userId` (or a unique request ID)
- **TTL**: 5 minutes (to prevent deadlocks if the application crashes).

### Success Flow
1. Request arrives at `BookingService`.
2. `redisTemplate.opsForValue().setIfAbsent(key, userId, 5, TimeUnit.MINUTES)` returns `true`.
3. Proceed to database transaction.

### Failure/Conflict Flow
1. `setIfAbsent` returns `false`.
2. System throws `SeatAlreadyHeldException`.
3. Controller returns `409 Conflict`.

## 3. Optimistic Locking (JPA @Version)
The second layer of defense is at the database level.

### Implementation
- The `Event` entity includes a `@Version` field.
- Every update to `availableSeats` increments this version.

### Conflict Handling
If two requests pass the Redis lock check simultaneously (e.g., due to lock expiration or network partition), the database update will fail with an `OptimisticLockException` if the version has changed.

## 4. Transaction Boundaries
All inventory updates are wrapped in `@Transactional(isolation = Isolation.READ_COMMITTED)`. This ensures that the state is consistent across the Redis lock release and MySQL commit.
