package com.EventmanagementbyMahesh.event.ai.provider;

import com.EventmanagementbyMahesh.event.ai.exception.ProviderException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ProviderRegistry {

    private final Map<String, LlmProvider> providers;

    /**
     * Spring automatically injects all beans implementing LlmProvider.
     * @param providerList list of all discovered providers
     */
    public ProviderRegistry(List<LlmProvider> providerList) {
        this.providers = providerList.stream()
                .collect(Collectors.toMap(
                        LlmProvider::getProviderName,
                        Function.identity()
                ));
    }

    /**
     * Returns all registered provider implementations, regardless of configuration status.
     * @return all registered providers
     */
    public List<LlmProvider> getAllProviders() {
        return List.copyOf(providers.values());
    }

    /**
     * Returns only providers whose required configuration (e.g. API keys) is present.
     * @return available/configured providers
     */
    public List<LlmProvider> getAvailableProviders() {
        return providers.values().stream()
                .filter(LlmProvider::isConfigured)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves a provider by name.
     * @param name the provider identifier (e.g., "gemini", "groq")
     * @return the requested provider
     * @throws ProviderException if the provider is not found
     */
    public LlmProvider getProvider(String name) {
        LlmProvider provider = providers.get(name != null ? name.toLowerCase() : "");
        if (provider == null) {
            throw new ProviderException("Provider not found or unsupported: " + name);
        }
        return provider;
    }
}
