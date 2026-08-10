package com.EventmanagementbyMahesh.event.ai.plan;

import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.plan.dto.PlanRequest;
import com.EventmanagementbyMahesh.event.ai.plan.dto.PlanResponse;
import com.EventmanagementbyMahesh.event.ai.service.AiExecutionService;
import org.springframework.stereotype.Service;

@Service
public class PlanService {

    private final AiExecutionService aiExecutionService;
    private final PlanPromptBuilder promptBuilder;

    public PlanService(AiExecutionService aiExecutionService, PlanPromptBuilder promptBuilder) {
        this.aiExecutionService = aiExecutionService;
        this.promptBuilder = promptBuilder;
    }

    public PlanResponse createPlan(PlanRequest request) {
        String systemPrompt = promptBuilder.getSystemPrompt();
        String userPrompt = promptBuilder.buildUserPrompt(request.getGoal());

        // Planning benefits from lower temperature for deliberate, structured output
        // and generous tokens because plans are inherently long-form
        LlmRequest llmRequest = new LlmRequest(
                userPrompt,
                systemPrompt,
                null,  // model — gateway routing decides
                0.4,   // lower temperature: structured, deliberate planning
                4000   // generous max tokens: plans can be detailed
        );

        LlmResponse llmResponse = aiExecutionService.execute(llmRequest);

        return new PlanResponse(
                request.getGoal(),
                llmResponse.content,
                llmResponse.provider,
                llmResponse.model
        );
    }
}
