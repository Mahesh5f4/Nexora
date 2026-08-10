package com.EventmanagementbyMahesh.event.ai.provider;

import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;

public interface LlmProvider {

    /**
     * Generates a response from the LLM based on the given request.
     *
     * @param request The normalized LLM request
     * @return The normalized LLM response
     */
    LlmResponse generate(LlmRequest request);

    /**
     * Returns the name of the provider (e.g., "gemini", "groq", "cerebras", "openrouter").
     *
     * @return provider name
     */
    String getProviderName();

    /**
     * Checks if the provider is fully configured (e.g. has an API key).
     * 
     * @return true if configured
     */
    boolean isConfigured();
}
