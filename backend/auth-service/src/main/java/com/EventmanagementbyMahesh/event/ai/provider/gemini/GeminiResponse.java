package com.EventmanagementbyMahesh.event.ai.provider.gemini;

import java.util.List;

public class GeminiResponse {
    public List<Candidate> candidates;
    public UsageMetadata usageMetadata;
    public GeminiError error;

    public static class Candidate {
        public GeminiRequest.Content content;
    }

    public static class UsageMetadata {
        public Integer promptTokenCount;
        public Integer candidatesTokenCount;
        public Integer totalTokenCount;
    }

    public static class GeminiError {
        public Integer code;
        public String message;
        public String status;
    }
}
