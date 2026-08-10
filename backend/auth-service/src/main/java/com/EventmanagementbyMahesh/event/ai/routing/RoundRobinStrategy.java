package com.EventmanagementbyMahesh.event.ai.routing;

import com.EventmanagementbyMahesh.event.ai.exception.ProviderException;
import com.EventmanagementbyMahesh.event.ai.provider.LlmProvider;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * A routing strategy that cycles through available providers sequentially.
 * Thread-safe implementation using AtomicInteger.
 */
@Component
public class RoundRobinStrategy implements RoutingStrategy {

    private final AtomicInteger counter = new AtomicInteger(0);

    @Override
    public LlmProvider select(List<LlmProvider> providers) {
        if (providers == null || providers.isEmpty()) {
            throw new ProviderException("No available provider to route to");
        }

        // Atomically increment and get the counter.
        int currentCount = counter.getAndIncrement();
        
        // Math.floorMod safely handles negative numbers (like Integer.MIN_VALUE from overflow)
        // returning a positive index bound by providers.size().
        int index = Math.floorMod(currentCount, providers.size());
        
        return providers.get(index);
    }
}
