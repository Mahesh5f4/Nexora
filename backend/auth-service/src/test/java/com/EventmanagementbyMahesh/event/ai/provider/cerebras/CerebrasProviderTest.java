package com.EventmanagementbyMahesh.event.ai.provider.cerebras;

import com.EventmanagementbyMahesh.event.ai.exception.ProviderException;
import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class CerebrasProviderTest {

    private CerebrasProvider provider;
    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(builder).build();
        provider = new CerebrasProvider(builder);

        ReflectionTestUtils.setField(provider, "apiKey", "test-cerebras-key");
        ReflectionTestUtils.setField(provider, "defaultModel", "llama3.1-8b");
        ReflectionTestUtils.setField(provider, "baseUrl", "https://api.cerebras.local/v1/chat/completions");
    }

    @Test
    void testProviderName() {
        assertEquals("cerebras", provider.getProviderName());
    }

    @Test
    void testMissingApiKey() {
        ReflectionTestUtils.setField(provider, "apiKey", "");
        LlmRequest request = new LlmRequest("Hi", null, null, null, null);

        ProviderException ex = assertThrows(ProviderException.class, () -> provider.generate(request));
        assertTrue(ex.getMessage().contains("API key is not configured"));
    }

    @Test
    void testSuccessResponse() {
        String mockJson = """
            {
              "id": "chatcmpl-abc",
              "model": "llama3.1-8b",
              "choices": [
                {
                  "message": {
                    "role": "assistant",
                    "content": "Hello from Cerebras!"
                  },
                  "finish_reason": "stop"
                }
              ],
              "usage": {
                "prompt_tokens": 8,
                "completion_tokens": 4,
                "total_tokens": 12
              }
            }
            """;

        mockServer.expect(requestTo("https://api.cerebras.local/v1/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer test-cerebras-key"))
                .andRespond(withSuccess(mockJson, MediaType.APPLICATION_JSON));

        LlmRequest request = new LlmRequest("Say hello", "Be concise", null, 0.5, 100);
        LlmResponse response = provider.generate(request);

        assertNotNull(response);
        assertEquals("Hello from Cerebras!", response.content);
        assertEquals("cerebras", response.provider);
        assertEquals("llama3.1-8b", response.model);
        assertEquals(8, response.inputTokens);
        assertEquals(4, response.outputTokens);
        assertEquals(12, response.totalTokens);

        mockServer.verify();
    }

    @Test
    void testSuccessWithoutUsageMetadata() {
        String mockJson = """
            {
              "model": "llama3.1-8b",
              "choices": [{"message": {"role": "assistant", "content": "OK"}}]
            }
            """;

        mockServer.expect(requestTo("https://api.cerebras.local/v1/chat/completions"))
                .andRespond(withSuccess(mockJson, MediaType.APPLICATION_JSON));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);
        LlmResponse response = provider.generate(request);

        assertEquals("OK", response.content);
        assertNull(response.inputTokens);
        mockServer.verify();
    }

    @Test
    void testHttpError401() {
        mockServer.expect(requestTo("https://api.cerebras.local/v1/chat/completions"))
                .andRespond(withUnauthorizedRequest().body("{\"error\":{\"message\":\"Invalid API Key\"}}"));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);

        ProviderException ex = assertThrows(ProviderException.class, () -> provider.generate(request));
        assertTrue(ex.getMessage().contains("Cerebras API returned an error: 401"));
        mockServer.verify();
    }

    @Test
    void testHttpError429RateLimit() {
        mockServer.expect(requestTo("https://api.cerebras.local/v1/chat/completions"))
                .andRespond(withTooManyRequests().body("{\"error\":{\"message\":\"Rate limit exceeded\"}}"));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);

        ProviderException ex = assertThrows(ProviderException.class, () -> provider.generate(request));
        assertTrue(ex.getMessage().contains("429"));
    }

    @Test
    void testHttpError500() {
        mockServer.expect(requestTo("https://api.cerebras.local/v1/chat/completions"))
                .andRespond(withServerError().body("Internal Server Error"));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);

        ProviderException ex = assertThrows(ProviderException.class, () -> provider.generate(request));
        assertTrue(ex.getMessage().contains("500"));
    }

    @Test
    void testEmptyChoicesResponse() {
        String mockJson = """
            {
              "model": "llama3.1-8b",
              "choices": []
            }
            """;

        mockServer.expect(requestTo("https://api.cerebras.local/v1/chat/completions"))
                .andRespond(withSuccess(mockJson, MediaType.APPLICATION_JSON));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);

        ProviderException ex = assertThrows(ProviderException.class, () -> provider.generate(request));
        assertTrue(ex.getMessage().contains("Cerebras returned no choices"));
    }

    @Test
    void testEmptyContentResponse() {
        String mockJson = """
            {
              "model": "llama3.1-8b",
              "choices": [{"message": {"role": "assistant", "content": ""}}]
            }
            """;

        mockServer.expect(requestTo("https://api.cerebras.local/v1/chat/completions"))
                .andRespond(withSuccess(mockJson, MediaType.APPLICATION_JSON));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);

        ProviderException ex = assertThrows(ProviderException.class, () -> provider.generate(request));
        assertTrue(ex.getMessage().contains("no content"));
    }

    @Test
    void testTimeoutOrNetworkFailure() {
        mockServer.expect(requestTo("https://api.cerebras.local/v1/chat/completions"))
                .andRespond(request -> { throw new java.net.SocketTimeoutException("Read timed out"); });

        LlmRequest request = new LlmRequest("Test", null, null, null, null);

        ProviderException ex = assertThrows(ProviderException.class, () -> provider.generate(request));
        assertTrue(ex.getMessage().contains("Failed to communicate with Cerebras API"));
    }
}
