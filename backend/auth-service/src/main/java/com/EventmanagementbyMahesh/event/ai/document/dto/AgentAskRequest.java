package com.EventmanagementbyMahesh.event.ai.document.dto;

import java.util.List;
import com.EventmanagementbyMahesh.event.ai.chat.dto.ConversationMessageDto;

public class AgentAskRequest {
    private String query;
    private String userId;
    private int topK = 5;
    private String conversationId;
    private List<ConversationMessageDto> messages;
    private boolean forceWebSearch;
    private boolean forceRag;
    private String documentId;
    private String mode;

    public AgentAskRequest() {}

    public AgentAskRequest(String query, String userId, int topK, String conversationId, List<ConversationMessageDto> messages) {
        this.query = query;
        this.userId = userId;
        this.topK = topK;
        this.conversationId = conversationId;
        this.messages = messages;
        this.forceWebSearch = false;
    }

    public AgentAskRequest(String query, String userId, int topK, String conversationId, List<ConversationMessageDto> messages, boolean forceWebSearch) {
        this.query = query;
        this.userId = userId;
        this.topK = topK;
        this.conversationId = conversationId;
        this.messages = messages;
        this.forceWebSearch = forceWebSearch;
    }

    public String getQuery() { return query; }
    public void setQuery(String query) { this.query = query; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public int getTopK() { return topK; }
    public void setTopK(int topK) { this.topK = topK; }

    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }

    public List<ConversationMessageDto> getMessages() { return messages; }
    public void setMessages(List<ConversationMessageDto> messages) {
        this.messages = messages;
    }

    public boolean isForceWebSearch() {
        return forceWebSearch;
    }

    public void setForceWebSearch(boolean forceWebSearch) {
        this.forceWebSearch = forceWebSearch;
    }

    public boolean isForceRag() {
        return forceRag;
    }

    public void setForceRag(boolean forceRag) {
        this.forceRag = forceRag;
    }

    public String getDocumentId() {
        return documentId;
    }

    public void setDocumentId(String documentId) {
        this.documentId = documentId;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    private List<String> images;

    public List<String> getImages() {
        return images;
    }

    public void setImages(List<String> images) {
        this.images = images;
    }
}
