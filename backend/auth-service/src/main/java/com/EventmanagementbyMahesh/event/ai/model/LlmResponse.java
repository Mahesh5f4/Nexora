package com.EventmanagementbyMahesh.event.ai.model;

public class LlmResponse {
    public String content;
    public String provider;
    public String model;
    
    // Optional metadata
    public Integer inputTokens;
    public Integer outputTokens;
    public Integer totalTokens;

    public LlmResponse() {}

    public LlmResponse(String content, String provider, String model) {
        this.content = content;
        this.provider = provider;
        this.model = model;
    }

    public LlmResponse(String content, String provider, String model, Integer inputTokens, Integer outputTokens, Integer totalTokens) {
        this.content = content;
        this.provider = provider;
        this.model = model;
        this.inputTokens = inputTokens;
        this.outputTokens = outputTokens;
        this.totalTokens = totalTokens;
    }
}
