package com.EventmanagementbyMahesh.event.ai.research;

import com.EventmanagementbyMahesh.event.ai.research.retrieval.RetrievalResult;
import org.springframework.stereotype.Component;

@Component
public class ResearchPromptBuilder {

    private static final String BASE_SYSTEM_PROMPT =
            "You are a research-oriented AI assistant for ThinkAction Ai.\n\n" +
            "Analyze the user's question carefully.\n" +
            "Break complex questions into meaningful dimensions.\n" +
            "Explain your reasoning step by step.\n" +
            "Identify assumptions you are making and state them clearly.\n" +
            "Explain uncertainty when your information may be incomplete or outdated.\n" +
            "Compare alternatives when appropriate.\n" +
            "Explain trade-offs honestly.\n\n" +
            "IMPORTANT: Do not fabricate sources, citations, or URLs.\n" +
            "Do not claim to have searched the web.\n" +
            "Do not claim information is current or externally verified " +
            "unless actual retrieval evidence is supplied in this message.\n\n" +
            "Provide a structured and useful answer.";

    /**
     * Build the complete user prompt, incorporating any retrieved evidence.
     * If retrieval returned no documents, the LLM is told explicitly to rely
     * on its training data and NOT to fabricate citations.
     *
     * @param query  the user's research query
     * @param result the retrieval result (may be empty)
     * @return the full prompt string to pass to the LLM
     */
    public String buildUserPrompt(String query, RetrievalResult result) {
        StringBuilder sb = new StringBuilder();

        if (result.hasDocuments()) {
            sb.append("The following documents were retrieved from: ")
              .append(result.getSourceProvider())
              .append("\n\n");

            int index = 1;
            for (var doc : result.getDocuments()) {
                sb.append("--- Document ").append(index++).append(" ---\n");
                if (doc.getTitle() != null && !doc.getTitle().isBlank()) {
                    sb.append("Title: ").append(doc.getTitle()).append("\n");
                }
                if (doc.getSource() != null && !doc.getSource().isBlank()) {
                    sb.append("Source: ").append(doc.getSource()).append("\n");
                }
                sb.append(doc.getContent()).append("\n\n");
            }
            sb.append("---\n\n");
            sb.append("Using the above evidence as context, answer the following:\n\n");
        } else {
            sb.append("Note: No external sources were retrieved for this response. ")
              .append("Answer based on your training knowledge. ")
              .append("Do not invent citations or claim web access.\n\n");
        }

        sb.append("Research question:\n").append(query);
        return sb.toString();
    }

    public String getSystemPrompt() {
        return BASE_SYSTEM_PROMPT;
    }
}
