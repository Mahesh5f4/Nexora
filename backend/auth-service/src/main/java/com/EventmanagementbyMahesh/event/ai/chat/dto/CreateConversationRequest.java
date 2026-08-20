package com.EventmanagementbyMahesh.event.ai.chat.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateConversationRequest {
    @NotBlank(message = "Role is required")
    private String role;
}
