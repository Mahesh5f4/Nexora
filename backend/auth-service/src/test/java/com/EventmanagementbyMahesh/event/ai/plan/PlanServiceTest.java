package com.EventmanagementbyMahesh.event.ai.plan;

import com.EventmanagementbyMahesh.event.ai.exception.ProviderException;
import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.plan.dto.PlanRequest;
import com.EventmanagementbyMahesh.event.ai.plan.dto.PlanResponse;
import com.EventmanagementbyMahesh.event.ai.service.AiExecutionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PlanServiceTest {

    @Mock
    private AiExecutionService aiExecutionService;

    @Mock
    private PlanPromptBuilder promptBuilder;

    @InjectMocks
    private PlanService planService;

    @Test
    void createPlan_Success_ResponseMappedCorrectly() {
        String goal = "Build a 30-day Java interview preparation plan.";
        PlanRequest request = new PlanRequest(goal);

        when(promptBuilder.getSystemPrompt()).thenReturn("System: planning AI");
        when(promptBuilder.buildUserPrompt(goal)).thenReturn("Create a plan for: " + goal);

        LlmResponse mockLlmResponse = new LlmResponse(
                "## Phase 1: Foundations\n### Tasks\n- Review Java core...",
                "gemini", "gemini-1.5-pro");
        when(aiExecutionService.execute(any(LlmRequest.class))).thenReturn(mockLlmResponse);

        PlanResponse response = planService.createPlan(request);

        assertNotNull(response);
        assertEquals(goal, response.getGoal(), "Goal must be echoed back in response");
        assertEquals("## Phase 1: Foundations\n### Tasks\n- Review Java core...", response.getPlan());
        assertEquals("gemini", response.getProvider());
        assertEquals("gemini-1.5-pro", response.getModel());
    }

    @Test
    void createPlan_LlmRequestParametersAreCorrect() {
        String goal = "Develop a payment microservice.";
        PlanRequest request = new PlanRequest(goal);

        when(promptBuilder.getSystemPrompt()).thenReturn("System");
        when(promptBuilder.buildUserPrompt(goal)).thenReturn("User prompt");
        when(aiExecutionService.execute(any(LlmRequest.class))).thenReturn(
                new LlmResponse("Plan content", "groq", "llama-3.3-70b"));

        planService.createPlan(request);

        ArgumentCaptor<LlmRequest> captor = ArgumentCaptor.forClass(LlmRequest.class);
        verify(aiExecutionService, times(1)).execute(captor.capture());

        LlmRequest captured = captor.getValue();
        assertEquals("User prompt", captured.prompt);
        assertEquals("System", captured.systemPrompt);
        assertNull(captured.model, "model must be null — gateway routing decides");
        assertEquals(0.4, captured.temperature, "Planning should use lower temperature (0.4)");
        assertEquals(4000, captured.maxTokens, "Plans need generous token budget (4000)");
    }

    @Test
    void createPlan_ProviderExceptionPropagates() {
        PlanRequest request = new PlanRequest("Goal that triggers failure");

        when(promptBuilder.getSystemPrompt()).thenReturn("System");
        when(promptBuilder.buildUserPrompt(any())).thenReturn("prompt");
        when(aiExecutionService.execute(any(LlmRequest.class)))
                .thenThrow(new ProviderException("All providers exhausted"));

        assertThrows(ProviderException.class, () -> planService.createPlan(request));
    }

    @Test
    void createPlan_PromptBuilderCalledWithCorrectGoal() {
        String goal = "Specific goal text";
        PlanRequest request = new PlanRequest(goal);

        when(promptBuilder.getSystemPrompt()).thenReturn("System");
        when(promptBuilder.buildUserPrompt(goal)).thenReturn("prompt for: " + goal);
        when(aiExecutionService.execute(any(LlmRequest.class)))
                .thenReturn(new LlmResponse("Plan", "groq", "llama"));

        planService.createPlan(request);

        verify(promptBuilder, times(1)).getSystemPrompt();
        verify(promptBuilder, times(1)).buildUserPrompt(goal);
    }

    @Test
    void createPlan_ServiceHasNoDirectProviderDependency() {
        // Compile-time guarantee that PlanService uses only AiExecutionService.
        // This test simply verifies the service wires up without concrete providers.
        assertNotNull(planService);
    }
}
