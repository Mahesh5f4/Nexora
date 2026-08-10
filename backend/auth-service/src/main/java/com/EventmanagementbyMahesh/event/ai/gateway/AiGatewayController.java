package com.EventmanagementbyMahesh.event.ai.gateway;

import com.EventmanagementbyMahesh.event.ai.model.AiGenerateRequest;
import com.EventmanagementbyMahesh.event.ai.model.AiGenerateResponse;
import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.service.AiExecutionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ai")
public class AiGatewayController {

    private final AiExecutionService aiExecutionService;

    public AiGatewayController(AiExecutionService aiExecutionService) {
        this.aiExecutionService = aiExecutionService;
    }

    @PostMapping("/generate")
    public ResponseEntity<AiGenerateResponse> generate(@Valid @RequestBody AiGenerateRequest request) {
        // Map DTO to internal LlmRequest
        LlmRequest llmRequest = new LlmRequest(
                request.getPrompt(),
                request.getSystemPrompt(),
                request.getModel(),
                request.getTemperature(),
                request.getMaxTokens()
        );

        // Execute via pipeline (handles selection, execution, and fallback safely)
        LlmResponse llmResponse = aiExecutionService.execute(llmRequest);

        // Map internal LlmResponse to safe public DTO
        AiGenerateResponse.TokenUsage tokenUsage = null;
        if (llmResponse.totalTokens != null || llmResponse.inputTokens != null || llmResponse.outputTokens != null) {
            tokenUsage = new AiGenerateResponse.TokenUsage(
                    llmResponse.inputTokens,
                    llmResponse.outputTokens,
                    llmResponse.totalTokens
            );
        }

        AiGenerateResponse response = new AiGenerateResponse(
                llmResponse.content,
                llmResponse.provider,
                llmResponse.model,
                tokenUsage
        );

        return ResponseEntity.ok(response);
    }
}
