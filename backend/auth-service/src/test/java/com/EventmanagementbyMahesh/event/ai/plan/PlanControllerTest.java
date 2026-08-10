package com.EventmanagementbyMahesh.event.ai.plan;

import com.EventmanagementbyMahesh.event.ai.exception.ProviderException;
import com.EventmanagementbyMahesh.event.ai.plan.dto.PlanRequest;
import com.EventmanagementbyMahesh.event.ai.plan.dto.PlanResponse;
import com.EventmanagementbyMahesh.event.common.security.JwtFilter;
import com.EventmanagementbyMahesh.event.common.security.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PlanController.class)
@ContextConfiguration(classes = com.EventmanagementbyMahesh.event.auth.AuthApplication.class)
@AutoConfigureMockMvc(addFilters = false)
class PlanControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PlanService planService;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private JwtFilter jwtFilter;

    @Test
    @WithMockUser
    void plan_Success() throws Exception {
        PlanRequest request = new PlanRequest("Build a 30-day Java backend interview plan.");
        PlanResponse response = new PlanResponse(
                "Build a 30-day Java backend interview plan.",
                "## Phase 1: Core Java\n...",
                "gemini",
                "gemini-1.5-pro");

        when(planService.createPlan(any(PlanRequest.class))).thenReturn(response);

        mockMvc.perform(post("/ai/plan")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.goal").value("Build a 30-day Java backend interview plan."))
                .andExpect(jsonPath("$.plan").value("## Phase 1: Core Java\n..."))
                .andExpect(jsonPath("$.provider").value("gemini"))
                .andExpect(jsonPath("$.model").value("gemini-1.5-pro"));
    }

    @Test
    @WithMockUser
    void plan_Validation_BlankGoal() throws Exception {
        PlanRequest request = new PlanRequest("");

        mockMvc.perform(post("/ai/plan")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void plan_Validation_WhitespaceOnly() throws Exception {
        PlanRequest request = new PlanRequest("   \n\t  ");

        mockMvc.perform(post("/ai/plan")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void plan_Validation_NullGoal() throws Exception {
        PlanRequest request = new PlanRequest();
        request.setGoal(null);

        mockMvc.perform(post("/ai/plan")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void plan_Validation_OversizedGoal() throws Exception {
        String hugeGoal = "g".repeat(5001);
        PlanRequest request = new PlanRequest(hugeGoal);

        mockMvc.perform(post("/ai/plan")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void plan_ProviderException_Returns503() throws Exception {
        PlanRequest request = new PlanRequest("A valid planning goal");

        when(planService.createPlan(any(PlanRequest.class)))
                .thenThrow(new ProviderException("All providers failed"));

        mockMvc.perform(post("/ai/plan")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isServiceUnavailable());
    }
}
