package com.EventmanagementbyMahesh.event.ai.chat.repository;

import com.EventmanagementbyMahesh.event.ai.chat.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findAllByConversationIdOrderByCreatedAtAsc(Long conversationId);
    
    Page<Message> findByConversationIdOrderByCreatedAtAsc(Long conversationId, Pageable pageable);
    
    // To fetch the most recent N messages, we order by createdAt DESC and limit using Pageable
    // Then the service will reverse them back to ASC.
    List<Message> findByConversationIdOrderByCreatedAtDesc(Long conversationId, Pageable pageable);
    
    void deleteAllByConversationId(Long conversationId);
}
