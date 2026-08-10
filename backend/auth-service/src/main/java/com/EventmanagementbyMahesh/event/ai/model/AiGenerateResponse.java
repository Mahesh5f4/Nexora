package com.EventmanagementbyMahesh.event.ai.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiGenerateResponse {
    
    private String content;
    private String provider;
    private String model;
    private TokenUsage usage;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TokenUsage {
        private Integer inputTokens;
        private Integer outputTokens;
        private Integer totalTokens;
    }
}
