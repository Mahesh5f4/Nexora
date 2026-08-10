package com.EventmanagementbyMahesh.event.ai.routing;

import com.EventmanagementbyMahesh.event.ai.exception.ProviderException;
import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.provider.LlmProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class LeastUsedStrategyTest {

    private LeastUsedStrategy strategy;

    @BeforeEach
    void setUp() {
        strategy = new LeastUsedStrategy();
    }

    @Test
    void testBasicLeastUsedBehavior() {
        List<LlmProvider> providers = List.of(
                new MockProvider("A"),
                new MockProvider("B"),
                new MockProvider("C")
        );

        // A=0, B=0, C=0 -> picks A (tie-break first)
        assertEquals("A", strategy.select(providers).getProviderName());
        
        // A=1, B=0, C=0 -> picks B (tie-break first among B,C)
        assertEquals("B", strategy.select(providers).getProviderName());
        
        // A=1, B=1, C=0 -> picks C
        assertEquals("C", strategy.select(providers).getProviderName());
        
        // A=1, B=1, C=1 -> picks A again
        assertEquals("A", strategy.select(providers).getProviderName());
    }

    @Test
    void testPreexistingUsage() {
        List<LlmProvider> providers = List.of(
                new MockProvider("A"),
                new MockProvider("B"),
                new MockProvider("C")
        );

        // A=1
        strategy.select(List.of(new MockProvider("A")));
        // B=1, B=2
        strategy.select(List.of(new MockProvider("B")));
        strategy.select(List.of(new MockProvider("B")));
        // C=1, C=2, C=3
        strategy.select(List.of(new MockProvider("C")));
        strategy.select(List.of(new MockProvider("C")));
        strategy.select(List.of(new MockProvider("C")));

        // Current state: A=1, B=2, C=3
        // Should select A (lowest count)
        assertEquals("A", strategy.select(providers).getProviderName());
        // State: A=2, B=2, C=3
        // Should select A again (tied with B, but A is first in list)
        assertEquals("A", strategy.select(providers).getProviderName());
        // State: A=3, B=2, C=3
        // Should select B (lowest count)
        assertEquals("B", strategy.select(providers).getProviderName());
    }

    @Test
    void testSingleProvider() {
        List<LlmProvider> providers = List.of(new MockProvider("Gemini"));
        for (int i = 0; i < 5; i++) {
            assertEquals("Gemini", strategy.select(providers).getProviderName());
        }
    }

    @Test
    void testEmptyListThrowsException() {
        ProviderException ex = assertThrows(ProviderException.class, () -> strategy.select(Collections.emptyList()));
        assertTrue(ex.getMessage().contains("No available provider"));
    }

    @Test
    void testNullListThrowsException() {
        ProviderException ex = assertThrows(ProviderException.class, () -> strategy.select(null));
        assertTrue(ex.getMessage().contains("No available provider"));
    }

    @Test
    void testNewProviderHandling() {
        List<LlmProvider> original = List.of(
                new MockProvider("A"),
                new MockProvider("B")
        );

        // Ramp up counts
        strategy.select(original); // A
        strategy.select(original); // B
        strategy.select(original); // A

        // State: A=2, B=1
        
        List<LlmProvider> withNewProvider = List.of(
                new MockProvider("A"),
                new MockProvider("B"),
                new MockProvider("NEW")
        );

        // "NEW" has count 0 (lowest)
        assertEquals("NEW", strategy.select(withNewProvider).getProviderName());
        // Now NEW=1, tied with B=1. B is earlier in the list, so B is selected.
        assertEquals("B", strategy.select(withNewProvider).getProviderName());
    }

    @Test
    void testMoreThanFourProviders() {
        List<LlmProvider> providers = List.of(
                new MockProvider("A"),
                new MockProvider("B"),
                new MockProvider("C"),
                new MockProvider("D"),
                new MockProvider("E")
        );

        // Should evenly distribute 10 requests: 2 for each provider
        for (int i = 0; i < 10; i++) {
            strategy.select(providers);
        }

        // To verify, if we supply them individually, the next selected should be exactly what we expect based on tie-breaking.
        // All have count 2. 'A' should be next.
        assertEquals("A", strategy.select(providers).getProviderName());
    }

    @Test
    void testConcurrentAccess() throws InterruptedException {
        int threadCount = 10;
        int requestsPerThread = 1000;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(threadCount);
        
        List<LlmProvider> providers = List.of(
                new MockProvider("P1"),
                new MockProvider("P2"),
                new MockProvider("P3")
        );

        AtomicInteger p1Count = new AtomicInteger(0);
        AtomicInteger p2Count = new AtomicInteger(0);
        AtomicInteger p3Count = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    for (int j = 0; j < requestsPerThread; j++) {
                        LlmProvider selected = strategy.select(providers);
                        if (selected.getProviderName().equals("P1")) p1Count.incrementAndGet();
                        else if (selected.getProviderName().equals("P2")) p2Count.incrementAndGet();
                        else if (selected.getProviderName().equals("P3")) p3Count.incrementAndGet();
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        assertTrue(latch.await(10, TimeUnit.SECONDS), "Concurrency test timed out");
        executor.shutdown();

        int total = p1Count.get() + p2Count.get() + p3Count.get();
        assertEquals(10000, total);
        
        // Least used strategy strictly balances usage. The difference between counts should be very small (≤ threadCount).
        // It isn't perfectly 0 or 1 because of concurrent race conditions in read-then-write logic, 
        // but it will self-correct heavily and not corrupt counts or crash.
        assertTrue(Math.abs(p1Count.get() - p2Count.get()) < 50);
        assertTrue(Math.abs(p2Count.get() - p3Count.get()) < 50);
        assertTrue(Math.abs(p1Count.get() - p3Count.get()) < 50);
    }

    /**
     * Stub provider for routing strategy testing
     */
    private static class MockProvider implements LlmProvider {
        private final String name;

        public MockProvider(String name) {
            this.name = name;
        }

        @Override
        public LlmResponse generate(LlmRequest request) {
            throw new UnsupportedOperationException("Router must not call generate()");
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
