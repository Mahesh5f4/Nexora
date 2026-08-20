package com.EventmanagementbyMahesh.event.ai.chat.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SendMessageRequest {
    @NotBlank(message = "Content cannot be blank")
    private String content;
    
    private boolean useWebSearch;
    private boolean forceRag;
    private String documentId;
    private String mode;
}
