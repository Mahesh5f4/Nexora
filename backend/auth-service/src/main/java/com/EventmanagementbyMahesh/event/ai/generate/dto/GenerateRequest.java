package com.EventmanagementbyMahesh.event.ai.generate.dto;

import com.EventmanagementbyMahesh.event.ai.generate.GenerateType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class GenerateRequest {

    @NotBlank(message = "Prompt cannot be blank")
    @Size(max = 10000, message = "Prompt cannot exceed 10000 characters")
    private String prompt;

    private GenerateType type = GenerateType.GENERAL;

    public GenerateRequest() {
    }

    public GenerateRequest(String prompt, GenerateType type) {
        this.prompt = prompt;
        this.type = type != null ? type : GenerateType.GENERAL;
    }

    public String getPrompt() {
        return prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }

    public GenerateType getType() {
        return type;
    }

    public void setType(GenerateType type) {
        this.type = type;
    }
}
