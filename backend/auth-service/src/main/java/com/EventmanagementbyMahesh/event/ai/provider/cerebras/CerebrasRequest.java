package com.EventmanagementbyMahesh.event.ai.provider.cerebras;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class CerebrasRequest {
    public String model;
    public List<Message> messages;
    public Double temperature;

    @JsonProperty("max_tokens")
    public Integer maxTokens;

    public static class Message {
        public String role;
        public String content;

        public Message() {}

        public Message(String role, String content) {
            this.role = role;
            this.content = content;
        }
    }
}
