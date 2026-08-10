package com.EventmanagementbyMahesh.event.ai.provider;

import com.EventmanagementbyMahesh.event.ai.exception.ProviderException;
import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ProviderRegistryTest {

    private ProviderRegistry registry;
    private MockProvider gemini;
    private MockProvider groq;
    private MockProvider cerebras;
    private MockProvider openrouter;

    @BeforeEach
    void setUp() {
        gemini = new MockProvider("gemini", true);
        groq = new MockProvider("groq", true);
        cerebras = new MockProvider("cerebras", true);
        openrouter = new MockProvider("openrouter", true);

        registry = new ProviderRegistry(Arrays.asList(gemini, groq, cerebras, openrouter));
    }

    @Test
    void testGetAllProviders() {
        List<LlmProvider> all = registry.getAllProviders();
        assertEquals(4, all.size());
    }

    @Test
    void testAllProvidersConfigured() {
        List<LlmProvider> available = registry.getAvailableProviders();
        assertEquals(4, available.size());
    }

    @Test
    void testOneProviderMissing() {
        // Simulate missing CEREBRAS_API_KEY
        cerebras.setConfigured(false);

        List<LlmProvider> available = registry.getAvailableProviders();
        assertEquals(3, available.size());
        
        // Ensure cerebras is NOT in the available list
        boolean hasCerebras = available.stream().anyMatch(p -> p.getProviderName().equals("cerebras"));
        assertFalse(hasCerebras);
    }

    @Test
    void testMultipleProvidersMissing() {
        gemini.setConfigured(false);
        groq.setConfigured(false);

        List<LlmProvider> available = registry.getAvailableProviders();
        assertEquals(2, available.size());
    }

    @Test
    void testGetProviderSuccess() {
        LlmProvider provider = registry.getProvider("groq");
        assertNotNull(provider);
        assertEquals("groq", provider.getProviderName());
    }

    @Test
    void testGetProviderCaseInsensitive() {
        LlmProvider provider = registry.getProvider("OPENROUTER");
        assertNotNull(provider);
        assertEquals("openrouter", provider.getProviderName());
    }

    @Test
    void testUnknownProvider() {
        ProviderException ex = assertThrows(ProviderException.class, () -> registry.getProvider("unknown-ai"));
        assertTrue(ex.getMessage().contains("not found"));
    }

    @Test
    void testNullProviderName() {
        ProviderException ex = assertThrows(ProviderException.class, () -> registry.getProvider(null));
        assertTrue(ex.getMessage().contains("not found"));
    }

    /**
     * Stub provider for registry testing
     */
    private static class MockProvider implements LlmProvider {
        private final String name;
        private boolean configured;

        public MockProvider(String name, boolean configured) {
            this.name = name;
            this.configured = configured;
        }

        public void setConfigured(boolean configured) {
            this.configured = configured;
        }

        @Override
        public LlmResponse generate(LlmRequest request) {
            return null; // Not tested here
        }

        @Override
        public String getProviderName() {
            return name;
        }

        @Override
        public boolean isConfigured() {
            return configured;
        }
    }
}
