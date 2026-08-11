package com.EventmanagementbyMahesh.event.ai.gateway;

import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.service.AiExecutionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/ai")
public class InternalAiController {

    private final AiExecutionService aiExecutionService;

    public InternalAiController(AiExecutionService aiExecutionService) {
        this.aiExecutionService = aiExecutionService;
    }

    @PostMapping("/execute")
    public ResponseEntity<LlmResponse> execute(@RequestBody LlmRequest request) {
        LlmResponse response = aiExecutionService.execute(request);
        return ResponseEntity.ok(response);
    }
}
