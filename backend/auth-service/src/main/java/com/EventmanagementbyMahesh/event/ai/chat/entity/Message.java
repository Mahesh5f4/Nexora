package com.EventmanagementbyMahesh.event.ai.chat.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.EventmanagementbyMahesh.event.ai.document.dto.RagSourceDto;

@Entity
@Table(name = "ai_messages", indexes = {
        @Index(name = "idx_message_conversation", columnList = "conversation_id")
})
@Data
@NoArgsConstructor
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MessageRole sender;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<RagSourceDto> sources;
    
    // Helper to create easily
    public Message(Conversation conversation, MessageRole sender, String content) {
        this.conversation = conversation;
        this.sender = sender;
        this.content = content;
        this.createdAt = LocalDateTime.now();
    }
}
