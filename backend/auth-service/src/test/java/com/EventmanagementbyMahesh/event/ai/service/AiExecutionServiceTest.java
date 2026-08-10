package com.EventmanagementbyMahesh.event.ai.service;

import com.EventmanagementbyMahesh.event.ai.exception.ProviderException;
import com.EventmanagementbyMahesh.event.ai.health.ProviderHealthTracker;
import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.provider.LlmProvider;
import com.EventmanagementbyMahesh.event.ai.provider.ProviderRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class AiExecutionServiceTest {

    private AiExecutionService executionService;
    private MockProviderSelectionService selectionService;
    private MockProviderHealthTracker healthTracker;
    private MockProviderRegistry registry;

    @BeforeEach
    void setUp() {
        selectionService = new MockProviderSelectionService();
        healthTracker = new MockProviderHealthTracker();
        registry = new MockProviderRegistry();
        executionService = new AiExecutionService(selectionService, healthTracker, registry);
    }

    @Test
    void testSuccessfulExecution() {
        MockProvider a = new MockProvider("A", false);
        registry.setAvailableProviders(List.of(a));
        selectionService.setProvidersToReturn(List.of(a));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);
        LlmResponse response = executionService.execute(request);

        assertNotNull(response);
        assertEquals("A", response.provider);
        assertEquals(1, a.getGenerateCount());
        
        // Verify success was recorded
        assertTrue(healthTracker.recordedSuccesses.contains("A"));
        assertFalse(healthTracker.recordedFailures.contains("A"));
    }

    @Test
    void testFirstFailsSecondSucceeds() {
        MockProvider a = new MockProvider("A", true);  // Fails
        MockProvider b = new MockProvider("B", false); // Succeeds
        registry.setAvailableProviders(List.of(a, b));
        selectionService.setProvidersToReturn(List.of(a, b));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);
        LlmResponse response = executionService.execute(request);

        assertNotNull(response);
        assertEquals("B", response.provider);
        
        assertEquals(1, a.getGenerateCount());
        assertEquals(1, b.getGenerateCount());
        
        // Verify health records
        assertTrue(healthTracker.recordedFailures.contains("A"));
        assertTrue(healthTracker.recordedSuccesses.contains("B"));
    }

    @Test
    void testMultipleFallbackAttempts() {
        MockProvider a = new MockProvider("A", true);
        MockProvider b = new MockProvider("B", true);
        MockProvider c = new MockProvider("C", false);
        registry.setAvailableProviders(List.of(a, b, c));
        selectionService.setProvidersToReturn(List.of(a, b, c));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);
        LlmResponse response = executionService.execute(request);

        assertNotNull(response);
        assertEquals("C", response.provider);

        assertEquals(1, a.getGenerateCount());
        assertEquals(1, b.getGenerateCount());
        assertEquals(1, c.getGenerateCount());

        assertTrue(healthTracker.recordedFailures.contains("A"));
        assertTrue(healthTracker.recordedFailures.contains("B"));
        assertTrue(healthTracker.recordedSuccesses.contains("C"));
    }

    @Test
    void testAllProvidersFail() {
        MockProvider a = new MockProvider("A", true);
        MockProvider b = new MockProvider("B", true);
        MockProvider c = new MockProvider("C", true);
        registry.setAvailableProviders(List.of(a, b, c));
        selectionService.setProvidersToReturn(List.of(a, b, c));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);
        
        ProviderException ex = assertThrows(ProviderException.class, () -> executionService.execute(request));
        assertTrue(ex.getMessage().contains("All available AI providers failed after 3 attempts"));

        assertEquals(1, a.getGenerateCount());
        assertEquals(1, b.getGenerateCount());
        assertEquals(1, c.getGenerateCount());
    }

    @Test
    void testNeverRetryFailedProvider() {
        MockProvider a = new MockProvider("A", true);
        MockProvider b = new MockProvider("B", false);
        registry.setAvailableProviders(List.of(a, b));
        selectionService.setProvidersToReturn(List.of(a, b));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);
        executionService.execute(request);

        // Verify A was only called once, not retried endlessly
        assertEquals(1, a.getGenerateCount());
    }

    @Test
    void testNoProviders() {
        registry.setAvailableProviders(Collections.emptyList());

        LlmRequest request = new LlmRequest("Test", null, null, null, null);
        ProviderException ex = assertThrows(ProviderException.class, () -> executionService.execute(request));
        assertTrue(ex.getMessage().contains("No configured AI provider available"));
    }

    @Test
    void testRequestRemainsUnchanged() {
        MockProvider a = new MockProvider("A", true);
        MockProvider b = new MockProvider("B", false);
        registry.setAvailableProviders(List.of(a, b));
        selectionService.setProvidersToReturn(List.of(a, b));

        LlmRequest request = new LlmRequest("Immutability Test", "Sys", "model", 0.5, 100);
        executionService.execute(request);

        // Same exact request reference should be passed
        assertSame(request, a.getLastReceivedRequest());
        assertSame(request, b.getLastReceivedRequest());
    }

    @Test
    void testConcurrentExecutionIsolation() throws InterruptedException {
        int threadCount = 20;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(threadCount);
        
        MockProvider a = new MockProvider("A", true);
        MockProvider b = new MockProvider("B", true);
        MockProvider c = new MockProvider("C", false);
        registry.setAvailableProviders(List.of(a, b, c));
        selectionService.setProvidersToReturn(List.of(a, b, c));

        AtomicInteger successResponses = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    LlmRequest request = new LlmRequest("Concurrent", null, null, null, null);
                    LlmResponse response = executionService.execute(request);
                    if ("C".equals(response.provider)) {
                        successResponses.incrementAndGet();
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        assertTrue(latch.await(10, TimeUnit.SECONDS));
        executor.shutdown();

        // 20 requests total, C is the only successful provider
        assertEquals(20, successResponses.get());
        
        // A and B should both fail exactly 20 times (once per execution request)
        assertEquals(20, a.getGenerateCount());
        assertEquals(20, b.getGenerateCount());
        
        // C should succeed exactly 20 times (once per execution request)
        assertEquals(20, c.getGenerateCount());
    }

    // --- Mocks ---

    private static class MockProviderRegistry extends ProviderRegistry {
        private List<LlmProvider> available = Collections.emptyList();

        public MockProviderRegistry() {
            super(Collections.emptyList());
        }

        public void setAvailableProviders(List<LlmProvider> available) {
            this.available = available;
        }

        @Override
        public List<LlmProvider> getAvailableProviders() {
            return available;
        }
    }

    private static class MockProviderHealthTracker extends ProviderHealthTracker {
        public List<String> recordedSuccesses = new ArrayList<>();
        public List<String> recordedFailures = new ArrayList<>();

        public MockProviderHealthTracker() {
            super(3, 60, java.time.Clock.systemUTC());
        }

        @Override
        public void recordSuccess(LlmProvider provider) {
            recordedSuccesses.add(provider.getProviderName());
        }

        @Override
        public void recordFailure(LlmProvider provider) {
            recordedFailures.add(provider.getProviderName());
        }
    }

    private static class MockProviderSelectionService extends ProviderSelectionService {
        private List<LlmProvider> providersToReturn = new ArrayList<>();

        public MockProviderSelectionService() {
            super(null, null, null);
        }

        public void setProvidersToReturn(List<LlmProvider> providersToReturn) {
            this.providersToReturn = providersToReturn;
        }

        @Override
        public LlmProvider selectProvider(Set<String> excludeProviders) {
            for (LlmProvider provider : providersToReturn) {
                if (excludeProviders == null || !excludeProviders.contains(provider.getProviderName())) {
                    return provider;
                }
            }
            throw new ProviderException("No eligible provider available");
        }
    }

    private static class MockProvider implements LlmProvider {
        private final String name;
        private final boolean simulateFailure;
        private AtomicInteger generateCount = new AtomicInteger(0);
        private LlmRequest lastReceivedRequest = null;

        public MockProvider(String name, boolean simulateFailure) {
            this.name = name;
            this.simulateFailure = simulateFailure;
        }

        @Override
        public LlmResponse generate(LlmRequest request) {
            generateCount.incrementAndGet();
            lastReceivedRequest = request;
            if (simulateFailure) {
                throw new ProviderException("Simulated provider failure");
            }
            return new LlmResponse("Mock Content", name, "mock-model");
        }

        @Override
        public String getProviderName() {
            return name;
        }

        @Override
        public boolean isConfigured() {
            return true;
        }

        public int getGenerateCount() {
            return generateCount.get();
        }

        public LlmRequest getLastReceivedRequest() {
            return lastReceivedRequest;
        }
    }
}
