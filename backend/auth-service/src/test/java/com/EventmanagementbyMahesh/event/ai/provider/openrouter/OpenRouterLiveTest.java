package com.EventmanagementbyMahesh.event.ai.provider.openrouter;

import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.web.client.RestClient;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;

/**
 * Live integration test — calls the real OpenRouter API.
 * Skipped during normal {@code mvn test}.
 * Run explicitly with: {@code mvn test -pl auth-service -Dtest=OpenRouterLiveTest -Dlive-tests=true}
 */
public class OpenRouterLiveTest {

    @Test
    @EnabledIfSystemProperty(named = "live-tests", matches = "true")
    public void runRealOpenRouterRequest() throws Exception {
        System.out.println("Executing real OpenRouter API request...");

        String apiKey = null;
        List<String> lines = Files.readAllLines(Paths.get("../.env"));
        for (String line : lines) {
            if (line.startsWith("OPENROUTER_API_KEY=")) {
                apiKey = line.substring("OPENROUTER_API_KEY=".length()).trim();
                break;
            }
        }

        if (apiKey == null || apiKey.isEmpty()) {
            throw new IllegalStateException("OPENROUTER_API_KEY not found in ../.env");
        }

        OpenRouterProvider provider = new OpenRouterProvider(RestClient.builder());
        ReflectionTestUtils.setField(provider, "apiKey", apiKey);
        ReflectionTestUtils.setField(provider, "defaultModel", "openrouter/free");
        ReflectionTestUtils.setField(provider, "baseUrl", "https://openrouter.ai/api/v1/chat/completions");

        LlmRequest request = new LlmRequest("Return exactly: OPENROUTER_TEST_OK", null, null, 0.1, 50);

        LlmResponse response = provider.generate(request);
        System.out.println("Real API Call Successful!");
        System.out.println("Response Provider: " + response.provider);
        System.out.println("Response Model: " + response.model);
        System.out.println("Response Content: " + response.content);
    }
}
