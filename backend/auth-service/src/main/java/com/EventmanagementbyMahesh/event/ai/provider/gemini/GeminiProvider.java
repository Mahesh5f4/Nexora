package com.EventmanagementbyMahesh.event.ai.provider.gemini;

import com.EventmanagementbyMahesh.event.ai.exception.ProviderException;
import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.provider.LlmProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;

@Service
public class GeminiProvider implements LlmProvider {

    private final RestClient restClient;
    
    @Value("${ai.providers.gemini.api-key:${GEMINI_API_KEY:}}")
    private String apiKey;

    @Value("${ai.providers.gemini.model:${GEMINI_MODEL:gemini-2.5-flash}}")
    private String defaultModel;

    @Value("${ai.providers.gemini.base-url:${GEMINI_BASE_URL:https://generativelanguage.googleapis.com/v1beta/models/}}")
    private String baseUrl;

    public GeminiProvider(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder.build();
    }

    @Override
    public String getProviderName() {
        return "gemini";
    }

    @Override
    public boolean isConfigured() {
        return apiKey != null && !apiKey.trim().isEmpty();
    }

    @Override
    public LlmResponse generate(LlmRequest request) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new ProviderException("Gemini API key is not configured.");
        }

        String model = (request.model != null && !request.model.isEmpty()) ? request.model : defaultModel;
        GeminiRequest geminiReq = mapToGeminiRequest(request);

        String url = String.format("%s%s:generateContent?key=%s", baseUrl, model, apiKey);

        try {
            GeminiResponse geminiRes = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(geminiReq)
                    .retrieve()
                    .body(GeminiResponse.class);

            return mapToLlmResponse(geminiRes, model);

        } catch (RestClientResponseException e) {
            throw new ProviderException("Gemini API returned an error: " + e.getStatusCode() + " - " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            throw new ProviderException("Failed to communicate with Gemini API: " + e.getMessage(), e);
        }
    }

    private GeminiRequest mapToGeminiRequest(LlmRequest request) {
        GeminiRequest geminiReq = new GeminiRequest();
        
        if (request.prompt != null) {
            geminiReq.contents = List.of(new GeminiRequest.Content(List.of(new GeminiRequest.Part(request.prompt))));
        }

        if (request.systemPrompt != null && !request.systemPrompt.isEmpty()) {
            geminiReq.systemInstruction = new GeminiRequest.Content(List.of(new GeminiRequest.Part(request.systemPrompt)));
        }

        if (request.temperature != null || request.maxTokens != null) {
            geminiReq.generationConfig = new GeminiRequest.GenerationConfig();
            geminiReq.generationConfig.temperature = request.temperature;
            geminiReq.generationConfig.maxOutputTokens = request.maxTokens;
        }

        return geminiReq;
    }

    private LlmResponse mapToLlmResponse(GeminiResponse geminiRes, String model) {
        if (geminiRes == null) {
            throw new ProviderException("Gemini returned an empty response body.");
        }

        if (geminiRes.error != null) {
            throw new ProviderException("Gemini API error: " + geminiRes.error.message);
        }

        if (geminiRes.candidates == null || geminiRes.candidates.isEmpty()) {
            throw new ProviderException("Gemini returned no candidates.");
        }

        GeminiResponse.Candidate candidate = geminiRes.candidates.get(0);
        if (candidate.content == null || candidate.content.parts == null || candidate.content.parts.isEmpty()) {
            throw new ProviderException("Gemini returned a candidate with no text parts.");
        }

        String text = candidate.content.parts.get(0).text;
        
        LlmResponse response = new LlmResponse(text, getProviderName(), model);
        
        if (geminiRes.usageMetadata != null) {
            response.inputTokens = geminiRes.usageMetadata.promptTokenCount;
            response.outputTokens = geminiRes.usageMetadata.candidatesTokenCount;
            response.totalTokens = geminiRes.usageMetadata.totalTokenCount;
        }
        
        return response;
    }
}
