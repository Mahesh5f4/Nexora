package com.EventmanagementbyMahesh.event.ai.usage.controller;

import com.EventmanagementbyMahesh.event.ai.usage.dto.UsageResponse;
import com.EventmanagementbyMahesh.event.ai.usage.service.UsageSessionService;
import com.EventmanagementbyMahesh.event.auth.entity.User;
import com.EventmanagementbyMahesh.event.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.when;

class UsageControllerTest {

    private UsageSessionService usageSessionService;
    private UserRepository userRepository;
    private UsageController usageController;

    @BeforeEach
    void setUp() {
        usageSessionService = Mockito.mock(UsageSessionService.class);
        userRepository = Mockito.mock(UserRepository.class);
        usageController = new UsageController(usageSessionService, userRepository);
    }

    @Test
    void testGetCurrentUsage_Authenticated() {
        Authentication auth = Mockito.mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getName()).thenReturn("test@example.com");

        User mockUser = new User();
        mockUser.setId(1L);
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(mockUser));

        UsageResponse mockResponse = new UsageResponse();
        mockResponse.setTokensUsed(100);
        mockResponse.setTokenBudget(500);
        mockResponse.setTokensRemaining(400);
        
        when(usageSessionService.getCurrentUsage(1L)).thenReturn(mockResponse);

        ResponseEntity<UsageResponse> response = usageController.getCurrentUsage(auth);

        assertEquals(200, response.getStatusCodeValue());
        assertNotNull(response.getBody());
        assertEquals(100, response.getBody().getTokensUsed());
    }

    @Test
    void testGetCurrentUsage_Unauthenticated() {
        ResponseEntity<UsageResponse> response = usageController.getCurrentUsage(null);
        assertEquals(401, response.getStatusCodeValue());
    }
}
