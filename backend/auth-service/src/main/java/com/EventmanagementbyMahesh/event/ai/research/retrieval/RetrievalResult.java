package com.EventmanagementbyMahesh.event.ai.research.retrieval;

import java.util.Collections;
import java.util.List;

/**
 * The result of a retrieval operation.
 * Contains zero or more retrieved documents and a source label.
 */
public class RetrievalResult {

    private final List<RetrievedDocument> documents;
    private final String sourceProvider;

    public RetrievalResult(List<RetrievedDocument> documents, String sourceProvider) {
        this.documents = documents != null ? Collections.unmodifiableList(documents) : Collections.emptyList();
        this.sourceProvider = sourceProvider;
    }

    /** Factory for an empty result (no retrieval performed). */
    public static RetrievalResult empty(String sourceProvider) {
        return new RetrievalResult(Collections.emptyList(), sourceProvider);
    }

    public boolean hasDocuments() {
        return !documents.isEmpty();
    }

    public List<RetrievedDocument> getDocuments() {
        return documents;
    }

    public String getSourceProvider() {
        return sourceProvider;
    }
}
