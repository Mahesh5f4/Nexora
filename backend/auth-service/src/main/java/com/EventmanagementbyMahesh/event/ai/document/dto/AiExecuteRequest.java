package com.EventmanagementbyMahesh.event.ai.document.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiExecuteRequest {
    private String prompt;
    private String systemPrompt;
    private String modelId;
    private Double temperature;
    private Integer maxTokens;
}
