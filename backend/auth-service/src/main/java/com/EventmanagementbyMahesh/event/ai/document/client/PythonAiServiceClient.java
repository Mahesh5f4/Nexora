package com.EventmanagementbyMahesh.event.ai.document.client;

import com.EventmanagementbyMahesh.event.ai.document.entity.Document;
import com.EventmanagementbyMahesh.event.ai.document.dto.RetrievalRequest;
import com.EventmanagementbyMahesh.event.ai.document.dto.RetrievalResponse;
import com.EventmanagementbyMahesh.event.ai.document.dto.AgentAskRequest;
import com.EventmanagementbyMahesh.event.ai.document.dto.AgentAskResponse;
import com.EventmanagementbyMahesh.event.ai.document.dto.AiExecuteRequest;
import com.EventmanagementbyMahesh.event.ai.document.dto.AiExecuteResponse;
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
            @Value("${ai.internal.token:super-secret-dev-token}") String internalToken) {
        this.restTemplate = restTemplate;
        this.pythonServiceUrl = pythonServiceUrl;
        this.internalToken = internalToken;
    }

    public void indexDocument(Document doc, byte[] fileContent) {
        String url = pythonServiceUrl + "/internal/rag/index";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setBearerAuth(internalToken);
        addUserJwtHeaderIfPresent(headers);

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
        addUserJwtHeaderIfPresent(headers);
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);
        
        restTemplate.exchange(url, org.springframework.http.HttpMethod.DELETE, requestEntity, String.class);
    }
    
    public RetrievalResponse retrieveDocuments(String query, Long userId, int topK) {
        String url = pythonServiceUrl + "/internal/rag/retrieve";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(internalToken);
        addUserJwtHeaderIfPresent(headers);

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

    public com.EventmanagementbyMahesh.event.ai.document.dto.RagAnswerResponse askQuestion(String query, Long userId, int topK, String documentId) {
        String url = pythonServiceUrl + "/internal/rag/answer";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(internalToken);
        addUserJwtHeaderIfPresent(headers);

        java.util.Map<String, Object> requestBody = new java.util.HashMap<>();
        requestBody.put("query", query);
        requestBody.put("userId", String.valueOf(userId));
        requestBody.put("topK", topK);
        if (documentId != null && !documentId.isBlank()) {
            requestBody.put("documentId", documentId);
        }

        HttpEntity<java.util.Map<String, Object>> requestEntity = new HttpEntity<>(requestBody, headers);
        try {
            ResponseEntity<com.EventmanagementbyMahesh.event.ai.document.dto.RagAnswerResponse> response = restTemplate.postForEntity(url, requestEntity, com.EventmanagementbyMahesh.event.ai.document.dto.RagAnswerResponse.class);
            
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new RuntimeException("Failed to get RAG answer from AI service");
            }
    
            return response.getBody();
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            org.slf4j.LoggerFactory.getLogger(PythonAiServiceClient.class).error("AI Service Error in askQuestion: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            if (e.getStatusCode() == org.springframework.http.HttpStatus.TOO_MANY_REQUESTS) {
                throw new com.EventmanagementbyMahesh.event.ai.exception.UsageExhaustedException("Usage limit reached. Please try again after the session resets.", null);
            }
            if (e.getStatusCode() == org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE) {
                throw new com.EventmanagementbyMahesh.event.ai.exception.ProviderException("AI service temporarily unavailable");
            }
            throw new RuntimeException("AI service failed: " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(PythonAiServiceClient.class).error("AI Service Error in askQuestion: ", e);
            throw new RuntimeException("AI service request failed", e);
        }
    }

    private void addUserJwtHeaderIfPresent(HttpHeaders headers) {
        org.springframework.web.context.request.RequestAttributes attributes = org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
        if (attributes instanceof org.springframework.web.context.request.ServletRequestAttributes) {
            jakarta.servlet.http.HttpServletRequest request = ((org.springframework.web.context.request.ServletRequestAttributes) attributes).getRequest();
            String authHeader = request.getHeader("Authorization");
            if (org.springframework.util.StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
                headers.set("X-User-Jwt", authHeader.substring(7));
            }
        }
    }

    public AgentAskResponse askAgent(AgentAskRequest request) {
        String url = pythonServiceUrl + "/internal/agent/ask";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(internalToken);
        addUserJwtHeaderIfPresent(headers);

        HttpEntity<AgentAskRequest> requestEntity = new HttpEntity<>(request, headers);
        try {
            ResponseEntity<AgentAskResponse> response = restTemplate.postForEntity(url, requestEntity, AgentAskResponse.class);
            
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new RuntimeException("Failed to get answer from AI agent service, status: " + response.getStatusCode());
            }

            return response.getBody();
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            org.slf4j.LoggerFactory.getLogger(PythonAiServiceClient.class).error("AI Service Error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            if (e.getStatusCode() == org.springframework.http.HttpStatus.TOO_MANY_REQUESTS) {
                throw new com.EventmanagementbyMahesh.event.ai.exception.UsageExhaustedException("Usage limit reached. Please try again after the session resets.", null);
            }
            throw new RuntimeException("AI service failed: " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(PythonAiServiceClient.class).error("AI Service Error: ", e);
            throw new RuntimeException("AI service request failed", e);
        }
    }

    public AiExecuteResponse executePrompt(AiExecuteRequest request) {
        String url = pythonServiceUrl + "/internal/agent/execute";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(internalToken);
        addUserJwtHeaderIfPresent(headers);

        HttpEntity<AiExecuteRequest> requestEntity = new HttpEntity<>(request, headers);
        try {
            ResponseEntity<AiExecuteResponse> response = restTemplate.postForEntity(url, requestEntity, AiExecuteResponse.class);
            
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new RuntimeException("Failed to get answer from AI agent service, status: " + response.getStatusCode());
            }

            return response.getBody();
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            org.slf4j.LoggerFactory.getLogger(PythonAiServiceClient.class).error("AI Service Error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("AI service failed: " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(PythonAiServiceClient.class).error("AI Service Error: ", e);
            throw new RuntimeException("AI service request failed", e);
        }
    }

    public void streamAgent(AgentAskRequest request, java.util.function.Consumer<String> onEvent, java.util.function.Consumer<Exception> onError, Runnable onComplete) {
        String url = pythonServiceUrl + "/internal/agent/stream";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(internalToken);
        addUserJwtHeaderIfPresent(headers);

        try {
            restTemplate.execute(
                url,
                org.springframework.http.HttpMethod.POST,
                clientHttpRequest -> {
                    clientHttpRequest.getHeaders().putAll(headers);
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    clientHttpRequest.getBody().write(mapper.writeValueAsBytes(request));
                },
                clientHttpResponse -> {
                    if (clientHttpResponse.getStatusCode().isError()) {
                        String errorBody = new String(clientHttpResponse.getBody().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                        org.slf4j.LoggerFactory.getLogger(PythonAiServiceClient.class).error("AI Service Error: {} - {}", clientHttpResponse.getStatusCode(), errorBody);
                        if (clientHttpResponse.getStatusCode() == org.springframework.http.HttpStatus.TOO_MANY_REQUESTS) {
                            onError.accept(new com.EventmanagementbyMahesh.event.ai.exception.UsageExhaustedException("Usage limit reached.", null));
                        } else {
                            onError.accept(new RuntimeException("AI service streaming failed: " + errorBody));
                        }
                        return null;
                    }

                    try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(clientHttpResponse.getBody(), java.nio.charset.StandardCharsets.UTF_8))) {
                        String line;
                        StringBuilder block = new StringBuilder();
                        while ((line = reader.readLine()) != null) {
                            if (line.isEmpty()) {
                                if (block.length() > 0) {
                                    onEvent.accept(block.toString());
                                    block.setLength(0);
                                }
                            } else {
                                block.append(line).append("\n");
                            }
                        }
                        if (block.length() > 0) {
                            onEvent.accept(block.toString());
                        }
                    } catch (Exception e) {
                        onError.accept(e);
                    }
                    onComplete.run();
                    return null;
                }
            );
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(PythonAiServiceClient.class).error("AI Service Error calling URL {}: ", url, e);
            onError.accept(e);
        }
    }

    public String listUserMemory(Long userId) {
        String url = pythonServiceUrl + "/internal/rag/memory?userId=" + userId;
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(internalToken);
        addUserJwtHeaderIfPresent(headers);
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        ResponseEntity<String> response = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, requestEntity, String.class);
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Failed to list user memory: " + response.getBody());
        }
        return response.getBody();
    }

    public void deleteUserMemory(String memoryId, Long userId) {
        String url = pythonServiceUrl + "/internal/rag/memory/" + memoryId + "?userId=" + userId;
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(internalToken);
        addUserJwtHeaderIfPresent(headers);
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        ResponseEntity<String> response = restTemplate.exchange(url, org.springframework.http.HttpMethod.DELETE, requestEntity, String.class);
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Failed to delete user memory: " + response.getBody());
        }
    }
}
