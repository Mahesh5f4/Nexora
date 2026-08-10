package com.EventmanagementbyMahesh.event.ai.provider.cerebras;

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
public class CerebrasProvider implements LlmProvider {

    private final RestClient restClient;

    @Value("${ai.providers.cerebras.api-key:${CEREBRAS_API_KEY:}}")
    private String apiKey;

    @Value("${ai.providers.cerebras.model:${CEREBRAS_MODEL:gemma-4-31b}}")
    private String defaultModel;

    @Value("${ai.providers.cerebras.base-url:${CEREBRAS_BASE_URL:https://api.cerebras.ai/v1/chat/completions}}")
    private String baseUrl;

    public CerebrasProvider(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder.build();
    }

    @Override
    public String getProviderName() {
        return "cerebras";
    }

    @Override
    public boolean isConfigured() {
        return apiKey != null && !apiKey.trim().isEmpty();
    }

    @Override
    public LlmResponse generate(LlmRequest request) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new ProviderException("Cerebras API key is not configured.");
        }

        String model = (request.model != null && !request.model.isEmpty()) ? request.model : defaultModel;
        CerebrasRequest cerebrasReq = mapToCerebrasRequest(request, model);

        try {
            CerebrasResponse cerebrasRes = restClient.post()
                    .uri(baseUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + apiKey)
                    .body(cerebrasReq)
                    .retrieve()
                    .body(CerebrasResponse.class);

            return mapToLlmResponse(cerebrasRes, model);

        } catch (RestClientResponseException e) {
            throw new ProviderException(
                    "Cerebras API returned an error: " + e.getStatusCode() + " - " + e.getResponseBodyAsString(), e);
        } catch (ProviderException e) {
            throw e;
        } catch (Exception e) {
            throw new ProviderException("Failed to communicate with Cerebras API: " + e.getMessage(), e);
        }
    }

    private CerebrasRequest mapToCerebrasRequest(LlmRequest request, String model) {
        CerebrasRequest cerebrasReq = new CerebrasRequest();
        cerebrasReq.model = model;
        cerebrasReq.temperature = request.temperature;
        cerebrasReq.maxTokens = request.maxTokens;

        List<CerebrasRequest.Message> messages = new ArrayList<>();

        if (request.systemPrompt != null && !request.systemPrompt.isEmpty()) {
            messages.add(new CerebrasRequest.Message("system", request.systemPrompt));
        }

        if (request.prompt != null) {
            messages.add(new CerebrasRequest.Message("user", request.prompt));
        }

        cerebrasReq.messages = messages;
        return cerebrasReq;
    }

    private LlmResponse mapToLlmResponse(CerebrasResponse cerebrasRes, String model) {
        if (cerebrasRes == null) {
            throw new ProviderException("Cerebras returned an empty response body.");
        }

        if (cerebrasRes.error != null) {
            throw new ProviderException("Cerebras API error: " + cerebrasRes.error.message);
        }

        if (cerebrasRes.choices == null || cerebrasRes.choices.isEmpty()) {
            throw new ProviderException("Cerebras returned no choices.");
        }

        CerebrasResponse.Choice choice = cerebrasRes.choices.get(0);
        if (choice.message == null || choice.message.content == null || choice.message.content.isEmpty()) {
            throw new ProviderException("Cerebras returned a choice with no content.");
        }

        String responseModel = (cerebrasRes.model != null) ? cerebrasRes.model : model;
        LlmResponse response = new LlmResponse(choice.message.content, getProviderName(), responseModel);

        if (cerebrasRes.usage != null) {
            response.inputTokens = cerebrasRes.usage.promptTokens;
            response.outputTokens = cerebrasRes.usage.completionTokens;
            response.totalTokens = cerebrasRes.usage.totalTokens;
        }

        return response;
    }
}
