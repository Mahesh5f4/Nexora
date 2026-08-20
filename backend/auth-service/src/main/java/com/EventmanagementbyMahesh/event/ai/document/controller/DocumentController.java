package com.EventmanagementbyMahesh.event.ai.document.controller;

import com.EventmanagementbyMahesh.event.ai.document.dto.DocumentDto;
import com.EventmanagementbyMahesh.event.ai.document.dto.RagAskRequest;
import com.EventmanagementbyMahesh.event.ai.document.dto.RagAnswerResponse;
import com.EventmanagementbyMahesh.event.ai.document.dto.RetrievalRequest;
import com.EventmanagementbyMahesh.event.ai.document.dto.RetrievalResponse;
import com.EventmanagementbyMahesh.event.ai.document.entity.Document;
import com.EventmanagementbyMahesh.event.ai.document.service.DocumentQuestionService;
import com.EventmanagementbyMahesh.event.ai.document.service.DocumentRetrievalService;
import com.EventmanagementbyMahesh.event.ai.document.service.DocumentService;
import com.EventmanagementbyMahesh.event.auth.entity.User;
import com.EventmanagementbyMahesh.event.auth.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/ai/documents")
@Tag(name = "AI Document Ingestion APIs", description = "Endpoints for uploading and managing documents for RAG")
public class DocumentController {

    private final DocumentService documentService;
    private final DocumentRetrievalService documentRetrievalService;
    private final DocumentQuestionService documentQuestionService;
    private final UserRepository userRepository;

    public DocumentController(DocumentService documentService, DocumentRetrievalService documentRetrievalService, DocumentQuestionService documentQuestionService, UserRepository userRepository) {
        this.documentService = documentService;
        this.documentRetrievalService = documentRetrievalService;
        this.documentQuestionService = documentQuestionService;
        this.userRepository = userRepository;
    }

    private User getAuthenticatedUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new RuntimeException("User not authenticated");
        }
        String email = auth.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload a document for indexing", security = @SecurityRequirement(name = "Bearer Authentication"))
    public ResponseEntity<DocumentDto> uploadDocument(
            @RequestParam("file") MultipartFile file,
            Authentication auth) {
        try {
            User user = getAuthenticatedUser(auth);
            Document doc = documentService.uploadDocument(user.getId(), file);
            return ResponseEntity.status(HttpStatus.CREATED).body(DocumentDto.fromEntity(doc));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping
    @Operation(summary = "List all documents for the authenticated user", security = @SecurityRequirement(name = "Bearer Authentication"))
    public ResponseEntity<List<DocumentDto>> getDocuments(Authentication auth) {
        User user = getAuthenticatedUser(auth);
        List<Document> documents = documentService.getUserDocuments(user.getId());
        List<DocumentDto> dtoList = documents.stream()
                .map(DocumentDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtoList);
    }

    @DeleteMapping("/{documentId}")
    @Operation(summary = "Delete a document and its embeddings", security = @SecurityRequirement(name = "Bearer Authentication"))
    public ResponseEntity<Void> deleteDocument(@PathVariable Long documentId, Authentication auth) {
        try {
            User user = getAuthenticatedUser(auth);
            documentService.deleteDocument(documentId, user.getId());
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/search")
    @Operation(summary = "Search documents using vector similarity", security = @SecurityRequirement(name = "Bearer Authentication"))
    public ResponseEntity<RetrievalResponse> searchDocuments(
            @jakarta.validation.Valid @RequestBody RetrievalRequest request,
            Authentication auth) {
        try {
            User user = getAuthenticatedUser(auth);
            RetrievalResponse response = documentRetrievalService.searchDocuments(request, user.getId());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/ask")
    @Operation(summary = "Ask a question based on uploaded documents", security = @SecurityRequirement(name = "Bearer Authentication"))
    public ResponseEntity<RagAnswerResponse> askQuestion(
            @jakarta.validation.Valid @RequestBody RagAskRequest request,
            Authentication auth) {
        User user = getAuthenticatedUser(auth);
        RagAnswerResponse response = documentQuestionService.askQuestion(request, user.getId());
        return ResponseEntity.ok(response);
    }
}
