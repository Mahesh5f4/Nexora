package com.EventmanagementbyMahesh.event.ai.usage.controller;

import com.EventmanagementbyMahesh.event.ai.usage.dto.UsageResponse;
import com.EventmanagementbyMahesh.event.ai.usage.service.UsageSessionService;
import com.EventmanagementbyMahesh.event.auth.entity.User;
import com.EventmanagementbyMahesh.event.auth.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/ai/usage")
public class UsageController {

    private final UsageSessionService usageSessionService;
    private final UserRepository userRepository;

    public UsageController(UsageSessionService usageSessionService, UserRepository userRepository) {
        this.usageSessionService = usageSessionService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<UsageResponse> getCurrentUsage(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || auth.getName().equals("anonymousUser")) {
            return ResponseEntity.status(401).build();
        }
        
        Optional<User> userOpt = userRepository.findByEmail(auth.getName());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).build();
        }
        
        UsageResponse response = usageSessionService.getCurrentUsage(userOpt.get().getId());
        return ResponseEntity.ok(response);
    }
}
