package com.EventmanagementbyMahesh.event.ai.chat.dto;

import com.EventmanagementbyMahesh.event.ai.chat.entity.MessageRole;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;
import com.EventmanagementbyMahesh.event.ai.document.dto.RagSourceDto;
@Data
public class MessageDto {
    private Long id;
    private MessageRole sender;
    private String content;
    private LocalDateTime createdAt;
    private List<RagSourceDto> sources = new ArrayList<>();
}
