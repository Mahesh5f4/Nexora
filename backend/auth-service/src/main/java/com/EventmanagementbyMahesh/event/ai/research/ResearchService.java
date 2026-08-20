package com.EventmanagementbyMahesh.event.ai.research;

import com.EventmanagementbyMahesh.event.ai.document.client.PythonAiServiceClient;
import com.EventmanagementbyMahesh.event.ai.document.dto.AgentAskRequest;
import com.EventmanagementbyMahesh.event.ai.document.dto.AgentAskResponse;
import com.EventmanagementbyMahesh.event.ai.research.dto.ResearchRequest;
import com.EventmanagementbyMahesh.event.ai.research.dto.ResearchResponse;
import com.EventmanagementbyMahesh.event.auth.entity.User;
import com.EventmanagementbyMahesh.event.auth.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;

@Service
public class ResearchService {

    private final PythonAiServiceClient pythonAiServiceClient;
    private final UserRepository userRepository;

    public ResearchService(
            PythonAiServiceClient pythonAiServiceClient,
            UserRepository userRepository) {
        this.pythonAiServiceClient = pythonAiServiceClient;
        this.userRepository = userRepository;
    }

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public ResearchResponse research(ResearchRequest request) {
        User user = getAuthenticatedUser();
        
        // Build the agent request targeting web search explicitly
        AgentAskRequest agentRequest = new AgentAskRequest(
                request.getQuery(),
                String.valueOf(user.getId()),
                5,
                null,
                new ArrayList<>(),
                true // forceWebSearch
        );
        
        // Call Python Agent which handles research logic, evaluation, and LLM via Spring Gateway
        AgentAskResponse response = pythonAiServiceClient.askAgent(agentRequest);
        
        // Map back to ResearchResponse
        return new ResearchResponse(
                response.getAnswer(),
                "agent",
                response.getMode(),
                response.getSources()
        );
    }
}
