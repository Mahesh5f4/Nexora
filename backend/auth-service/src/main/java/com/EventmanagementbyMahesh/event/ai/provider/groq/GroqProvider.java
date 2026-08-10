package com.EventmanagementbyMahesh.event.ai.provider.groq;

import com.EventmanagementbyMahesh.event.ai.exception.ProviderException;
import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.provider.LlmProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.ArrayList;
import java.util.List;

@Service
public class GroqProvider implements LlmProvider {

    private final RestClient restClient;

    @Value("${ai.providers.groq.api-key:${GROQ_API_KEY:}}")
    private String apiKey;

    @Value("${ai.providers.groq.model:${GROQ_MODEL:llama-3.3-70b-versatile}}")
    private String defaultModel;

    @Value("${ai.providers.groq.base-url:${GROQ_BASE_URL:https://api.groq.com/openai/v1/chat/completions}}")
    private String baseUrl;

    public GroqProvider(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder.build();
    }

    @Override
    public String getProviderName() {
        return "groq";
    }

    @Override
    public boolean isConfigured() {
        return apiKey != null && !apiKey.trim().isEmpty();
    }

    @Override
    public LlmResponse generate(LlmRequest request) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new ProviderException("Groq API key is not configured.");
        }

        String model = (request.model != null && !request.model.isEmpty()) ? request.model : defaultModel;
        GroqRequest groqReq = mapToGroqRequest(request, model);

        try {
            GroqResponse groqRes = restClient.post()
                    .uri(baseUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + apiKey)
                    .body(groqReq)
                    .retrieve()
                    .body(GroqResponse.class);

            return mapToLlmResponse(groqRes, model);

        } catch (RestClientResponseException e) {
            throw new ProviderException(
                    "Groq API returned an error: " + e.getStatusCode() + " - " + e.getResponseBodyAsString(), e);
        } catch (ProviderException e) {
            throw e;
        } catch (Exception e) {
            throw new ProviderException("Failed to communicate with Groq API: " + e.getMessage(), e);
        }
    }

    private GroqRequest mapToGroqRequest(LlmRequest request, String model) {
        GroqRequest groqReq = new GroqRequest();
        groqReq.model = model;
        groqReq.temperature = request.temperature;
        groqReq.maxTokens = request.maxTokens;

        List<GroqRequest.Message> messages = new ArrayList<>();

        if (request.systemPrompt != null && !request.systemPrompt.isEmpty()) {
            messages.add(new GroqRequest.Message("system", request.systemPrompt));
        }

        if (request.prompt != null) {
            messages.add(new GroqRequest.Message("user", request.prompt));
        }

        groqReq.messages = messages;
        return groqReq;
    }

    private LlmResponse mapToLlmResponse(GroqResponse groqRes, String model) {
        if (groqRes == null) {
            throw new ProviderException("Groq returned an empty response body.");
        }

        if (groqRes.error != null) {
            throw new ProviderException("Groq API error: " + groqRes.error.message);
        }

        if (groqRes.choices == null || groqRes.choices.isEmpty()) {
            throw new ProviderException("Groq returned no choices.");
        }

        GroqResponse.Choice choice = groqRes.choices.get(0);
        if (choice.message == null || choice.message.content == null || choice.message.content.isEmpty()) {
            throw new ProviderException("Groq returned a choice with no content.");
        }

        String responseModel = (groqRes.model != null) ? groqRes.model : model;
        LlmResponse response = new LlmResponse(choice.message.content, getProviderName(), responseModel);

        if (groqRes.usage != null) {
            response.inputTokens = groqRes.usage.promptTokens;
            response.outputTokens = groqRes.usage.completionTokens;
            response.totalTokens = groqRes.usage.totalTokens;
        }

        return response;
    }
}
