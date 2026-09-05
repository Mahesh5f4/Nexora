package com.EventmanagementbyMahesh.event.ai.chat.controller;

import com.EventmanagementbyMahesh.event.ai.chat.dto.ConversationDto;
import com.EventmanagementbyMahesh.event.ai.chat.dto.CreateConversationRequest;
import com.EventmanagementbyMahesh.event.ai.chat.dto.MessageDto;
import com.EventmanagementbyMahesh.event.ai.chat.dto.RenameConversationRequest;
import com.EventmanagementbyMahesh.event.ai.chat.dto.SendMessageRequest;
import com.EventmanagementbyMahesh.event.ai.chat.service.ConversationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.domain.Sort;

import java.util.List;
@RestController
@RequestMapping("/ai/conversations")
public class ConversationController {

    private final ConversationService conversationService;

    public ConversationController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }

    @GetMapping
    public ResponseEntity<List<ConversationDto>> listConversations() {
        return ResponseEntity.ok(conversationService.listConversations());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConversationDto> getConversation(@PathVariable String id) {
        return ResponseEntity.ok(conversationService.getConversation(id));
    }

    @PostMapping
    public ResponseEntity<ConversationDto> createConversation(@Valid @RequestBody CreateConversationRequest request) {
        return ResponseEntity.ok(conversationService.createConversation(request));
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<Page<MessageDto>> getMessages(@PathVariable String id, @PageableDefault(size = 10000, sort = "createdAt", direction = Sort.Direction.ASC) Pageable pageable) {
        return ResponseEntity.ok(conversationService.getMessages(id, pageable));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ConversationDto> renameConversation(@PathVariable String id, @Valid @RequestBody RenameConversationRequest request) {
        return ResponseEntity.ok(conversationService.renameConversation(id, request.getNewTitle()));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<MessageDto> sendMessage(@PathVariable String id, @Valid @RequestBody SendMessageRequest request) {
        return ResponseEntity.ok(conversationService.sendMessage(id, request));
    }

    @PostMapping(value = "/{id}/messages/stream", produces = "text/event-stream;charset=UTF-8")
    public ResponseEntity<SseEmitter> streamMessage(@PathVariable String id, @Valid @RequestBody SendMessageRequest request) {
        SseEmitter emitter = conversationService.streamMessage(id, request);
        return ResponseEntity.ok()
                .header("Content-Type", "text/event-stream;charset=UTF-8")
                .header("X-Accel-Buffering", "no")
                .header("Cache-Control", "no-cache")
                .body(emitter);
    }

    @PostMapping("/{id}/generate-title")
    public ResponseEntity<ConversationDto> generateTitle(@PathVariable String id, @RequestBody java.util.Map<String, String> request) {
        String firstMessage = request.getOrDefault("prompt", "");
        return ResponseEntity.ok(conversationService.generateTitle(id, firstMessage));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteConversation(@PathVariable String id) {
        conversationService.deleteConversation(id);
        return ResponseEntity.noContent().build();
    }
}
