package com.EventmanagementbyMahesh.event.ai.model;

public class LlmRequest {
    public String prompt;
    public String systemPrompt;
    public String model;
    public Double temperature;
    public Integer maxTokens;

    public LlmRequest() {}

    public LlmRequest(String prompt, String systemPrompt, String model, Double temperature, Integer maxTokens) {
        this.prompt = prompt;
        this.systemPrompt = systemPrompt;
        this.model = model;
        this.temperature = temperature;
        this.maxTokens = maxTokens;
    }
}
