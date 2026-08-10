package com.EventmanagementbyMahesh.event.ai.service;

import com.EventmanagementbyMahesh.event.ai.exception.ProviderException;
import com.EventmanagementbyMahesh.event.ai.health.ProviderHealthTracker;
import com.EventmanagementbyMahesh.event.ai.provider.LlmProvider;
import com.EventmanagementbyMahesh.event.ai.provider.ProviderRegistry;
import com.EventmanagementbyMahesh.event.ai.routing.RoutingStrategy;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Orchestrates the selection of an LLM provider by querying the registry for configured
 * providers, filtering out unhealthy ones via the health tracker, and finally delegating
 * to the configured routing strategy.
 */
@Service
public class ProviderSelectionService {

    private final ProviderRegistry providerRegistry;
    private final ProviderHealthTracker providerHealthTracker;
    private final RoutingStrategy routingStrategy;

    public ProviderSelectionService(
            ProviderRegistry providerRegistry,
            ProviderHealthTracker providerHealthTracker,
            @Qualifier("roundRobinStrategy") RoutingStrategy routingStrategy) {
        this.providerRegistry = providerRegistry;
        this.providerHealthTracker = providerHealthTracker;
        this.routingStrategy = routingStrategy;
    }

    /**
     * Selects the most appropriate healthy provider for the next request.
     * @return The selected LlmProvider
     * @throws ProviderException if no configured providers exist, or if none are healthy.
     */
    public LlmProvider selectProvider() {
        return selectProvider(java.util.Collections.emptySet());
    }

    /**
     * Selects the most appropriate healthy provider for the next request, excluding specified providers.
     * @param excludeProviders A set of provider names to exclude from selection.
     * @return The selected LlmProvider
     * @throws ProviderException if no configured providers exist, or if none are healthy.
     */
    public LlmProvider selectProvider(java.util.Set<String> excludeProviders) {
        // 1. Get all configured providers
        List<LlmProvider> configuredProviders = providerRegistry.getAvailableProviders();
        if (configuredProviders == null || configuredProviders.isEmpty()) {
            throw new ProviderException("No configured AI provider available");
        }

        // 2. Filter out unhealthy providers
        List<LlmProvider> healthyProviders = providerHealthTracker.getHealthyProviders(configuredProviders);

        // 2b. Filter out explicitly excluded providers
        if (excludeProviders != null && !excludeProviders.isEmpty()) {
            java.util.List<LlmProvider> filtered = new java.util.ArrayList<>();
            for (LlmProvider p : healthyProviders) {
                if (!excludeProviders.contains(p.getProviderName())) {
                    filtered.add(p);
                }
            }
            healthyProviders = filtered;
        }

        if (healthyProviders == null || healthyProviders.isEmpty()) {
            throw new ProviderException("No healthy AI provider available");
        }

        // 3. Delegate to the routing strategy
        return routingStrategy.select(healthyProviders);
    }
}
