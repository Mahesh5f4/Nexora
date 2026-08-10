package com.EventmanagementbyMahesh.event.ai.routing;

import com.EventmanagementbyMahesh.event.ai.provider.LlmProvider;

import java.util.List;

/**
 * Defines the contract for an algorithm that selects a single LLM provider
 * from a collection of available candidate providers.
 */
public interface RoutingStrategy {

    /**
     * Selects an LLM provider based on the strategy implementation.
     *
     * @param providers the list of available, configured LLM providers
     * @return the selected LlmProvider
     * @throws com.EventmanagementbyMahesh.event.ai.exception.ProviderException if the providers list is empty or null,
     *                                                                         or if a provider cannot be selected.
     */
    LlmProvider select(List<LlmProvider> providers);
}
