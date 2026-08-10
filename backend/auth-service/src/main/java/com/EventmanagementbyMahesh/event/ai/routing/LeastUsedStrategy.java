package com.EventmanagementbyMahesh.event.ai.routing;

import com.EventmanagementbyMahesh.event.ai.exception.ProviderException;
import com.EventmanagementbyMahesh.event.ai.provider.LlmProvider;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * A routing strategy that selects the provider with the lowest number of previous selections.
 * Ties are broken by selecting the first provider in the supplied list that has the lowest count.
 * Thread-safe implementation using ConcurrentHashMap and AtomicInteger.
 */
@Component
public class LeastUsedStrategy implements RoutingStrategy {

    private final ConcurrentHashMap<String, AtomicInteger> usageCounts = new ConcurrentHashMap<>();

    @Override
    public LlmProvider select(List<LlmProvider> providers) {
        if (providers == null || providers.isEmpty()) {
            throw new ProviderException("No available provider to route to");
        }

        LlmProvider selectedProvider = null;
        int minCount = Integer.MAX_VALUE;

        // Iterate sequentially to preserve tie-breaking behavior (first in list wins)
        for (LlmProvider provider : providers) {
            String name = provider.getProviderName();
            if (name == null) {
                continue; // Skip invalid providers safely
            }

            // Get current count (initialize to 0 if not present)
            AtomicInteger counter = usageCounts.computeIfAbsent(name, k -> new AtomicInteger(0));
            int currentCount = counter.get();

            // Strictly less-than ensures the first encountered minimum wins ties
            if (currentCount < minCount) {
                minCount = currentCount;
                selectedProvider = provider;
            }
        }

        if (selectedProvider == null) {
            throw new ProviderException("Could not determine a provider to select");
        }

        // Atomically increment the selected provider's usage count
        usageCounts.get(selectedProvider.getProviderName()).incrementAndGet();

        return selectedProvider;
    }
}
