package com.EventmanagementbyMahesh.event.ai.gateway;

import com.EventmanagementbyMahesh.event.ai.exception.ProviderException;
import com.EventmanagementbyMahesh.event.common.dto.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackages = "com.EventmanagementbyMahesh.event.ai")
public class AiGatewayExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(AiGatewayExceptionHandler.class);

    @ExceptionHandler(ProviderException.class)
    public ResponseEntity<ErrorResponse> handleProviderException(ProviderException ex) {
        String traceId = MDC.get("traceId");
        if (traceId == null) {
            traceId = "N/A";
        }
        
        logger.error("[{}] AI Provider Exception: {}", traceId, ex.getMessage());

        ErrorResponse error = new ErrorResponse(
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                "AI_SERVICE_UNAVAILABLE",
                "AI service temporarily unavailable",
                traceId
        );
        return new ResponseEntity<>(error, HttpStatus.SERVICE_UNAVAILABLE);
    }
}
