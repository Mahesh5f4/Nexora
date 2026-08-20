package com.EventmanagementbyMahesh.event.ai.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.time.LocalDateTime;

@ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
public class UsageExhaustedException extends RuntimeException {
    
    private final LocalDateTime resetTime;

    public UsageExhaustedException(String message, LocalDateTime resetTime) {
        super(message);
        this.resetTime = resetTime;
    }

    public LocalDateTime getResetTime() {
        return resetTime;
    }
}
