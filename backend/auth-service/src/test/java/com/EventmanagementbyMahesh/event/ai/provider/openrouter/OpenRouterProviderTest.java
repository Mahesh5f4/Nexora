package com.EventmanagementbyMahesh.event.ai.provider.openrouter;

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

class OpenRouterProviderTest {

    private OpenRouterProvider provider;
    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(builder).build();
        provider = new OpenRouterProvider(builder);

        ReflectionTestUtils.setField(provider, "apiKey", "test-or-key");
        ReflectionTestUtils.setField(provider, "defaultModel", "openrouter/free");
        ReflectionTestUtils.setField(provider, "baseUrl", "https://api.openrouter.local/api/v1/chat/completions");
    }

    @Test
    void testProviderName() {
        assertEquals("openrouter", provider.getProviderName());
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
              "id": "gen-abc123",
              "model": "meta-llama/llama-3-8b-instruct:free",
              "choices": [
                {
                  "message": {
                    "role": "assistant",
                    "content": "Hello from OpenRouter!"
                  },
                  "finish_reason": "stop"
                }
              ],
              "usage": {
                "prompt_tokens": 12,
                "completion_tokens": 6,
                "total_tokens": 18
              }
            }
            """;

        mockServer.expect(requestTo("https://api.openrouter.local/api/v1/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer test-or-key"))
                .andRespond(withSuccess(mockJson, MediaType.APPLICATION_JSON));

        LlmRequest request = new LlmRequest("Say hello", "Be concise", null, 0.7, 100);
        LlmResponse response = provider.generate(request);

        assertNotNull(response);
        assertEquals("Hello from OpenRouter!", response.content);
        assertEquals("openrouter", response.provider);
        assertEquals("meta-llama/llama-3-8b-instruct:free", response.model);
        assertEquals(12, response.inputTokens);
        assertEquals(6, response.outputTokens);
        assertEquals(18, response.totalTokens);

        mockServer.verify();
    }

    @Test
    void testSuccessWithoutUsage() {
        String mockJson = """
            {
              "model": "openrouter/free",
              "choices": [{"message": {"role": "assistant", "content": "OK"}}]
            }
            """;

        mockServer.expect(requestTo("https://api.openrouter.local/api/v1/chat/completions"))
                .andRespond(withSuccess(mockJson, MediaType.APPLICATION_JSON));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);
        LlmResponse response = provider.generate(request);

        assertEquals("OK", response.content);
        assertNull(response.inputTokens);
        mockServer.verify();
    }

    @Test
    void testCustomModel() {
        String mockJson = """
            {
              "model": "google/gemma-2-9b-it:free",
              "choices": [{"message": {"role": "assistant", "content": "Custom"}}]
            }
            """;

        mockServer.expect(requestTo("https://api.openrouter.local/api/v1/chat/completions"))
                .andRespond(withSuccess(mockJson, MediaType.APPLICATION_JSON));

        LlmRequest request = new LlmRequest("Test", null, "google/gemma-2-9b-it:free", null, null);
        LlmResponse response = provider.generate(request);

        assertEquals("google/gemma-2-9b-it:free", response.model);
        mockServer.verify();
    }

    @Test
    void testHttpError400() {
        mockServer.expect(requestTo("https://api.openrouter.local/api/v1/chat/completions"))
                .andRespond(withBadRequest().body("{\"error\":{\"message\":\"Bad request\"}}"));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);

        ProviderException ex = assertThrows(ProviderException.class, () -> provider.generate(request));
        assertTrue(ex.getMessage().contains("400"));
        mockServer.verify();
    }

    @Test
    void testHttpError401() {
        mockServer.expect(requestTo("https://api.openrouter.local/api/v1/chat/completions"))
                .andRespond(withUnauthorizedRequest().body("{\"error\":{\"message\":\"Invalid API Key\"}}"));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);

        ProviderException ex = assertThrows(ProviderException.class, () -> provider.generate(request));
        assertTrue(ex.getMessage().contains("401"));
    }

    @Test
    void testHttpError403() {
        mockServer.expect(requestTo("https://api.openrouter.local/api/v1/chat/completions"))
                .andRespond(withForbiddenRequest().body("{\"error\":{\"message\":\"Forbidden\"}}"));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);

        ProviderException ex = assertThrows(ProviderException.class, () -> provider.generate(request));
        assertTrue(ex.getMessage().contains("403"));
    }

    @Test
    void testHttpError429() {
        mockServer.expect(requestTo("https://api.openrouter.local/api/v1/chat/completions"))
                .andRespond(withTooManyRequests().body("{\"error\":{\"message\":\"Rate limit exceeded\"}}"));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);

        ProviderException ex = assertThrows(ProviderException.class, () -> provider.generate(request));
        assertTrue(ex.getMessage().contains("429"));
    }

    @Test
    void testHttpError500() {
        mockServer.expect(requestTo("https://api.openrouter.local/api/v1/chat/completions"))
                .andRespond(withServerError().body("Internal Server Error"));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);

        ProviderException ex = assertThrows(ProviderException.class, () -> provider.generate(request));
        assertTrue(ex.getMessage().contains("500"));
    }

    @Test
    void testEmptyChoicesResponse() {
        String mockJson = """
            {
              "model": "openrouter/free",
              "choices": []
            }
            """;

        mockServer.expect(requestTo("https://api.openrouter.local/api/v1/chat/completions"))
                .andRespond(withSuccess(mockJson, MediaType.APPLICATION_JSON));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);

        ProviderException ex = assertThrows(ProviderException.class, () -> provider.generate(request));
        assertTrue(ex.getMessage().contains("OpenRouter returned no choices"));
    }

    @Test
    void testEmptyContentResponse() {
        String mockJson = """
            {
              "model": "openrouter/free",
              "choices": [{"message": {"role": "assistant", "content": ""}}]
            }
            """;

        mockServer.expect(requestTo("https://api.openrouter.local/api/v1/chat/completions"))
                .andRespond(withSuccess(mockJson, MediaType.APPLICATION_JSON));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);

        ProviderException ex = assertThrows(ProviderException.class, () -> provider.generate(request));
        assertTrue(ex.getMessage().contains("no content"));
    }

    @Test
    void testTimeoutOrNetworkFailure() {
        mockServer.expect(requestTo("https://api.openrouter.local/api/v1/chat/completions"))
                .andRespond(request -> { throw new java.net.SocketTimeoutException("Read timed out"); });

        LlmRequest request = new LlmRequest("Test", null, null, null, null);

        ProviderException ex = assertThrows(ProviderException.class, () -> provider.generate(request));
        assertTrue(ex.getMessage().contains("Failed to communicate with OpenRouter API"));
    }
}
