package com.EventmanagementbyMahesh.event.ai.research;

import com.EventmanagementbyMahesh.event.ai.research.retrieval.NoOpRetrievalProvider;
import com.EventmanagementbyMahesh.event.ai.research.retrieval.RetrievalResult;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RetrievalProviderTest {

    @Test
    void noOpProvider_returnsEmptyResult() {
        NoOpRetrievalProvider provider = new NoOpRetrievalProvider();
        RetrievalResult result = provider.retrieve("Compare Redis vs Memcached");

        assertNotNull(result);
        assertFalse(result.hasDocuments());
        assertTrue(result.getDocuments().isEmpty());
        assertEquals("noop", result.getSourceProvider());
    }

    @Test
    void noOpProvider_returnsEmptyRegardlessOfQuery() {
        NoOpRetrievalProvider provider = new NoOpRetrievalProvider();

        RetrievalResult r1 = provider.retrieve("any question");
        RetrievalResult r2 = provider.retrieve("");
        RetrievalResult r3 = provider.retrieve("a very long and complex research query about distributed systems");

        assertFalse(r1.hasDocuments());
        assertFalse(r2.hasDocuments());
        assertFalse(r3.hasDocuments());
    }

    @Test
    void noOpProvider_providerNameIsNoop() {
        NoOpRetrievalProvider provider = new NoOpRetrievalProvider();
        assertEquals("noop", provider.getProviderName());
    }

    @Test
    void retrievalResult_empty_factoryMethod() {
        RetrievalResult result = RetrievalResult.empty("test-provider");
        assertFalse(result.hasDocuments());
        assertEquals("test-provider", result.getSourceProvider());
        assertTrue(result.getDocuments().isEmpty());
    }
}
