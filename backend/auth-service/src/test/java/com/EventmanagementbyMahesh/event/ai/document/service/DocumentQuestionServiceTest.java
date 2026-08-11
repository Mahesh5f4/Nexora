package com.EventmanagementbyMahesh.event.ai.document.service;

import com.EventmanagementbyMahesh.event.ai.document.client.PythonAiServiceClient;
import com.EventmanagementbyMahesh.event.ai.document.dto.RagAskRequest;
import com.EventmanagementbyMahesh.event.ai.document.dto.RagAnswerResponse;
import com.EventmanagementbyMahesh.event.ai.document.dto.RagSourceDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class DocumentQuestionServiceTest {

    @Mock
    private PythonAiServiceClient pythonAiServiceClient;

    @InjectMocks
    private DocumentQuestionService documentQuestionService;

    @Test
    void shouldAskQuestionSuccessfully() {
        Long userId = 1L;
        RagAskRequest request = new RagAskRequest("What is Spring Boot?", 5);
        
        RagSourceDto source = new RagSourceDto("doc1", "spring.txt", "chunk1", 0.98);
        RagAnswerResponse mockResponse = new RagAnswerResponse("Spring Boot is a framework.", List.of(source));

        when(pythonAiServiceClient.askQuestion("What is Spring Boot?", userId, 5)).thenReturn(mockResponse);

        RagAnswerResponse response = documentQuestionService.askQuestion(request, userId);

        assertEquals("Spring Boot is a framework.", response.getAnswer());
        assertEquals(1, response.getSources().size());
        assertEquals("doc1", response.getSources().get(0).getDocumentId());

        verify(pythonAiServiceClient).askQuestion("What is Spring Boot?", userId, 5);
    }
}
