package com.EventmanagementbyMahesh.event.ai.plan;

import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.plan.dto.PlanRequest;
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
class PlanIntegrationTest {

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
        PlanRequest request = new PlanRequest("Build a 30-day Java backend interview plan.");

        mockMvc.perform(post("/ai/plan")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    void testAuthenticatedRequestSucceeds() throws Exception {
        String planContent = "## Phase 1: Core Java\n" +
                "### Tasks\n" +
                "- Review Collections framework (**High**)\n" +
                "- Review concurrency primitives (**High**)\n" +
                "### Milestone\n" +
                "- Core Java mastery confirmed via practice tests\n" +
                "### Risks\n" +
                "- Underestimating depth of concurrency topics";

        when(aiExecutionService.execute(any(LlmRequest.class)))
                .thenReturn(new LlmResponse(planContent, "gemini", "gemini-1.5-pro"));

        PlanRequest request = new PlanRequest("Build a 30-day Java backend interview preparation plan.");
        String token = jwtUtil.generateToken("planner@example.com", "USER");

        mockMvc.perform(post("/ai/plan")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.goal").value("Build a 30-day Java backend interview preparation plan."))
                .andExpect(jsonPath("$.plan").value(planContent))
                .andExpect(jsonPath("$.provider").value("gemini"))
                .andExpect(jsonPath("$.model").value("gemini-1.5-pro"));
    }
}
