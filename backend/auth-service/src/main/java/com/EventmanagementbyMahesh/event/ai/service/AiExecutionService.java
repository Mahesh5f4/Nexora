package com.EventmanagementbyMahesh.event.ai.service;

import com.EventmanagementbyMahesh.event.ai.exception.ProviderException;
import com.EventmanagementbyMahesh.event.ai.health.ProviderHealthTracker;
import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.provider.LlmProvider;
import com.EventmanagementbyMahesh.event.ai.provider.ProviderRegistry;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Orchestrates the execution of LLM requests with bounded fallback.
 * It uses the ProviderSelectionService to find candidates and safely attempts
 * execution, recording successes or failures. In case of failure, it retries
 * using a different eligible provider.
 */
@Service
public class AiExecutionService {

    private final ProviderSelectionService providerSelectionService;
    private final ProviderHealthTracker providerHealthTracker;
    private final ProviderRegistry providerRegistry;

    public AiExecutionService(
            ProviderSelectionService providerSelectionService,
            ProviderHealthTracker providerHealthTracker,
            ProviderRegistry providerRegistry) {
        this.providerSelectionService = providerSelectionService;
        this.providerHealthTracker = providerHealthTracker;
        this.providerRegistry = providerRegistry;
    }

    /**
     * Executes the given request. If the selected provider fails, it attempts
     * to fallback to another eligible provider. It records success and failure 
     * states back to the health tracker.
     *
     * @param request The request to generate
     * @return The response from the first successful provider
     * @throws ProviderException if all available/eligible providers fail
     */
    public LlmResponse execute(LlmRequest request) {
        Set<String> attemptedProviders = new HashSet<>();
        
        List<LlmProvider> availableProviders = providerRegistry.getAvailableProviders();
        if (availableProviders == null || availableProviders.isEmpty()) {
            throw new ProviderException("No configured AI provider available");
        }
        
        int maxAttempts = availableProviders.size();

        for (int i = 0; i < maxAttempts; i++) {
            LlmProvider provider;
            try {
                // Select an eligible provider, ensuring we do NOT select one we've already tried this request
                provider = providerSelectionService.selectProvider(attemptedProviders);
            } catch (ProviderException e) {
                // Thrown when there are no more healthy/eligible providers left to try
                break;
            }

            try {
                LlmResponse response = provider.generate(request);
                
                // Success resets the consecutive failure counter for this provider
                providerHealthTracker.recordSuccess(provider);
                
                return response;
            } catch (ProviderException e) {
                // The provider failed. Mark it in the health tracker and add it to the exclusion set.
                providerHealthTracker.recordFailure(provider);
                attemptedProviders.add(provider.getProviderName());
            }
        }

        throw new ProviderException("All available AI providers failed after " + attemptedProviders.size() + " attempts.");
    }
}
