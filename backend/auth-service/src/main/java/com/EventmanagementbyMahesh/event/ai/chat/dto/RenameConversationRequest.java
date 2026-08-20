package com.EventmanagementbyMahesh.event.ai.chat.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RenameConversationRequest {
    @NotBlank(message = "New title is required")
    private String newTitle;
}
