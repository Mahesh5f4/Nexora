package com.EventmanagementbyMahesh.event.ai.chat.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ConversationDto {
    private Long id;
    private String title;
    private String role;
    private LocalDateTime updatedAt;
}
