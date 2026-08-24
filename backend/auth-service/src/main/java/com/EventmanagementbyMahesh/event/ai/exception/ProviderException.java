package com.EventmanagementbyMahesh.event.ai.exception;

import com.EventmanagementbyMahesh.event.common.exception.BaseException;
import org.springframework.http.HttpStatus;

public class ProviderException extends BaseException {
    public ProviderException(String message) {
        super(message, HttpStatus.SERVICE_UNAVAILABLE, "PROVIDER_ERROR");
    }

    public ProviderException(String message, Throwable cause) {
        super(message, HttpStatus.SERVICE_UNAVAILABLE, "PROVIDER_ERROR");
    }
}
