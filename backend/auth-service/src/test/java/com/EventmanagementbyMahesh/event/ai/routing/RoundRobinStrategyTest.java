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

class RoundRobinStrategyTest {

    private RoundRobinStrategy strategy;

    @BeforeEach
    void setUp() {
        strategy = new RoundRobinStrategy();
    }

    @Test
    void testBasicRotation() {
        List<LlmProvider> providers = List.of(
                new MockProvider("A"),
                new MockProvider("B"),
                new MockProvider("C")
        );

        assertEquals("A", strategy.select(providers).getProviderName());
        assertEquals("B", strategy.select(providers).getProviderName());
        assertEquals("C", strategy.select(providers).getProviderName());
        assertEquals("A", strategy.select(providers).getProviderName());
        assertEquals("B", strategy.select(providers).getProviderName());
        assertEquals("C", strategy.select(providers).getProviderName());
    }

    @Test
    void testSingleProvider() {
        List<LlmProvider> providers = List.of(new MockProvider("Gemini"));

        for (int i = 0; i < 5; i++) {
            assertEquals("Gemini", strategy.select(providers).getProviderName());
        }
    }

    @Test
    void testTwoProviders() {
        List<LlmProvider> providers = List.of(
                new MockProvider("A"),
                new MockProvider("B")
        );

        assertEquals("A", strategy.select(providers).getProviderName());
        assertEquals("B", strategy.select(providers).getProviderName());
        assertEquals("A", strategy.select(providers).getProviderName());
        assertEquals("B", strategy.select(providers).getProviderName());
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
    void testMoreThanFourProviders() {
        List<LlmProvider> providers = List.of(
                new MockProvider("A"),
                new MockProvider("B"),
                new MockProvider("C"),
                new MockProvider("D"),
                new MockProvider("E")
        );

        assertEquals("A", strategy.select(providers).getProviderName());
        assertEquals("B", strategy.select(providers).getProviderName());
        assertEquals("C", strategy.select(providers).getProviderName());
        assertEquals("D", strategy.select(providers).getProviderName());
        assertEquals("E", strategy.select(providers).getProviderName());
        assertEquals("A", strategy.select(providers).getProviderName());
    }

    @Test
    void testDynamicListSize() {
        List<LlmProvider> threeProviders = List.of(
                new MockProvider("A"),
                new MockProvider("B"),
                new MockProvider("C")
        );
        assertEquals("A", strategy.select(threeProviders).getProviderName());
        assertEquals("B", strategy.select(threeProviders).getProviderName());

        List<LlmProvider> twoProviders = List.of(
                new MockProvider("A"),
                new MockProvider("B")
        );
        // Counter is at 2, 2 % 2 == 0 -> "A"
        assertEquals("A", strategy.select(twoProviders).getProviderName());
        
        // Counter is at 3, 3 % 2 == 1 -> "B"
        assertEquals("B", strategy.select(twoProviders).getProviderName());

        List<LlmProvider> fourProviders = List.of(
                new MockProvider("A"),
                new MockProvider("B"),
                new MockProvider("C"),
                new MockProvider("D")
        );
        // Counter is at 4, 4 % 4 == 0 -> "A"
        assertEquals("A", strategy.select(fourProviders).getProviderName());
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

        // Total requests = 10000. With 3 providers, they should be distributed almost equally.
        // E.g., 3334, 3333, 3333.
        int total = p1Count.get() + p2Count.get() + p3Count.get();
        assertEquals(10000, total);
        
        assertTrue(Math.abs(p1Count.get() - p2Count.get()) <= 1);
        assertTrue(Math.abs(p2Count.get() - p3Count.get()) <= 1);
        assertTrue(Math.abs(p1Count.get() - p3Count.get()) <= 1);
    }

    @Test
    void testIntegerOverflowSafety() {
        List<LlmProvider> providers = List.of(
                new MockProvider("A"),
                new MockProvider("B"),
                new MockProvider("C")
        );

        // Force the counter right near the Integer overflow boundary
        org.springframework.test.util.ReflectionTestUtils.setField(
                strategy, 
                "counter", 
                new AtomicInteger(Integer.MAX_VALUE - 1)
        );

        // Integer.MAX_VALUE - 1
        assertNotNull(strategy.select(providers));
        // Integer.MAX_VALUE
        assertNotNull(strategy.select(providers));
        // Integer.MIN_VALUE (Overflows into negatives)
        assertNotNull(strategy.select(providers));
        // Integer.MIN_VALUE + 1
        assertNotNull(strategy.select(providers));
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
