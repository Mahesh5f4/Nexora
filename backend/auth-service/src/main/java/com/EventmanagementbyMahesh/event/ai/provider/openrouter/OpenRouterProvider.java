package com.EventmanagementbyMahesh.event.ai.provider.openrouter;

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
public class OpenRouterProvider implements LlmProvider {

    private final RestClient restClient;

    @Value("${ai.providers.openrouter.api-key:${OPENROUTER_API_KEY:}}")
    private String apiKey;

    @Value("${ai.providers.openrouter.model:${OPENROUTER_MODEL:openrouter/free}}")
    private String defaultModel;

    @Value("${ai.providers.openrouter.base-url:${OPENROUTER_BASE_URL:https://openrouter.ai/api/v1/chat/completions}}")
    private String baseUrl;

    public OpenRouterProvider(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder.build();
    }

    @Override
    public String getProviderName() {
        return "openrouter";
    }

    @Override
    public boolean isConfigured() {
        return apiKey != null && !apiKey.trim().isEmpty();
    }

    @Override
    public LlmResponse generate(LlmRequest request) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new ProviderException("OpenRouter API key is not configured.");
        }

        String model = (request.model != null && !request.model.isEmpty()) ? request.model : defaultModel;
        OpenRouterRequest orReq = mapToOpenRouterRequest(request, model);

        try {
            OpenRouterResponse orRes = restClient.post()
                    .uri(baseUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + apiKey)
                    .body(orReq)
                    .retrieve()
                    .body(OpenRouterResponse.class);

            return mapToLlmResponse(orRes, model);

        } catch (RestClientResponseException e) {
            throw new ProviderException(
                    "OpenRouter API returned an error: " + e.getStatusCode() + " - " + e.getResponseBodyAsString(), e);
        } catch (ProviderException e) {
            throw e;
        } catch (Exception e) {
            throw new ProviderException("Failed to communicate with OpenRouter API: " + e.getMessage(), e);
        }
    }

    private OpenRouterRequest mapToOpenRouterRequest(LlmRequest request, String model) {
        OpenRouterRequest orReq = new OpenRouterRequest();
        orReq.model = model;
        orReq.temperature = request.temperature;
        orReq.maxTokens = request.maxTokens;

        List<OpenRouterRequest.Message> messages = new ArrayList<>();

        if (request.systemPrompt != null && !request.systemPrompt.isEmpty()) {
            messages.add(new OpenRouterRequest.Message("system", request.systemPrompt));
        }

        if (request.prompt != null) {
            messages.add(new OpenRouterRequest.Message("user", request.prompt));
        }

        orReq.messages = messages;
        return orReq;
    }

    private LlmResponse mapToLlmResponse(OpenRouterResponse orRes, String model) {
        if (orRes == null) {
            throw new ProviderException("OpenRouter returned an empty response body.");
        }

        if (orRes.error != null) {
            throw new ProviderException("OpenRouter API error: " + orRes.error.message);
        }

        if (orRes.choices == null || orRes.choices.isEmpty()) {
            throw new ProviderException("OpenRouter returned no choices.");
        }

        OpenRouterResponse.Choice choice = orRes.choices.get(0);
        if (choice.message == null || choice.message.content == null || choice.message.content.isEmpty()) {
            throw new ProviderException("OpenRouter returned a choice with no content.");
        }

        String responseModel = (orRes.model != null) ? orRes.model : model;
        LlmResponse response = new LlmResponse(choice.message.content, getProviderName(), responseModel);

        if (orRes.usage != null) {
            response.inputTokens = orRes.usage.promptTokens;
            response.outputTokens = orRes.usage.completionTokens;
            response.totalTokens = orRes.usage.totalTokens;
        }

        return response;
    }
}
