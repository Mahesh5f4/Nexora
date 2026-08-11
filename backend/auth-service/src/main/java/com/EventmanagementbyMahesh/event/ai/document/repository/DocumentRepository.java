package com.EventmanagementbyMahesh.event.ai.document.repository;

import com.EventmanagementbyMahesh.event.ai.document.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    
    List<Document> findAllByUserId(Long userId);
    
    Optional<Document> findByIdAndUserId(Long id, Long userId);
    
    void deleteByIdAndUserId(Long id, Long userId);
}
