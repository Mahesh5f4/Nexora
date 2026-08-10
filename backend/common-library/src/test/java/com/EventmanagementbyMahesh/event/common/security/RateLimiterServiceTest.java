package com.EventmanagementbyMahesh.event.common.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RateLimiterServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private RateLimiterService rateLimiterService;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    void isAllowed_WhenFirstRequest_ShouldAllow() {
        when(valueOperations.increment(anyString())).thenReturn(1L);

        boolean allowed = rateLimiterService.isAllowed("user123", 5, 60);

        assertTrue(allowed);
        verify(redisTemplate).expire(anyString(), eq(Duration.ofSeconds(60)));
    }

    @Test
    void isAllowed_WhenUnderLimit_ShouldAllow() {
        when(valueOperations.increment(anyString())).thenReturn(3L);

        boolean allowed = rateLimiterService.isAllowed("user123", 5, 60);

        assertTrue(allowed);
        verify(redisTemplate, never()).expire(anyString(), any(Duration.class));
    }

    @Test
    void isAllowed_WhenOverLimit_ShouldReject() {
        when(valueOperations.increment(anyString())).thenReturn(6L);

        boolean allowed = rateLimiterService.isAllowed("user123", 5, 60);

        assertFalse(allowed);
        verify(redisTemplate, never()).expire(anyString(), any(Duration.class));
    }
}
