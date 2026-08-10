package com.EventmanagementbyMahesh.event.ai.research.retrieval;

import org.springframework.stereotype.Component;

/**
 * A no-operation retrieval provider.
 *
 * This is the initial safe implementation that establishes the retrieval architecture
 * without making any external calls (no internet, no Qdrant, no search APIs).
 *
 * Future tasks will add:
 *   - QdrantRetrievalProvider   (RAG with vector search)
 *   - WikipediaRetrievalProvider
 *   - WebSearchRetrievalProvider (Tavily, Brave, etc.)
 *
 * This class is the default Spring bean for RetrievalProvider.
 * Future implementations will be swapped in via configuration profiles or
 * a composite/strategy pattern.
 */
@Component
public class NoOpRetrievalProvider implements RetrievalProvider {

    @Override
    public RetrievalResult retrieve(String query) {
        // Intentionally returns no documents.
        // The LLM will answer from its own training data only.
        return RetrievalResult.empty(getProviderName());
    }

    @Override
    public String getProviderName() {
        return "noop";
    }
}
