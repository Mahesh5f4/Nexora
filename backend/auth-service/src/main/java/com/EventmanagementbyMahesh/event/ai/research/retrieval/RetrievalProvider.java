package com.EventmanagementbyMahesh.event.ai.research.retrieval;

import java.util.List;

/**
 * Abstraction for all retrieval providers.
 * Implementations may retrieve from:
 *   - Wikipedia
 *   - arXiv
 *   - Qdrant (RAG)
 *   - Web Search (Tavily, Brave, etc.)
 *
 * Current task only includes NoOpRetrievalProvider.
 */
public interface RetrievalProvider {

    /**
     * Retrieve documents relevant to the given query.
     *
     * @param query the research query
     * @return a RetrievalResult containing zero or more documents
     */
    RetrievalResult retrieve(String query);

    /**
     * A short identifier for this retrieval provider, e.g. "noop", "wikipedia", "qdrant".
     */
    String getProviderName();
}
