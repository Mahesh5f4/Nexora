package com.EventmanagementbyMahesh.event.ai.document.service;

import com.EventmanagementbyMahesh.event.ai.document.client.PythonAiServiceClient;
import com.EventmanagementbyMahesh.event.ai.document.dto.RagAskRequest;
import com.EventmanagementbyMahesh.event.ai.document.dto.RagAnswerResponse;
import org.springframework.stereotype.Service;

@Service
public class DocumentQuestionService {

    private final PythonAiServiceClient pythonAiServiceClient;

    public DocumentQuestionService(PythonAiServiceClient pythonAiServiceClient) {
        this.pythonAiServiceClient = pythonAiServiceClient;
    }

    public RagAnswerResponse askQuestion(RagAskRequest request, Long userId) {
        return pythonAiServiceClient.askQuestion(request.getQuery(), userId, request.getTopK());
    }
}
