package com.EventmanagementbyMahesh.event.ai.provider.gemini;

import java.util.List;

public class GeminiRequest {
    public List<Content> contents;
    public Content systemInstruction;
    public GenerationConfig generationConfig;

    public static class Content {
        public List<Part> parts;
        public String role;
        
        public Content() {}
        public Content(List<Part> parts) {
            this.parts = parts;
        }
    }

    public static class Part {
        public String text;
        
        public Part() {}
        public Part(String text) {
            this.text = text;
        }
    }

    public static class GenerationConfig {
        public Double temperature;
        public Integer maxOutputTokens;
    }
}
