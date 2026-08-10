package com.EventmanagementbyMahesh.event.ai.gateway;

import com.EventmanagementbyMahesh.event.ai.exception.ProviderException;
import com.EventmanagementbyMahesh.event.ai.model.AiGenerateRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.service.AiExecutionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class AiGatewayControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AiExecutionService aiExecutionService;

    @InjectMocks
    private AiGatewayController aiGatewayController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        // Setup mock mvc and attach our explicit exception handler to catch ProviderException
        mockMvc = MockMvcBuilders.standaloneSetup(aiGatewayController)
                .setControllerAdvice(new AiGatewayExceptionHandler())
                .build();
    }

    @Test
    void testValidRequestReturnsResponse() throws Exception {
        LlmResponse llmResponse = new LlmResponse("Test Response", "mockProvider", "mock-model", 10, 20, 30);
        when(aiExecutionService.execute(any(LlmRequest.class))).thenReturn(llmResponse);

        AiGenerateRequest request = new AiGenerateRequest();
        request.setPrompt("Hello AI");
        request.setModel("test-model");

        mockMvc.perform(post("/api/ai/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Test Response"))
                .andExpect(jsonPath("$.provider").value("mockProvider"))
                .andExpect(jsonPath("$.model").value("mock-model"))
                .andExpect(jsonPath("$.usage.totalTokens").value(30));
    }

    @Test
    void testBlankPromptFailsValidation() throws Exception {
        AiGenerateRequest request = new AiGenerateRequest();
        request.setPrompt("   "); // blank

        mockMvc.perform(post("/api/ai/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testMissingPromptFailsValidation() throws Exception {
        AiGenerateRequest request = new AiGenerateRequest(); // No prompt

        mockMvc.perform(post("/api/ai/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testExecutionFailureReturns503() throws Exception {
        when(aiExecutionService.execute(any(LlmRequest.class)))
                .thenThrow(new ProviderException("All providers failed"));

        AiGenerateRequest request = new AiGenerateRequest();
        request.setPrompt("Trigger Failure");

        mockMvc.perform(post("/api/ai/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.errorCode").value("AI_SERVICE_UNAVAILABLE"))
                .andExpect(jsonPath("$.message").value("AI service temporarily unavailable"))
                .andExpect(jsonPath("$.traceId").exists());
        
        // Assert credentials/internal details are not leaked in the response JSON
    }
}
