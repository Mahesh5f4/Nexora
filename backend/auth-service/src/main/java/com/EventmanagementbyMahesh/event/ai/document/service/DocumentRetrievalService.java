package com.EventmanagementbyMahesh.event.ai.document.service;

import com.EventmanagementbyMahesh.event.ai.document.client.PythonAiServiceClient;
import com.EventmanagementbyMahesh.event.ai.document.dto.RetrievalRequest;
import com.EventmanagementbyMahesh.event.ai.document.dto.RetrievalResponse;
import org.springframework.stereotype.Service;

@Service
public class DocumentRetrievalService {

    private final PythonAiServiceClient pythonAiServiceClient;

    public DocumentRetrievalService(PythonAiServiceClient pythonAiServiceClient) {
        this.pythonAiServiceClient = pythonAiServiceClient;
    }

    public RetrievalResponse searchDocuments(RetrievalRequest request, Long userId) {
        return pythonAiServiceClient.retrieveDocuments(request.getQuery(), userId, request.getTopK());
    }
}
