package com.EventmanagementbyMahesh.event.ai.analyze.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ConversationDto {
    private Long id;
    private String title;
    private String role;
    private LocalDateTime updatedAt;
}
