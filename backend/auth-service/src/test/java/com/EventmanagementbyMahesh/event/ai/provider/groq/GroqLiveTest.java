package com.EventmanagementbyMahesh.event.ai.provider.groq;

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
 * Live integration test — calls the real Groq API.
 * Skipped during normal {@code mvn test}.
 * Run explicitly with: {@code mvn test -pl auth-service -Dtest=GroqLiveTest -Dlive-tests=true}
 */
public class GroqLiveTest {

    @Test
    @EnabledIfSystemProperty(named = "live-tests", matches = "true")
    public void runRealGroqRequest() throws Exception {
        System.out.println("Executing real Groq API request...");

        // Read the API key from .env file
        String apiKey = null;
        List<String> lines = Files.readAllLines(Paths.get("../.env"));
        for (String line : lines) {
            if (line.startsWith("GROQ_API_KEY=")) {
                apiKey = line.substring("GROQ_API_KEY=".length()).trim();
                break;
            }
        }

        if (apiKey == null || apiKey.isEmpty()) {
            throw new IllegalStateException("GROQ_API_KEY not found in ../.env");
        }

        GroqProvider provider = new GroqProvider(RestClient.builder());
        ReflectionTestUtils.setField(provider, "apiKey", apiKey);
        ReflectionTestUtils.setField(provider, "defaultModel", "llama-3.3-70b-versatile");
        ReflectionTestUtils.setField(provider, "baseUrl", "https://api.groq.com/openai/v1/chat/completions");

        LlmRequest request = new LlmRequest("Return exactly: GROQ_TEST_OK", null, null, 0.1, 50);

        LlmResponse response = provider.generate(request);
        System.out.println("Real API Call Successful!");
        System.out.println("Response Provider: " + response.provider);
        System.out.println("Response Model: " + response.model);
        System.out.println("Response Content: " + response.content);
    }
}
