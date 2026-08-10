package com.EventmanagementbyMahesh.event.ai.research;

import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.research.dto.ResearchRequest;
import com.EventmanagementbyMahesh.event.ai.research.dto.ResearchResponse;
import com.EventmanagementbyMahesh.event.ai.research.retrieval.RetrievalProvider;
import com.EventmanagementbyMahesh.event.ai.research.retrieval.RetrievalResult;
import com.EventmanagementbyMahesh.event.ai.service.AiExecutionService;
import org.springframework.stereotype.Service;

@Service
public class ResearchService {

    private final AiExecutionService aiExecutionService;
    private final RetrievalProvider retrievalProvider;
    private final ResearchPromptBuilder promptBuilder;

    public ResearchService(
            AiExecutionService aiExecutionService,
            RetrievalProvider retrievalProvider,
            ResearchPromptBuilder promptBuilder) {
        this.aiExecutionService = aiExecutionService;
        this.retrievalProvider = retrievalProvider;
        this.promptBuilder = promptBuilder;
    }

    public ResearchResponse research(ResearchRequest request) {
        // Step 1: Retrieve evidence (may return empty)
        RetrievalResult retrievalResult = retrievalProvider.retrieve(request.getQuery());

        // Step 2: Build prompts — evidence incorporated only when present
        String systemPrompt = promptBuilder.getSystemPrompt();
        String userPrompt = promptBuilder.buildUserPrompt(request.getQuery(), retrievalResult);

        // Step 3: Build LLM request — higher max tokens for analytical responses
        LlmRequest llmRequest = new LlmRequest(
                userPrompt,
                systemPrompt,
                null,  // model — let the gateway routing decide
                0.5,   // lower temperature for more precise, analytical answers
                3000   // generous max tokens for thorough research answers
        );

        // Step 4: Execute via AI gateway (handles selection, fallback, health)
        LlmResponse llmResponse = aiExecutionService.execute(llmRequest);

        // Step 5: Map to clean public response (no internal state exposed)
        return new ResearchResponse(
                llmResponse.content,
                llmResponse.provider,
                llmResponse.model
        );
    }
}
