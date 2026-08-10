package com.EventmanagementbyMahesh.event.common.security;

import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Primary
@Profile("test")
public class MockRateLimiterService extends RateLimiterService {
    
    public MockRateLimiterService() {
        super(null); // No RedisTemplate needed
    }

    @Override
    public boolean isAllowed(String key, int limit, int windowInSeconds) {
        return true; // Always allow in test profile
    }
}
