package com.EventmanagementbyMahesh.event.ai.gateway;

import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.service.AiExecutionService;
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

@SpringBootTest(properties = {
    "ai.internal.token=test-internal-token"
}, classes = com.EventmanagementbyMahesh.event.auth.AuthApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InternalContractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AiExecutionService aiExecutionService;

    @Test
    void pythonToSpringContract_success() throws Exception {
        // Mock the provider execution layer
        LlmResponse mockResponse = new LlmResponse("Test integrated response", "gemini", "gemini-1.5-flash", 10, 20, 30);
        when(aiExecutionService.execute(any(LlmRequest.class))).thenReturn(mockResponse);

        // Represent Python sending the normalized AI request
        LlmRequest pythonRequest = new LlmRequest("Test prompt", null, null, null, null);

        mockMvc.perform(post("/internal/ai/execute")
                .header("Authorization", "Bearer test-internal-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(pythonRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Test integrated response"))
                .andExpect(jsonPath("$.provider").value("gemini"));
    }

    @Test
    void pythonToSpringContract_unauthorized() throws Exception {
        LlmRequest pythonRequest = new LlmRequest("Test prompt", null, null, null, null);

        // Missing token
        mockMvc.perform(post("/internal/ai/execute")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(pythonRequest)))
                .andExpect(status().isUnauthorized());

        // Invalid token
        mockMvc.perform(post("/internal/ai/execute")
                .header("Authorization", "Bearer invalid-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(pythonRequest)))
                .andExpect(status().isUnauthorized());
    }
}
