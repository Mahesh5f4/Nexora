package com.EventmanagementbyMahesh.event.ai.research;

import com.EventmanagementbyMahesh.event.ai.document.client.PythonAiServiceClient;
import com.EventmanagementbyMahesh.event.ai.document.dto.AgentAskRequest;
import com.EventmanagementbyMahesh.event.ai.document.dto.AgentAskResponse;
import com.EventmanagementbyMahesh.event.ai.research.dto.ResearchRequest;
import com.EventmanagementbyMahesh.event.ai.research.dto.ResearchResponse;
import com.EventmanagementbyMahesh.event.auth.entity.User;
import com.EventmanagementbyMahesh.event.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResearchServiceTest {

    @Mock
    private PythonAiServiceClient pythonAiServiceClient;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ResearchService researchService;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("testuser@example.com", "password")
        );
    }

    @Test
    void testResearch_DelegatesToPythonAgent() {
        // Arrange
        ResearchRequest request = new ResearchRequest("Compare Redis and Memcached.");

        User mockUser = new User();
        mockUser.setId(10L);
        mockUser.setEmail("testuser@example.com");
        when(userRepository.findByEmail("testuser@example.com")).thenReturn(Optional.of(mockUser));

        AgentAskResponse mockResponse = new AgentAskResponse("Redis is better for...", new ArrayList<>(), "web_search");
        when(pythonAiServiceClient.askAgent(any(AgentAskRequest.class))).thenReturn(mockResponse);

        // Act
        ResearchResponse response = researchService.research(request);

        // Assert
        assertNotNull(response);
        assertEquals("Redis is better for...", response.getAnswer());
        assertEquals("agent", response.getProvider());
        assertEquals("web_search", response.getModel());

        // Verify LLM was called with correct params
        ArgumentCaptor<AgentAskRequest> captor = ArgumentCaptor.forClass(AgentAskRequest.class);
        verify(pythonAiServiceClient, times(1)).askAgent(captor.capture());
        AgentAskRequest captured = captor.getValue();
        assertEquals("Compare Redis and Memcached.", captured.getQuery());
        assertEquals("10", captured.getUserId());
        assertTrue(captured.isForceWebSearch());
    }

    @Test
    void testResearch_UserNotFound() {
        when(userRepository.findByEmail("testuser@example.com")).thenReturn(Optional.empty());

        ResearchRequest request = new ResearchRequest("Query");
        assertThrows(RuntimeException.class, () -> researchService.research(request));
    }
}
