package com.EventmanagementbyMahesh.event.ai.provider.openrouter;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public class OpenRouterResponse {
    public String id;
    public String model;
    public List<Choice> choices;
    public Usage usage;
    public OpenRouterError error;

    public static class Choice {
        public Message message;

        @JsonProperty("finish_reason")
        public String finishReason;
    }

    public static class Message {
        public String role;
        public String content;
    }

    public static class Usage {
        @JsonProperty("prompt_tokens")
        public Integer promptTokens;

        @JsonProperty("completion_tokens")
        public Integer completionTokens;

        @JsonProperty("total_tokens")
        public Integer totalTokens;
    }

    public static class OpenRouterError {
        public String message;
        public String type;
        public Integer code;
    }
}
