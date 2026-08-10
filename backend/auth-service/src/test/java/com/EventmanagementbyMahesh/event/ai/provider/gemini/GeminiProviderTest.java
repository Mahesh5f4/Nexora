package com.EventmanagementbyMahesh.event.ai.provider.gemini;

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
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class GeminiProviderTest {

    private GeminiProvider provider;
    private MockRestServiceServer mockServer;
    private RestClient.Builder builder;

    @BeforeEach
    void setUp() {
        builder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(builder).build();
        provider = new GeminiProvider(builder);
        
        ReflectionTestUtils.setField(provider, "apiKey", "test-api-key");
        ReflectionTestUtils.setField(provider, "defaultModel", "gemini-1.5-flash");
        ReflectionTestUtils.setField(provider, "baseUrl", "https://api.gemini.local/v1beta/models/");
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
        String mockJsonResponse = """
            {
              "candidates": [
                {
                  "content": {
                    "parts": [{"text": "Hello, world!"}]
                  }
                }
              ],
              "usageMetadata": {
                "promptTokenCount": 5,
                "candidatesTokenCount": 10,
                "totalTokenCount": 15
              }
            }
            """;

        mockServer.expect(requestTo("https://api.gemini.local/v1beta/models/gemini-1.5-flash:generateContent?key=test-api-key"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(mockJsonResponse, MediaType.APPLICATION_JSON));

        LlmRequest request = new LlmRequest("Say hello", "System instructions", null, 0.7, 100);
        LlmResponse response = provider.generate(request);

        assertNotNull(response);
        assertEquals("Hello, world!", response.content);
        assertEquals("gemini", response.provider);
        assertEquals("gemini-1.5-flash", response.model);
        assertEquals(5, response.inputTokens);
        assertEquals(10, response.outputTokens);
        assertEquals(15, response.totalTokens);
        
        mockServer.verify();
    }

    @Test
    void testHttpErrorResponse() {
        mockServer.expect(requestTo("https://api.gemini.local/v1beta/models/gemini-1.5-flash:generateContent?key=test-api-key"))
                .andRespond(withBadRequest().body("Bad Request Payload"));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);
        
        ProviderException ex = assertThrows(ProviderException.class, () -> provider.generate(request));
        assertTrue(ex.getMessage().contains("Gemini API returned an error: 400"));
        
        mockServer.verify();
    }

    @Test
    void testEmptyCandidatesResponse() {
        String mockJsonResponse = """
            {
              "candidates": []
            }
            """;

        mockServer.expect(requestTo("https://api.gemini.local/v1beta/models/gemini-1.5-flash:generateContent?key=test-api-key"))
                .andRespond(withSuccess(mockJsonResponse, MediaType.APPLICATION_JSON));

        LlmRequest request = new LlmRequest("Test", null, null, null, null);
        
        ProviderException ex = assertThrows(ProviderException.class, () -> provider.generate(request));
        assertTrue(ex.getMessage().contains("Gemini returned no candidates"));
    }

    @Test
    void testTimeoutOrNetworkFailure() {
        // We simulate a network failure or timeout by throwing an exception from the server
        mockServer.expect(requestTo("https://api.gemini.local/v1beta/models/gemini-1.5-flash:generateContent?key=test-api-key"))
                .andRespond(request -> { throw new java.net.SocketTimeoutException("Read timed out"); });

        LlmRequest request = new LlmRequest("Test", null, null, null, null);
        
        ProviderException ex = assertThrows(ProviderException.class, () -> provider.generate(request));
        assertTrue(ex.getMessage().contains("Failed to communicate with Gemini API"));
    }
}
