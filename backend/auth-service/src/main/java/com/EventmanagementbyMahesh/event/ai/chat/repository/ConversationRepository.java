package com.EventmanagementbyMahesh.event.ai.chat.repository;

import com.EventmanagementbyMahesh.event.ai.chat.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, String> {
    List<Conversation> findAllByUserIdOrderByUpdatedAtDesc(Long userId);
    Optional<Conversation> findByIdAndUserId(String id, Long userId);
}
