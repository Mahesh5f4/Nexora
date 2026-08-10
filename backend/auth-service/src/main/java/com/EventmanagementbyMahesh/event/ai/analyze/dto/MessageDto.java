package com.EventmanagementbyMahesh.event.ai.analyze.dto;

import com.EventmanagementbyMahesh.event.ai.analyze.entity.MessageRole;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class MessageDto {
    private Long id;
    private MessageRole sender;
    private String content;
    private LocalDateTime createdAt;
}
