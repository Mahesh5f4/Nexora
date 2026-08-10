package com.EventmanagementbyMahesh.event.ai.gateway;

import com.EventmanagementbyMahesh.event.ai.model.AiGenerateRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.service.AiExecutionService;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.EventmanagementbyMahesh.event.auth.AuthApplication;

@SpringBootTest(classes = AuthApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AiGatewayIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtUtil jwtUtil;

    @MockBean
    private AiExecutionService aiExecutionService;

    @Test
    void testUnauthenticatedRequestIsRejected() throws Exception {
        AiGenerateRequest request = new AiGenerateRequest();
        request.setPrompt("Hello AI");

        // No Authorization header provided
        mockMvc.perform(post("/api/ai/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden()); // Spring Security returns 403 by default without custom entrypoint
    }

    @Test
    void testAuthenticatedRequestIsAllowed() throws Exception {
        LlmResponse llmResponse = new LlmResponse("Success", "groq", "llama3");
        when(aiExecutionService.execute(any(LlmRequest.class))).thenReturn(llmResponse);

        AiGenerateRequest request = new AiGenerateRequest();
        request.setPrompt("Hello AI");

        // Generate a valid JWT token using the real JwtUtil logic injected
        String token = jwtUtil.generateToken("testuser@example.com", "USER");

        mockMvc.perform(post("/api/ai/generate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }
}
