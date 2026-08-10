package com.EventmanagementbyMahesh.event.ai.provider.gemini;

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
 * Live integration test — calls the real Gemini API.
 * Skipped during normal {@code mvn test}.
 * Run explicitly with: {@code mvn test -pl auth-service -Dtest=GeminiLiveTest -Dlive-tests=true}
 */
public class GeminiLiveTest {

    @Test
    @EnabledIfSystemProperty(named = "live-tests", matches = "true")
    public void runRealGeminiRequest() throws Exception {
        System.out.println("Executing real Gemini API request...");
        
        // Read the API key from .env file
        String apiKey = null;
        List<String> lines = Files.readAllLines(Paths.get("../.env"));
        for (String line : lines) {
            if (line.startsWith("GEMINI_API_KEY=")) {
                apiKey = line.substring("GEMINI_API_KEY=".length()).trim();
                break;
            }
        }
        
        if (apiKey == null || apiKey.isEmpty()) {
            throw new IllegalStateException("GEMINI_API_KEY not found in ../.env");
        }

        GeminiProvider provider = new GeminiProvider(RestClient.builder());
        ReflectionTestUtils.setField(provider, "apiKey", apiKey);
        ReflectionTestUtils.setField(provider, "defaultModel", "gemini-2.5-flash");
        ReflectionTestUtils.setField(provider, "baseUrl", "https://generativelanguage.googleapis.com/v1beta/models/");

        LlmRequest request = new LlmRequest("Return exactly: GEMINI_TEST_OK", null, null, 0.1, 50);
        
        LlmResponse response = provider.generate(request);
        System.out.println("Real API Call Successful!");
        System.out.println("Response Provider: " + response.provider);
        System.out.println("Response Model: " + response.model);
        System.out.println("Response Content: " + response.content);
    }
}
