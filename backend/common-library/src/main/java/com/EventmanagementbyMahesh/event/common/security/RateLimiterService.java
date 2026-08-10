package com.EventmanagementbyMahesh.event.common.security;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Service
public class RateLimiterService {

    private final StringRedisTemplate redisTemplate;
    private static final String RATE_LIMIT_PREFIX = "ratelimit:";

    public RateLimiterService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Checks if a user is allowed to make a request based on a limit per time window.
     * @param key Unique key (e.g., user email or IP)
     * @param limit Max requests allowed
     * @param windowSeconds Time window in seconds
     * @return true if allowed, false if limit exceeded
     */
    public boolean isAllowed(String key, int limit, int windowSeconds) {
        String redisKey = RATE_LIMIT_PREFIX + key;
        
        Long current = redisTemplate.opsForValue().increment(redisKey);
        
        if (current != null && current == 1) {
            redisTemplate.expire(redisKey, Duration.ofSeconds(windowSeconds));
        }
        
        return current != null && current <= limit;
    }

    public void reset(String key) {
        redisTemplate.delete(RATE_LIMIT_PREFIX + key);
    }
}
