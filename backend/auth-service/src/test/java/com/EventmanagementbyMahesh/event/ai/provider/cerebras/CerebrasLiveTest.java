package com.EventmanagementbyMahesh.event.ai.provider.cerebras;

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
 * Live integration test — calls the real Cerebras API.
 * Skipped during normal {@code mvn test}.
 * Run explicitly with: {@code mvn test -pl auth-service -Dtest=CerebrasLiveTest -Dlive-tests=true}
 */
public class CerebrasLiveTest {

    @Test
    @EnabledIfSystemProperty(named = "live-tests", matches = "true")
    public void runRealCerebrasRequest() throws Exception {
        System.out.println("Executing real Cerebras API request...");

        String apiKey = null;
        List<String> lines = Files.readAllLines(Paths.get("../.env"));
        for (String line : lines) {
            if (line.startsWith("CEREBRAS_API_KEY=")) {
                apiKey = line.substring("CEREBRAS_API_KEY=".length()).trim();
                break;
            }
        }

        if (apiKey == null || apiKey.isEmpty()) {
            throw new IllegalStateException("CEREBRAS_API_KEY not found in ../.env");
        }

        CerebrasProvider provider = new CerebrasProvider(RestClient.builder());
        ReflectionTestUtils.setField(provider, "apiKey", apiKey);
        ReflectionTestUtils.setField(provider, "defaultModel", "gemma-4-31b");
        ReflectionTestUtils.setField(provider, "baseUrl", "https://api.cerebras.ai/v1/chat/completions");

        LlmRequest request = new LlmRequest("Return exactly: CEREBRAS_TEST_OK", null, null, 0.1, 50);

        LlmResponse response = provider.generate(request);
        System.out.println("Real API Call Successful!");
        System.out.println("Response Provider: " + response.provider);
        System.out.println("Response Model: " + response.model);
        System.out.println("Response Content: " + response.content);
    }
}
