package com.EventmanagementbyMahesh.event.common.exception;

import org.springframework.http.HttpStatus;

public class BadRequestException extends BaseException {
    public BadRequestException(String message) {
        super(message, HttpStatus.BAD_REQUEST, "BAD_REQUEST");
    }
}
