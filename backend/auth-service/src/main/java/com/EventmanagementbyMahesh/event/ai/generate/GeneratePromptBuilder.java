package com.EventmanagementbyMahesh.event.ai.generate;

import org.springframework.stereotype.Component;

@Component
public class GeneratePromptBuilder {

    public String buildSystemPrompt(GenerateType type) {
        String basePrompt = "You are ThinkAction Ai's content generation assistant.\n"
                + "Generate the requested content directly.\n"
                + "Follow the user's requested format and constraints.\n"
                + "Do not fabricate facts.\n"
                + "If the request is ambiguous, make reasonable assumptions and clearly state them when necessary.\n"
                + "Optimize for useful, high-quality output rather than generic explanations.\n\n";

        return switch (type) {
            case CODE -> basePrompt + "Focus on correctness, readability, and production-ready code. Provide only the requested code and necessary brief explanations.";
            case EMAIL -> basePrompt + "Write in a professional, concise, and clear tone appropriate for business communication.";
            case SOCIAL_POST -> basePrompt + "Write engaging, natural-sounding posts. Avoid artificial marketing language or excessive emojis.";
            case DOCUMENT -> basePrompt + "Provide a structured, professional, and well-formatted document.";
            default -> basePrompt + "Provide a clear and direct answer.";
        };
    }
}
