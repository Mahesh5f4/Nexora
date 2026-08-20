package com.EventmanagementbyMahesh.event.ai.document.service;

import com.EventmanagementbyMahesh.event.ai.document.client.PythonAiServiceClient;
import com.EventmanagementbyMahesh.event.ai.document.entity.Document;
import com.EventmanagementbyMahesh.event.ai.document.entity.DocumentStatus;
import com.EventmanagementbyMahesh.event.ai.document.repository.DocumentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Service
public class DocumentService {
    
    private static final Logger log = LoggerFactory.getLogger(DocumentService.class);

    private final DocumentRepository documentRepository;
    private final PythonAiServiceClient pythonAiServiceClient;

    public DocumentService(DocumentRepository documentRepository, PythonAiServiceClient pythonAiServiceClient) {
        this.documentRepository = documentRepository;
        this.pythonAiServiceClient = pythonAiServiceClient;
    }

    @Transactional
    public Document uploadDocument(Long userId, MultipartFile file) throws IOException {
        // Basic validation
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        
        long maxSize = 10 * 1024 * 1024; // 10 MB
        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException("File size exceeds limit of 10MB");
        }

        Document doc = new Document(
                userId,
                file.getOriginalFilename(),
                file.getContentType(),
                file.getSize(),
                DocumentStatus.UPLOADED
        );
        doc = documentRepository.save(doc);

        // Read bytes synchronously while stream is available
        byte[] fileBytes = file.getBytes();

        // Process synchronously so it's ready for immediate RAG queries
        processDocumentSync(doc.getId(), fileBytes);

        return doc;
    }

    public void processDocumentSync(Long documentId, byte[] fileBytes) {
        Document doc = documentRepository.findById(documentId).orElse(null);
        if (doc == null) {
            return;
        }

        try {
            doc.setStatus(DocumentStatus.PROCESSING);
            documentRepository.save(doc);

            pythonAiServiceClient.indexDocument(doc, fileBytes);

            doc.setStatus(DocumentStatus.COMPLETED);
            documentRepository.save(doc);
        } catch (Exception e) {
            log.error("Failed to process document {}: {}", documentId, e.getMessage());
            doc.setStatus(DocumentStatus.FAILED);
            documentRepository.save(doc);
        }
    }

    @Transactional(readOnly = true)
    public List<Document> getUserDocuments(Long userId) {
        return documentRepository.findAllByUserId(userId);
    }

    @Transactional
    public void deleteDocument(Long documentId, Long userId) {
        Document doc = documentRepository.findByIdAndUserId(documentId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        try {
            pythonAiServiceClient.deleteDocument(documentId, userId);
        } catch (Exception e) {
            log.error("Failed to delete document vectors from Qdrant: {}", e.getMessage());
            // Proceed with deleting from PostgreSQL anyway to not leave orphaned DB records 
            // if Qdrant already doesn't have it or failed
        }

        documentRepository.delete(doc);
    }
}
