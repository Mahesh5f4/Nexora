package com.EventmanagementbyMahesh.event.ai.analyze.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SendMessageRequest {
    @NotBlank(message = "Content cannot be blank")
    private String content;
}
