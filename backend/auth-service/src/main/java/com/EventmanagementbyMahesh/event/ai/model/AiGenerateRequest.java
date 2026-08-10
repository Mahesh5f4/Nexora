package com.EventmanagementbyMahesh.event.ai.model;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiGenerateRequest {
    
    @NotBlank(message = "Prompt cannot be blank")
    private String prompt;
    
    private String systemPrompt;
    
    private String model;
    
    private Double temperature;
    
    private Integer maxTokens;
}
