package com.EventmanagementbyMahesh.event.booking.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
public class SeatLockService {

    private final StringRedisTemplate redisTemplate;
    private static final String LOCK_KEY_PREFIX = "seat_lock:";
    private static final long LOCK_TIMEOUT_MINUTES = 5;

    public SeatLockService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public boolean lockSeat(Long eventId, String seatId, String userId) {
        try {
            String key = LOCK_KEY_PREFIX + eventId + ":" + seatId;
            Boolean success = redisTemplate.opsForValue().setIfAbsent(key, userId, LOCK_TIMEOUT_MINUTES, TimeUnit.MINUTES);
            return success != null && success;
        } catch (Exception e) {
            return false;
        }
    }

    public void unlockSeat(Long eventId, String seatId) {
        try {
            String key = LOCK_KEY_PREFIX + eventId + ":" + seatId;
            redisTemplate.delete(key);
        } catch (Exception e) {}
    }

    public void unlockMultipleSeats(Long eventId, List<String> seatIds) {
        try {
            List<String> keys = seatIds.stream()
                    .map(id -> LOCK_KEY_PREFIX + eventId + ":" + id)
                    .collect(Collectors.toList());
            redisTemplate.delete(keys);
        } catch (Exception e) {}
    }

    public List<String> getLockedSeats(Long eventId) {
        try {
            String pattern = LOCK_KEY_PREFIX + eventId + ":*";
            Set<String> keys = redisTemplate.keys(pattern);
            if (keys == null || keys.isEmpty()) return List.of();

            return keys.stream()
                    .map(key -> key.substring(key.lastIndexOf(":") + 1))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            return List.of();
        }
    }

    public List<String> getSeatsLockedByUser(Long eventId, String userId) {
        try {
            String pattern = LOCK_KEY_PREFIX + eventId + ":*";
            Set<String> keys = redisTemplate.keys(pattern);
            if (keys == null || keys.isEmpty()) return List.of();

            return keys.stream()
                    .filter(key -> userId.equals(redisTemplate.opsForValue().get(key)))
                    .map(key -> key.substring(key.lastIndexOf(":") + 1))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            return List.of();
        }
    }
}
