package com.EventmanagementbyMahesh.event.ai.health;

import com.EventmanagementbyMahesh.event.ai.provider.LlmProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Tracks the health of LLM providers by maintaining consecutive failure counts and enforcing cooldowns.
 */
@Component
public class ProviderHealthTracker {

    private final int failureThreshold;
    private final int cooldownSeconds;
    private final Clock clock;

    private final ConcurrentHashMap<String, ProviderHealthState> healthStates = new ConcurrentHashMap<>();

    @org.springframework.beans.factory.annotation.Autowired
    public ProviderHealthTracker(
            @Value("${ai.provider.failure.threshold:3}") int failureThreshold,
            @Value("${ai.provider.cooldown.seconds:60}") int cooldownSeconds,
            @org.springframework.beans.factory.annotation.Autowired(required = false) Clock clock) {
        this.failureThreshold = failureThreshold;
        this.cooldownSeconds = cooldownSeconds;
        // Default to UTC clock if the context doesn't provide one explicitly
        this.clock = clock != null ? clock : Clock.systemUTC();
    }

    /**
     * Resets consecutive failures to 0.
     * @param provider the provider that successfully completed a request
     */
    public void recordSuccess(LlmProvider provider) {
        if (provider == null || provider.getProviderName() == null) return;
        
        ProviderHealthState state = getOrCreateState(provider.getProviderName());
        state.consecutiveFailures.set(0);
    }

    /**
     * Increments consecutive failures and updates the last failure timestamp.
     * @param provider the provider that failed
     */
    public void recordFailure(LlmProvider provider) {
        if (provider == null || provider.getProviderName() == null) return;
        
        ProviderHealthState state = getOrCreateState(provider.getProviderName());
        state.consecutiveFailures.incrementAndGet();
        state.lastFailureTime.set(clock.instant());
    }

    /**
     * Determines if a provider is healthy based on its failure count and cooldown.
     * @param provider the provider to check
     * @return true if the provider is healthy or has recovered via cooldown
     */
    public boolean isHealthy(LlmProvider provider) {
        if (provider == null || provider.getProviderName() == null) return false;

        ProviderHealthState state = healthStates.get(provider.getProviderName());
        if (state == null) {
            return true; // No recorded failures means it is inherently healthy
        }

        int failures = state.consecutiveFailures.get();
        if (failures < failureThreshold) {
            return true; // Still within acceptable failure limits
        }

        // Check if cooldown has expired
        Instant lastFailure = state.lastFailureTime.get();
        Instant now = clock.instant();
        
        // If elapsed time is greater than or equal to the cooldown period, it's eligible to try again
        return lastFailure.plusSeconds(cooldownSeconds).isBefore(now) || 
               lastFailure.plusSeconds(cooldownSeconds).equals(now);
    }

    /**
     * Filters a list of providers returning only the healthy ones, maintaining input order.
     * @param providers the candidate list
     * @return a filtered list of healthy providers
     */
    public List<LlmProvider> getHealthyProviders(List<LlmProvider> providers) {
        if (providers == null || providers.isEmpty()) {
            return Collections.emptyList();
        }

        List<LlmProvider> healthyProviders = new ArrayList<>(providers.size());
        for (LlmProvider provider : providers) {
            if (isHealthy(provider)) {
                healthyProviders.add(provider);
            }
        }
        return healthyProviders;
    }
    
    private ProviderHealthState getOrCreateState(String providerName) {
        return healthStates.computeIfAbsent(providerName, k -> new ProviderHealthState());
    }

    private static class ProviderHealthState {
        final AtomicInteger consecutiveFailures = new AtomicInteger(0);
        final AtomicReference<Instant> lastFailureTime = new AtomicReference<>(Instant.MIN);
    }
}
