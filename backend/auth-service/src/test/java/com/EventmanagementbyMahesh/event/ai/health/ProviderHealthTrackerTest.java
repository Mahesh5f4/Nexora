package com.EventmanagementbyMahesh.event.ai.health;

import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.provider.LlmProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

class ProviderHealthTrackerTest {

    private TestClock testClock;
    private ProviderHealthTracker tracker;

    @BeforeEach
    void setUp() {
        testClock = new TestClock(Instant.now());
        // Threshold: 3, Cooldown: 60s
        tracker = new ProviderHealthTracker(3, 60, testClock);
    }

    @Test
    void testNewProviderIsHealthy() {
        MockProvider provider = new MockProvider("A");
        assertTrue(tracker.isHealthy(provider));
    }

    @Test
    void testFailureBelowThresholdRemainsHealthy() {
        MockProvider provider = new MockProvider("A");
        tracker.recordFailure(provider);
        assertTrue(tracker.isHealthy(provider));

        tracker.recordFailure(provider);
        assertTrue(tracker.isHealthy(provider));
    }

    @Test
    void testThresholdFailureBecomesUnhealthy() {
        MockProvider provider = new MockProvider("A");
        tracker.recordFailure(provider);
        tracker.recordFailure(provider);
        tracker.recordFailure(provider); // 3rd failure

        assertFalse(tracker.isHealthy(provider));
    }

    @Test
    void testSuccessResetsFailures() {
        MockProvider provider = new MockProvider("A");
        tracker.recordFailure(provider);
        tracker.recordFailure(provider);
        
        // Success before threshold should reset
        tracker.recordSuccess(provider);
        
        // 2 more failures should NOT trigger threshold (total would be 4, but consecutive is 2)
        tracker.recordFailure(provider);
        tracker.recordFailure(provider);

        assertTrue(tracker.isHealthy(provider));
    }

    @Test
    void testCooldownRecoversHealth() {
        MockProvider provider = new MockProvider("A");
        tracker.recordFailure(provider);
        tracker.recordFailure(provider);
        tracker.recordFailure(provider); // 3rd failure

        assertFalse(tracker.isHealthy(provider));

        // Advance clock by 59 seconds (still unhealthy)
        testClock.advanceSeconds(59);
        assertFalse(tracker.isHealthy(provider));

        // Advance clock by 1 more second (cooldown expired)
        testClock.advanceSeconds(1);
        assertTrue(tracker.isHealthy(provider));
    }

    @Test
    void testHealthyProviderFiltering() {
        MockProvider a = new MockProvider("A");
        MockProvider b = new MockProvider("B");
        MockProvider c = new MockProvider("C");

        // Make B unhealthy
        tracker.recordFailure(b);
        tracker.recordFailure(b);
        tracker.recordFailure(b);

        List<LlmProvider> original = List.of(a, b, c);
        List<LlmProvider> healthy = tracker.getHealthyProviders(original);

        assertEquals(2, healthy.size());
        assertEquals("A", healthy.get(0).getProviderName());
        assertEquals("C", healthy.get(1).getProviderName());
    }
    
    @Test
    void testNullAndEmptyInputs() {
        assertTrue(tracker.getHealthyProviders(null).isEmpty());
        assertTrue(tracker.getHealthyProviders(Collections.emptyList()).isEmpty());
        assertFalse(tracker.isHealthy(null));
        assertDoesNotThrow(() -> tracker.recordFailure(null));
        assertDoesNotThrow(() -> tracker.recordSuccess(null));
    }

    @Test
    void testConcurrentFailures() throws InterruptedException {
        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(threadCount);
        
        MockProvider provider = new MockProvider("P1");

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    for (int j = 0; j < 100; j++) {
                        tracker.recordFailure(provider);
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        assertTrue(latch.await(10, TimeUnit.SECONDS));
        executor.shutdown();

        // Total 1000 failures, should be extremely unhealthy
        assertFalse(tracker.isHealthy(provider));

        // Let it cooldown
        testClock.advanceSeconds(61);
        assertTrue(tracker.isHealthy(provider));

        // Now hit success 10 times concurrently
        ExecutorService successExecutor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch successLatch = new CountDownLatch(threadCount);
        for (int i = 0; i < threadCount; i++) {
            successExecutor.submit(() -> {
                try {
                    tracker.recordSuccess(provider);
                } finally {
                    successLatch.countDown();
                }
            });
        }
        assertTrue(successLatch.await(5, TimeUnit.SECONDS));
        successExecutor.shutdown();
        
        // Still healthy
        assertTrue(tracker.isHealthy(provider));
    }

    /**
     * Test Clock for deterministic time manipulation
     */
    private static class TestClock extends Clock {
        private final AtomicLong currentMillis;
        private final ZoneId zoneId = ZoneId.of("UTC");

        public TestClock(Instant initial) {
            this.currentMillis = new AtomicLong(initial.toEpochMilli());
        }

        public void advanceSeconds(long seconds) {
            currentMillis.addAndGet(seconds * 1000);
        }

        @Override
        public ZoneId getZone() { return zoneId; }

        @Override
        public Clock withZone(ZoneId zone) { return this; }

        @Override
        public Instant instant() {
            return Instant.ofEpochMilli(currentMillis.get());
        }
    }

    /**
     * Stub provider for health testing
     */
    private static class MockProvider implements LlmProvider {
        private final String name;

        public MockProvider(String name) { this.name = name; }

        @Override
        public LlmResponse generate(LlmRequest request) { return null; }

        @Override
        public String getProviderName() { return name; }

        @Override
        public boolean isConfigured() { return true; }
    }
}
