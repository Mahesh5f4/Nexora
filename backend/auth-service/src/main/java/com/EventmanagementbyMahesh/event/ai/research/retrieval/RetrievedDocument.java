package com.EventmanagementbyMahesh.event.ai.research.retrieval;

import java.util.Map;

/**
 * A single document retrieved from a knowledge source.
 */
public class RetrievedDocument {

    private final String title;
    private final String content;
    private final String source;
    private final String url;
    private final Map<String, Object> metadata;

    public RetrievedDocument(String title, String content, String source, String url, Map<String, Object> metadata) {
        this.title = title;
        this.content = content;
        this.source = source;
        this.url = url;
        this.metadata = metadata;
    }

    public String getTitle() {
        return title;
    }

    public String getContent() {
        return content;
    }

    public String getSource() {
        return source;
    }

    public String getUrl() {
        return url;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }
}
