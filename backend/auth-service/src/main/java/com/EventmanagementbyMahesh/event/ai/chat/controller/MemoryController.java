package com.EventmanagementbyMahesh.event.ai.chat.controller;

import com.EventmanagementbyMahesh.event.ai.document.client.PythonAiServiceClient;
import com.EventmanagementbyMahesh.event.auth.entity.User;
import com.EventmanagementbyMahesh.event.auth.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ai/memory")
public class MemoryController {

    private final PythonAiServiceClient pythonAiServiceClient;
    private final UserRepository userRepository;

    public MemoryController(PythonAiServiceClient pythonAiServiceClient, UserRepository userRepository) {
        this.pythonAiServiceClient = pythonAiServiceClient;
        this.userRepository = userRepository;
    }

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public ResponseEntity<String> listUserMemory() {
        User user = getAuthenticatedUser();
        String memoryJson = pythonAiServiceClient.listUserMemory(user.getId());
        return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(memoryJson);
    }

    @DeleteMapping("/{memoryId}")
    public ResponseEntity<Void> deleteUserMemory(@PathVariable String memoryId) {
        User user = getAuthenticatedUser();
        pythonAiServiceClient.deleteUserMemory(memoryId, user.getId());
        return ResponseEntity.ok().build();
    }
}
