package com.EventmanagementbyMahesh.event.ai.service;

import com.EventmanagementbyMahesh.event.ai.exception.ProviderException;
import com.EventmanagementbyMahesh.event.ai.health.ProviderHealthTracker;
import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.provider.LlmProvider;
import com.EventmanagementbyMahesh.event.ai.provider.ProviderRegistry;
import com.EventmanagementbyMahesh.event.ai.routing.RoutingStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ProviderSelectionServiceTest {

    private ProviderSelectionService service;
    
    private MockProviderRegistry registry;
    private MockHealthTracker healthTracker;
    private MockRoutingStrategy routingStrategy;

    @BeforeEach
    void setUp() {
        registry = new MockProviderRegistry();
        healthTracker = new MockHealthTracker();
        routingStrategy = new MockRoutingStrategy();
        service = new ProviderSelectionService(registry, healthTracker, routingStrategy);
    }

    @Test
    void testNormalSelection() {
        LlmProvider a = new MockProvider("A");
        LlmProvider b = new MockProvider("B");
        LlmProvider c = new MockProvider("C");
        
        List<LlmProvider> all = List.of(a, b, c);
        
        registry.setAvailableProviders(all);
        healthTracker.setHealthyProviders(all); // All healthy
        routingStrategy.setProviderToSelect(b); // Strategy picks B

        LlmProvider selected = service.selectProvider();
        
        assertEquals("B", selected.getProviderName());
        
        // Verify strategy received all 3 providers
        assertEquals(3, routingStrategy.getLastSuppliedProviders().size());
        
        // Verify generate() was never called
        assertFalse(((MockProvider) a).isGenerateCalled());
        assertFalse(((MockProvider) b).isGenerateCalled());
        assertFalse(((MockProvider) c).isGenerateCalled());
    }

    @Test
    void testUnhealthyProviderFiltering() {
        LlmProvider a = new MockProvider("A");
        LlmProvider b = new MockProvider("B"); // Unhealthy
        LlmProvider c = new MockProvider("C");

        List<LlmProvider> all = List.of(a, b, c);
        List<LlmProvider> healthy = List.of(a, c); // B is filtered out

        registry.setAvailableProviders(all);
        healthTracker.setHealthyProviders(healthy);
        routingStrategy.setProviderToSelect(c);

        LlmProvider selected = service.selectProvider();

        assertEquals("C", selected.getProviderName());
        
        // Verify strategy ONLY received A and C
        List<LlmProvider> passedToStrategy = routingStrategy.getLastSuppliedProviders();
        assertEquals(2, passedToStrategy.size());
        assertEquals("A", passedToStrategy.get(0).getProviderName());
        assertEquals("C", passedToStrategy.get(1).getProviderName());
    }

    @Test
    void testExcludedProviders() {
        LlmProvider a = new MockProvider("A");
        LlmProvider b = new MockProvider("B");
        LlmProvider c = new MockProvider("C");

        List<LlmProvider> all = List.of(a, b, c);
        registry.setAvailableProviders(all);
        healthTracker.setHealthyProviders(all);
        routingStrategy.setProviderToSelect(c);

        // Exclude A and B
        LlmProvider selected = service.selectProvider(java.util.Set.of("A", "B"));

        assertEquals("C", selected.getProviderName());
        
        List<LlmProvider> passedToStrategy = routingStrategy.getLastSuppliedProviders();
        assertEquals(1, passedToStrategy.size());
        assertEquals("C", passedToStrategy.get(0).getProviderName());
    }

    @Test
    void testNoConfiguredProviders() {
        registry.setAvailableProviders(Collections.emptyList());

        ProviderException ex = assertThrows(ProviderException.class, () -> service.selectProvider());
        assertTrue(ex.getMessage().contains("No configured AI provider available"));
    }

    @Test
    void testNoHealthyProviders() {
        LlmProvider a = new MockProvider("A");
        registry.setAvailableProviders(List.of(a));
        
        // Health tracker returns empty list
        healthTracker.setHealthyProviders(Collections.emptyList());

        ProviderException ex = assertThrows(ProviderException.class, () -> service.selectProvider());
        assertTrue(ex.getMessage().contains("No healthy AI provider available"));
    }

    @Test
    void testStrategyFailurePropagates() {
        LlmProvider a = new MockProvider("A");
        registry.setAvailableProviders(List.of(a));
        healthTracker.setHealthyProviders(List.of(a));
        
        // Make strategy throw an exception
        routingStrategy.setThrowException(true);

        ProviderException ex = assertThrows(ProviderException.class, () -> service.selectProvider());
        assertEquals("Strategy failed", ex.getMessage());
    }

    // --- Mocks ---

    private static class MockProviderRegistry extends ProviderRegistry {
        private List<LlmProvider> availableProviders = Collections.emptyList();

        public MockProviderRegistry() {
            super(Collections.emptyList());
        }

        public void setAvailableProviders(List<LlmProvider> availableProviders) {
            this.availableProviders = availableProviders;
        }

        @Override
        public List<LlmProvider> getAvailableProviders() {
            return availableProviders;
        }
    }

    private static class MockHealthTracker extends ProviderHealthTracker {
        private List<LlmProvider> healthyProviders = Collections.emptyList();

        public MockHealthTracker() {
            super(3, 60, java.time.Clock.systemUTC());
        }

        public void setHealthyProviders(List<LlmProvider> healthyProviders) {
            this.healthyProviders = healthyProviders;
        }

        @Override
        public List<LlmProvider> getHealthyProviders(List<LlmProvider> providers) {
            return healthyProviders;
        }
    }

    private static class MockRoutingStrategy implements RoutingStrategy {
        private List<LlmProvider> lastSuppliedProviders;
        private LlmProvider providerToSelect;
        private boolean throwException = false;

        public void setProviderToSelect(LlmProvider providerToSelect) {
            this.providerToSelect = providerToSelect;
        }

        public void setThrowException(boolean throwException) {
            this.throwException = throwException;
        }

        public List<LlmProvider> getLastSuppliedProviders() {
            return lastSuppliedProviders;
        }

        @Override
        public LlmProvider select(List<LlmProvider> providers) {
            this.lastSuppliedProviders = providers;
            if (throwException) {
                throw new ProviderException("Strategy failed");
            }
            return providerToSelect;
        }
    }

    private static class MockProvider implements LlmProvider {
        private final String name;
        private boolean generateCalled = false;

        public MockProvider(String name) {
            this.name = name;
        }

        @Override
        public LlmResponse generate(LlmRequest request) {
            this.generateCalled = true;
            return null;
        }

        @Override
        public String getProviderName() {
            return name;
        }

        @Override
        public boolean isConfigured() {
            return true;
        }

        public boolean isGenerateCalled() {
            return generateCalled;
        }
    }
}
