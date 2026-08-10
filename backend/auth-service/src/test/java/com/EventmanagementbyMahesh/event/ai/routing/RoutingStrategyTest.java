package com.EventmanagementbyMahesh.event.ai.routing;

import com.EventmanagementbyMahesh.event.ai.exception.ProviderException;
import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.provider.LlmProvider;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RoutingStrategyTest {

    @Test
    void testStrategyContractCompilationAndEmptyHandling() {
        // Implement an anonymous strategy just to test the abstraction contract.
        RoutingStrategy simpleStrategy = providers -> {
            if (providers == null || providers.isEmpty()) {
                throw new ProviderException("No available provider to route to");
            }
            return providers.get(0);
        };

        // 1. Verify behavior with null
        ProviderException nullEx = assertThrows(ProviderException.class, () -> simpleStrategy.select(null));
        assertTrue(nullEx.getMessage().contains("No available provider"));

        // 2. Verify behavior with empty list
        ProviderException emptyEx = assertThrows(ProviderException.class, () -> simpleStrategy.select(Collections.emptyList()));
        assertTrue(emptyEx.getMessage().contains("No available provider"));

        // 3. Verify behavior with valid providers (passing the mock implementation)
        List<LlmProvider> providers = new ArrayList<>();
        providers.add(new MockProvider("gemini"));
        providers.add(new MockProvider("groq"));

        LlmProvider selected = simpleStrategy.select(providers);
        assertNotNull(selected);
        assertEquals("gemini", selected.getProviderName());
    }

    /**
     * Stub provider for routing abstraction testing
     */
    private static class MockProvider implements LlmProvider {
        private final String name;

        public MockProvider(String name) {
            this.name = name;
        }

        @Override
        public LlmResponse generate(LlmRequest request) {
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
    }
}
