package com.EventmanagementbyMahesh.event.ai.generate;

import com.EventmanagementbyMahesh.event.ai.generate.dto.GenerateRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
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
class GenerateIntegrationTest {

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
        GenerateRequest request = new GenerateRequest("Write something", GenerateType.GENERAL);

        // No Authorization header provided
        mockMvc.perform(post("/ai/content/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    void testAuthenticatedRequestIsAllowed() throws Exception {
        LlmResponse llmResponse = new LlmResponse("Generated content", "gemini", "gemini-1.5-flash", 5, 10, 15);
        when(aiExecutionService.execute(any(LlmRequest.class))).thenReturn(llmResponse);

        GenerateRequest request = new GenerateRequest("Write something", GenerateType.GENERAL);
        String token = jwtUtil.generateToken("testuser@example.com", "USER");

        mockMvc.perform(post("/ai/content/generate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Generated content"))
                .andExpect(jsonPath("$.provider").value("gemini"))
                .andExpect(jsonPath("$.model").value("gemini-1.5-flash"))
                .andExpect(jsonPath("$.tokenUsage.totalTokens").value(15));
    }
}
