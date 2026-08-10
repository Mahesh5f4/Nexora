package com.EventmanagementbyMahesh.event.ai.provider.groq;

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

class GroqProviderTest {

    private GroqProvider provider;
    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(builder).build();
        provider = new GroqProvider(builder);

        ReflectionTestUtils.setField(provider, "apiKey", "test-groq-key");
        ReflectionTestUtils.setField(provider, "defaultModel", "llama-3.3-70b-versatile");
        ReflectionTestUtils.setField(provider, "baseUrl", "https://api.groq.local/openai/v1/chat/completions");
    }

    @Test
    void testProviderName() {
        assertEquals("groq", provider.getProviderName());
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
              "id": "chatcmpl-123",
              "model": "llama-3.3-70b-versatile",
              "choices": [
                {
                  "message": {
                    "role": "assistant",
                    "content": "Hello, world!"
                  },
                  "finish_reason": "stop"
                }
              ],
              "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 5,
                "total_tokens": 15
              }
            }
            """;

        mockServer.expect(requestTo("https://api.groq.local/openai/v1/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer test-groq-key"))
                .andRespond(withSuccess(mockJson, MediaType.APPLICATION_JSON));

        LlmRequest request = new LlmRequest("Say hello", "You are helpful", null, 0.7, 100);
        LlmResponse response = provider.generate(request);

        assertNotNull(response);
        assertEquals("Hello, world!", response.content);
        assertEquals("groq", response.provider);
        assertEquals("llama-3.3-70b-versatile", response.model);
        assertEquals(10, response.inputTokens);
        assertEquals(5, response.outputTokens);
        assertEquals(15, response.totalTokens);

        mockServer.verify();
    }

    @Test
    void testSuccessWithCustomModel() {
        String mockJson = """
            {
              "model": "mixtral-8x7b-32768",
              "choices": [{"message": {"role": "assistant", "content": "OK"}}]
            }
            """;

        mockServer.expect(requestTo("https://api.groq.local/openai/v1/chat/completions"))
                .andRespond(withSuccess(mockJson, MediaType.APPLICATION_JSON));

        LlmRequest request = new LlmRequest("Test", null, "mixtral-8x7b-32768", null, null);
        LlmResponse response = provider.generate(request);

        assertEquals("mixtral-8x7b-32768", response.model);
        assertNull(response.inputTokens);
        mockServer.verify();
    }

    @Test
    void testHttpErrorResponse() {
        mockServer.expect(requestTo("https://api.groq.local/openai/v1/chat/completions"))
                .andRespond(withUnauthorizedRequest().body("{\"error\":{\"message\":\"Invalid API Key\"}}"));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);

        ProviderException ex = assertThrows(ProviderException.class, () -> provider.generate(request));
        assertTrue(ex.getMessage().contains("Groq API returned an error: 401"));
        mockServer.verify();
    }

    @Test
    void testEmptyChoicesResponse() {
        String mockJson = """
            {
              "model": "llama-3.3-70b-versatile",
              "choices": []
            }
            """;

        mockServer.expect(requestTo("https://api.groq.local/openai/v1/chat/completions"))
                .andRespond(withSuccess(mockJson, MediaType.APPLICATION_JSON));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);

        ProviderException ex = assertThrows(ProviderException.class, () -> provider.generate(request));
        assertTrue(ex.getMessage().contains("Groq returned no choices"));
    }

    @Test
    void testNullContentResponse() {
        String mockJson = """
            {
              "model": "llama-3.3-70b-versatile",
              "choices": [{"message": {"role": "assistant", "content": ""}}]
            }
            """;

        mockServer.expect(requestTo("https://api.groq.local/openai/v1/chat/completions"))
                .andRespond(withSuccess(mockJson, MediaType.APPLICATION_JSON));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);

        ProviderException ex = assertThrows(ProviderException.class, () -> provider.generate(request));
        assertTrue(ex.getMessage().contains("no content"));
    }

    @Test
    void testTimeoutOrNetworkFailure() {
        mockServer.expect(requestTo("https://api.groq.local/openai/v1/chat/completions"))
                .andRespond(request -> { throw new java.net.SocketTimeoutException("Read timed out"); });

        LlmRequest request = new LlmRequest("Test", null, null, null, null);

        ProviderException ex = assertThrows(ProviderException.class, () -> provider.generate(request));
        assertTrue(ex.getMessage().contains("Failed to communicate with Groq API"));
    }

    @Test
    void testRateLimitResponse() {
        mockServer.expect(requestTo("https://api.groq.local/openai/v1/chat/completions"))
                .andRespond(withTooManyRequests().body("{\"error\":{\"message\":\"Rate limit exceeded\"}}"));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);

        ProviderException ex = assertThrows(ProviderException.class, () -> provider.generate(request));
        assertTrue(ex.getMessage().contains("Groq API returned an error: 429"));
    }
}
