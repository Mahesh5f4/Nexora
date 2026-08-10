package com.EventmanagementbyMahesh.event.ai.generate;

import com.EventmanagementbyMahesh.event.ai.generate.dto.GenerateRequest;
import com.EventmanagementbyMahesh.event.ai.generate.dto.GenerateResponse;
import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.service.AiExecutionService;
import org.springframework.stereotype.Service;

@Service
public class GenerateService {

    private final AiExecutionService aiExecutionService;
    private final GeneratePromptBuilder promptBuilder;

    public GenerateService(AiExecutionService aiExecutionService, GeneratePromptBuilder promptBuilder) {
        this.aiExecutionService = aiExecutionService;
        this.promptBuilder = promptBuilder;
    }

    public GenerateResponse generateContent(GenerateRequest request) {
        String systemPrompt = promptBuilder.buildSystemPrompt(request.getType());

        LlmRequest llmRequest = new LlmRequest(
                request.getPrompt(),
                systemPrompt,
                null, // model
                0.7,  // temperature
                2000  // max tokens
        );

        LlmResponse llmResponse = aiExecutionService.execute(llmRequest);

        GenerateResponse.TokenUsage tokenUsage = null;
        if (llmResponse.totalTokens != null || llmResponse.inputTokens != null || llmResponse.outputTokens != null) {
            tokenUsage = new GenerateResponse.TokenUsage(
                    llmResponse.inputTokens,
                    llmResponse.outputTokens,
                    llmResponse.totalTokens
            );
        }

        return new GenerateResponse(
                llmResponse.content,
                llmResponse.provider,
                llmResponse.model,
                tokenUsage
        );
    }
}
