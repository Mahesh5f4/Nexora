package com.EventmanagementbyMahesh.event.ai.generate;

import com.EventmanagementbyMahesh.event.ai.generate.dto.GenerateRequest;
import com.EventmanagementbyMahesh.event.ai.generate.dto.GenerateResponse;
import com.EventmanagementbyMahesh.event.ai.document.client.PythonAiServiceClient;
import com.EventmanagementbyMahesh.event.ai.document.dto.AiExecuteRequest;
import com.EventmanagementbyMahesh.event.ai.document.dto.AiExecuteResponse;
import org.springframework.stereotype.Service;

@Service
public class GenerateService {

    private final PythonAiServiceClient pythonAiServiceClient;
    private final GeneratePromptBuilder promptBuilder;

    public GenerateService(PythonAiServiceClient pythonAiServiceClient, GeneratePromptBuilder promptBuilder) {
        this.pythonAiServiceClient = pythonAiServiceClient;
        this.promptBuilder = promptBuilder;
    }

    public GenerateResponse generateContent(GenerateRequest request) {
        String systemPrompt = promptBuilder.buildSystemPrompt(request.getType());

        AiExecuteRequest llmRequest = new AiExecuteRequest(
                request.getPrompt(),
                systemPrompt,
                null, // model
                0.7,  // temperature
                2000  // max tokens
        );

        AiExecuteResponse llmResponse = pythonAiServiceClient.executePrompt(llmRequest);

        GenerateResponse.TokenUsage tokenUsage = null;

        return new GenerateResponse(
                llmResponse.getContent(),
                "OpenRouter (Python Gateway)",
                "anthropic/claude-3.5-sonnet",
                tokenUsage
        );
    }
}
