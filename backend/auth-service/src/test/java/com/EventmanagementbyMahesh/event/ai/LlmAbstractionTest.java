package com.EventmanagementbyMahesh.event.ai;

import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.provider.LlmProvider;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertNotNull;

public class LlmAbstractionTest {

    @Test
    public void testLlmRequestConstructors() {
        LlmRequest request = new LlmRequest("Hello", "You are an AI", "gpt-4", 0.7, 100);
        
        assertEquals("Hello", request.prompt);
        assertEquals("You are an AI", request.systemPrompt);
        assertEquals("gpt-4", request.model);
        assertEquals(0.7, request.temperature);
        assertEquals(100, request.maxTokens);

        LlmRequest emptyReq = new LlmRequest();
        assertNull(emptyReq.prompt);
    }

    @Test
    public void testLlmResponseConstructors() {
        LlmResponse response = new LlmResponse("Response content", "gemini", "gemini-1.5-flash");
        
        assertEquals("Response content", response.content);
        assertEquals("gemini", response.provider);
        assertEquals("gemini-1.5-flash", response.model);
        assertNull(response.inputTokens);

        LlmResponse fullResponse = new LlmResponse("Content", "groq", "llama3", 10, 20, 30);
        assertEquals(10, fullResponse.inputTokens);
        assertEquals(20, fullResponse.outputTokens);
        assertEquals(30, fullResponse.totalTokens);
    }

    @Test
    public void testLlmProviderInterfaceMock() {
        LlmProvider mockProvider = new LlmProvider() {
            @Override
            public LlmResponse generate(LlmRequest request) {
                return new LlmResponse("Mock response to: " + request.prompt, "mock-provider", "mock-model");
            }

            @Override
            public String getProviderName() {
                return "mock";
            }

            @Override
            public boolean isConfigured() {
                return true;
            }
        };

        assertEquals("mock", mockProvider.getProviderName());
        LlmRequest req = new LlmRequest("Test", null, null, null, null);
        LlmResponse res = mockProvider.generate(req);
        assertNotNull(res);
        assertEquals("Mock response to: Test", res.content);
        assertEquals("mock-provider", res.provider);
        assertEquals("mock-model", res.model);
    }
}
