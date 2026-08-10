package com.EventmanagementbyMahesh.event.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDateTime;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {
    private int status;
    private String errorCode;
    private String message;
    private String traceId;
    private LocalDateTime timestamp;
    private Map<String, String> validationErrors;

    public ErrorResponse(int status, String errorCode, String message, String traceId) {
        this.status = status;
        this.errorCode = errorCode;
        this.message = message;
        this.traceId = traceId;
        this.timestamp = LocalDateTime.now();
    }

    public ErrorResponse(int status, String errorCode, String message, String traceId, Map<String, String> validationErrors) {
        this(status, errorCode, message, traceId);
        this.validationErrors = validationErrors;
    }

    // Getters
    public int getStatus() { return status; }
    public String getErrorCode() { return errorCode; }
    public String getMessage() { return message; }
    public String getTraceId() { return traceId; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public Map<String, String> getValidationErrors() { return validationErrors; }
}
