package com.EventmanagementbyMahesh.event.ai.gateway;

import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.service.AiExecutionService;
import com.EventmanagementbyMahesh.event.common.security.InternalServiceTokenFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = InternalAiController.class)
@org.springframework.test.context.ContextConfiguration(classes = com.EventmanagementbyMahesh.event.auth.AuthApplication.class)
@AutoConfigureMockMvc(addFilters = false)
class InternalAiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AiExecutionService aiExecutionService;

    // Need to mock filter if it was active, but we disabled filters for pure controller test.
    @MockBean
    private InternalServiceTokenFilter internalTokenFilter;
    
    // Also need to mock JwtUtil if SecurityConfig pulls it in
    @MockBean
    private com.EventmanagementbyMahesh.event.common.security.JwtUtil jwtUtil;

    @Test
    void execute_validRequest_returnsResponse() throws Exception {
        LlmRequest request = new LlmRequest("Test prompt", null, "gemini-1.5-flash", 0.7, 100);
        LlmResponse response = new LlmResponse("Test response", "gemini", "gemini-1.5-flash", 10, 20, 30);

        when(aiExecutionService.execute(any(LlmRequest.class))).thenReturn(response);

        mockMvc.perform(post("/internal/ai/execute")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Test response"))
                .andExpect(jsonPath("$.provider").value("gemini"));
    }
}
