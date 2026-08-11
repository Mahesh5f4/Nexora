package com.EventmanagementbyMahesh.event.ai.document.client;

import com.EventmanagementbyMahesh.event.ai.document.entity.Document;
import com.EventmanagementbyMahesh.event.ai.document.dto.RetrievalRequest;
import com.EventmanagementbyMahesh.event.ai.document.dto.RetrievalResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

@Service
public class PythonAiServiceClient {

    private final RestTemplate restTemplate;
    private final String pythonServiceUrl;
    private final String internalToken;

    public PythonAiServiceClient(
            RestTemplate restTemplate,
            @Value("${ai.service.url:http://localhost:8001}") String pythonServiceUrl,
            @Value("${ai.internal.token:default-internal-token}") String internalToken) {
        this.restTemplate = restTemplate;
        this.pythonServiceUrl = pythonServiceUrl;
        this.internalToken = internalToken;
    }

    public void indexDocument(Document doc, byte[] fileContent) {
        String url = pythonServiceUrl + "/internal/rag/index";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setBearerAuth(internalToken);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("documentId", String.valueOf(doc.getId()));
        body.add("userId", String.valueOf(doc.getUserId()));
        body.add("filename", doc.getFilename());
        body.add("contentType", doc.getContentType());
        
        ByteArrayResource fileAsResource = new ByteArrayResource(fileContent) {
            @Override
            public String getFilename() {
                return doc.getFilename();
            }
        };
        body.add("file", fileAsResource);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(url, requestEntity, String.class);
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Failed to index document: " + response.getBody());
        }
    }
    
    public void deleteDocument(Long documentId, Long userId) {
        String url = pythonServiceUrl + "/internal/rag/documents/" + documentId + "?userId=" + userId;
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(internalToken);
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);
        
        restTemplate.exchange(url, org.springframework.http.HttpMethod.DELETE, requestEntity, String.class);
    }
    
    public RetrievalResponse retrieveDocuments(String query, Long userId, int topK) {
        String url = pythonServiceUrl + "/internal/rag/retrieve";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(internalToken);

        java.util.Map<String, Object> requestBody = new java.util.HashMap<>();
        requestBody.put("query", query);
        requestBody.put("userId", String.valueOf(userId));
        requestBody.put("topK", topK);

        HttpEntity<java.util.Map<String, Object>> requestEntity = new HttpEntity<>(requestBody, headers);
        ResponseEntity<RetrievalResponse> response = restTemplate.postForEntity(url, requestEntity, RetrievalResponse.class);
        
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new RuntimeException("Failed to retrieve documents from AI service");
        }
        
        return response.getBody();
    }

    public com.EventmanagementbyMahesh.event.ai.document.dto.RagAnswerResponse askQuestion(String query, Long userId, int topK) {
        String url = pythonServiceUrl + "/internal/rag/answer";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(internalToken);

        java.util.Map<String, Object> requestBody = new java.util.HashMap<>();
        requestBody.put("query", query);
        requestBody.put("userId", String.valueOf(userId));
        requestBody.put("topK", topK);

        HttpEntity<java.util.Map<String, Object>> requestEntity = new HttpEntity<>(requestBody, headers);
        ResponseEntity<com.EventmanagementbyMahesh.event.ai.document.dto.RagAnswerResponse> response = restTemplate.postForEntity(url, requestEntity, com.EventmanagementbyMahesh.event.ai.document.dto.RagAnswerResponse.class);
        
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new RuntimeException("Failed to get RAG answer from AI service");
        }

        return response.getBody();
    }
}
