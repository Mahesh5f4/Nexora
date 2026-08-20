package com.EventmanagementbyMahesh.event.ai.research;

import com.EventmanagementbyMahesh.event.ai.document.client.PythonAiServiceClient;
import com.EventmanagementbyMahesh.event.ai.document.dto.AgentAskRequest;
import com.EventmanagementbyMahesh.event.ai.document.dto.AgentAskResponse;
import com.EventmanagementbyMahesh.event.ai.document.dto.RagSourceDto;
import com.EventmanagementbyMahesh.event.ai.research.dto.ResearchRequest;
import com.EventmanagementbyMahesh.event.auth.AuthApplication;
import com.EventmanagementbyMahesh.event.auth.entity.User;
import com.EventmanagementbyMahesh.event.auth.repository.UserRepository;
import com.EventmanagementbyMahesh.event.common.security.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = AuthApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ResearchIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtUtil jwtUtil;

    @MockBean
    private PythonAiServiceClient pythonAiServiceClient;

    @MockBean
    private UserRepository userRepository;

    @Test
    void testUnauthenticatedRequestIsRejected() throws Exception {
        ResearchRequest request = new ResearchRequest("Compare Redis and Memcached.");

        mockMvc.perform(post("/ai/research")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    void testAuthenticatedRequestIsAllowed() throws Exception {
        User mockUser = new User();
        mockUser.setId(1L);
        mockUser.setEmail("testuser@example.com");
        when(userRepository.findByEmail("testuser@example.com")).thenReturn(Optional.of(mockUser));

        RagSourceDto source = new RagSourceDto("http://example.com", "Title", "Domain", 0.9);
        List<RagSourceDto> sources = new ArrayList<>();
        sources.add(source);

        AgentAskResponse mockResponse = new AgentAskResponse("Redis supports richer data types than Memcached...", sources, "rag_web");
        when(pythonAiServiceClient.askAgent(any(AgentAskRequest.class))).thenReturn(mockResponse);

        ResearchRequest request = new ResearchRequest("Compare Redis and Memcached.");
        String token = jwtUtil.generateToken("testuser@example.com", "USER");

        mockMvc.perform(post("/ai/research")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answer").value("Redis supports richer data types than Memcached..."))
                .andExpect(jsonPath("$.provider").value("agent"))
                .andExpect(jsonPath("$.model").value("rag_web"))
                .andExpect(jsonPath("$.sources[0].documentId").value("http://example.com"));
    }
}
