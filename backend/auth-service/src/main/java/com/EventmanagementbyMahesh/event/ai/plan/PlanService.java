package com.EventmanagementbyMahesh.event.ai.plan;

import com.EventmanagementbyMahesh.event.ai.document.client.PythonAiServiceClient;
import com.EventmanagementbyMahesh.event.ai.document.dto.AiExecuteRequest;
import com.EventmanagementbyMahesh.event.ai.document.dto.AiExecuteResponse;
import com.EventmanagementbyMahesh.event.ai.plan.dto.PlanRequest;
import com.EventmanagementbyMahesh.event.ai.plan.dto.PlanResponse;
import org.springframework.stereotype.Service;

@Service
public class PlanService {

    private final PythonAiServiceClient pythonAiServiceClient;
    private final PlanPromptBuilder promptBuilder;

    public PlanService(PythonAiServiceClient pythonAiServiceClient, PlanPromptBuilder promptBuilder) {
        this.pythonAiServiceClient = pythonAiServiceClient;
        this.promptBuilder = promptBuilder;
    }

    public PlanResponse createPlan(PlanRequest request) {
        String systemPrompt = promptBuilder.getSystemPrompt();
        String userPrompt = promptBuilder.buildUserPrompt(request.getGoal());

        // Planning benefits from lower temperature for deliberate, structured output
        // and generous tokens because plans are inherently long-form
        AiExecuteRequest llmRequest = new AiExecuteRequest(
                userPrompt,
                systemPrompt,
                null,  // model
                0.4,   // lower temperature: structured, deliberate planning
                4000   // generous max tokens: plans can be detailed
        );

        AiExecuteResponse llmResponse = pythonAiServiceClient.executePrompt(llmRequest);

        return new PlanResponse(
                request.getGoal(),
                llmResponse.getContent(),
                "OpenRouter (Python Gateway)",
                "anthropic/claude-3.5-sonnet"
        );
    }
}
