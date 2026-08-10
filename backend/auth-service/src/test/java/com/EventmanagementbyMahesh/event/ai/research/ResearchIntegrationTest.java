package com.EventmanagementbyMahesh.event.ai.research;

import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.research.dto.ResearchRequest;
import com.EventmanagementbyMahesh.event.ai.research.retrieval.RetrievalProvider;
import com.EventmanagementbyMahesh.event.ai.research.retrieval.RetrievalResult;
import com.EventmanagementbyMahesh.event.ai.service.AiExecutionService;
import com.EventmanagementbyMahesh.event.auth.AuthApplication;
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
    private AiExecutionService aiExecutionService;

    // Override retrieval so no internet call is made
    @MockBean
    private RetrievalProvider retrievalProvider;

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
        when(retrievalProvider.retrieve(any())).thenReturn(RetrievalResult.empty("noop"));
        when(retrievalProvider.getProviderName()).thenReturn("noop");

        LlmResponse mockResponse = new LlmResponse(
                "Redis supports richer data types than Memcached...", "gemini", "gemini-1.5-flash");
        when(aiExecutionService.execute(any(LlmRequest.class))).thenReturn(mockResponse);

        ResearchRequest request = new ResearchRequest("Compare Redis and Memcached.");
        String token = jwtUtil.generateToken("testuser@example.com", "USER");

        mockMvc.perform(post("/ai/research")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answer").value("Redis supports richer data types than Memcached..."))
                .andExpect(jsonPath("$.provider").value("gemini"))
                .andExpect(jsonPath("$.model").value("gemini-1.5-flash"));
    }
}
