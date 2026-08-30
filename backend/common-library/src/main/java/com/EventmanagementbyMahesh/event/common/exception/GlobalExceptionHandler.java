package com.EventmanagementbyMahesh.event.common.exception;

import com.EventmanagementbyMahesh.event.common.dto.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BaseException.class)
    public ResponseEntity<ErrorResponse> handleBaseException(BaseException ex) {
        String traceId = MDC.get("traceId");
        logger.error("[{}] Business Exception: {}", traceId, ex.getMessage());
        
        ErrorResponse error = new ErrorResponse(
                ex.getStatus().value(),
                ex.getErrorCode(),
                ex.getMessage(),
                traceId
        );
        return new ResponseEntity<>(error, ex.getStatus());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex) {
        String traceId = MDC.get("traceId");
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        logger.error("[{}] Validation Error: {}", traceId, errors);

        ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "VALIDATION_FAILED",
                "Input validation failed",
                traceId,
                errors
        );
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(org.springframework.security.access.AccessDeniedException ex) {
        String traceId = MDC.get("traceId");
        logger.error("[{}] Access Denied Exception: {}", traceId, ex.getMessage());
        ErrorResponse error = new ErrorResponse(
                HttpStatus.FORBIDDEN.value(),
                "FORBIDDEN",
                "You do not have permission to access this resource.",
                traceId
        );
        return new ResponseEntity<>(error, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(org.springframework.web.client.HttpStatusCodeException.class)
    public ResponseEntity<ErrorResponse> handleHttpStatusCodeException(org.springframework.web.client.HttpStatusCodeException ex) {
        String traceId = MDC.get("traceId");
        logger.error("[{}] HTTP Status Exception: {} - {}", traceId, ex.getStatusCode(), ex.getResponseBodyAsString());
        ErrorResponse error = new ErrorResponse(
                ex.getStatusCode().value(),
                "UPSTREAM_ERROR",
                ex.getMessage(),
                traceId
        );
        return new ResponseEntity<>(error, ex.getStatusCode());
    }

    @ExceptionHandler(org.springframework.web.context.request.async.AsyncRequestTimeoutException.class)
    public ResponseEntity<Void> handleAsyncRequestTimeoutException(org.springframework.web.context.request.async.AsyncRequestTimeoutException ex) {
        String traceId = MDC.get("traceId");
        logger.debug("[{}] Async SSE request completed or timed out gracefully", traceId);
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneralException(Exception ex) {
        String traceId = MDC.get("traceId");
        logger.error("[{}] Unexpected Error: ", traceId, ex);

        ErrorResponse error = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "INTERNAL_SERVER_ERROR",
                "An unexpected error occurred. Please contact support.",
                traceId
        );
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
