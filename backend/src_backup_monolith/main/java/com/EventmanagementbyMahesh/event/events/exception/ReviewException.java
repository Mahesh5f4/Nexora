package com.EventmanagementbyMahesh.event.events.exception;

import com.EventmanagementbyMahesh.event.common.exception.BaseException;
import org.springframework.http.HttpStatus;

public class ReviewException extends BaseException {
    public ReviewException(String message, HttpStatus status, String errorCode) {
        super(message, status, errorCode);
    }
}
