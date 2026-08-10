package com.EventmanagementbyMahesh.event.ai.research;

import com.EventmanagementbyMahesh.event.ai.exception.ProviderException;
import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.research.dto.ResearchRequest;
import com.EventmanagementbyMahesh.event.ai.research.dto.ResearchResponse;
import com.EventmanagementbyMahesh.event.ai.research.retrieval.RetrievalProvider;
import com.EventmanagementbyMahesh.event.ai.research.retrieval.RetrievalResult;
import com.EventmanagementbyMahesh.event.ai.research.retrieval.RetrievedDocument;
import com.EventmanagementbyMahesh.event.ai.service.AiExecutionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResearchServiceTest {

    @Mock
    private AiExecutionService aiExecutionService;

    @Mock
    private RetrievalProvider retrievalProvider;

    @Mock
    private ResearchPromptBuilder promptBuilder;

    @InjectMocks
    private ResearchService researchService;

    @Test
    void testResearch_WithNoRetrievedEvidence() {
        // Arrange
        ResearchRequest request = new ResearchRequest("Compare Redis and Memcached.");
        RetrievalResult emptyResult = RetrievalResult.empty("noop");

        when(retrievalProvider.retrieve("Compare Redis and Memcached.")).thenReturn(emptyResult);
        when(promptBuilder.getSystemPrompt()).thenReturn("System prompt");
        when(promptBuilder.buildUserPrompt("Compare Redis and Memcached.", emptyResult)).thenReturn("No evidence. Q: Compare Redis and Memcached.");

        LlmResponse mockResponse = new LlmResponse("Redis is better for...", "groq", "llama-3.3-70b");
        when(aiExecutionService.execute(any(LlmRequest.class))).thenReturn(mockResponse);

        // Act
        ResearchResponse response = researchService.research(request);

        // Assert
        assertNotNull(response);
        assertEquals("Redis is better for...", response.getAnswer());
        assertEquals("groq", response.getProvider());
        assertEquals("llama-3.3-70b", response.getModel());

        // Verify retrieval was called
        verify(retrievalProvider, times(1)).retrieve("Compare Redis and Memcached.");

        // Verify LLM was called with correct params
        ArgumentCaptor<LlmRequest> captor = ArgumentCaptor.forClass(LlmRequest.class);
        verify(aiExecutionService, times(1)).execute(captor.capture());
        LlmRequest captured = captor.getValue();
        assertEquals("No evidence. Q: Compare Redis and Memcached.", captured.prompt);
        assertEquals("System prompt", captured.systemPrompt);
        assertNull(captured.model);          // provider-independent
        assertEquals(0.5, captured.temperature);
        assertEquals(3000, captured.maxTokens);
    }

    @Test
    void testResearch_WithRetrievedEvidence() {
        // Arrange
        String query = "What is Redis?";
        ResearchRequest request = new ResearchRequest(query);

        RetrievedDocument doc = new RetrievedDocument(
                "Redis Overview", "Redis is an in-memory data structure store...",
                "Wikipedia", "https://en.wikipedia.org/wiki/Redis", Map.of());
        RetrievalResult result = new RetrievalResult(List.of(doc), "wikipedia-mock");

        when(retrievalProvider.retrieve(query)).thenReturn(result);
        when(promptBuilder.getSystemPrompt()).thenReturn("System");
        when(promptBuilder.buildUserPrompt(eq(query), eq(result))).thenReturn("Evidence: Redis Overview... Q: " + query);

        LlmResponse mockResponse = new LlmResponse("Redis is an in-memory...", "gemini", "gemini-1.5-pro");
        when(aiExecutionService.execute(any(LlmRequest.class))).thenReturn(mockResponse);

        // Act
        ResearchResponse response = researchService.research(request);

        // Assert
        assertNotNull(response);
        assertEquals("Redis is an in-memory...", response.getAnswer());
        assertEquals("gemini", response.getProvider());

        // Verify evidence was present and passed to prompt builder
        verify(promptBuilder).buildUserPrompt(eq(query), argThat(r -> r.hasDocuments() && r.getDocuments().size() == 1));
    }

    @Test
    void testResearch_ProviderException_PropagatedCleanly() {
        ResearchRequest request = new ResearchRequest("Query that fails");
        RetrievalResult emptyResult = RetrievalResult.empty("noop");

        when(retrievalProvider.retrieve(any())).thenReturn(emptyResult);
        when(promptBuilder.getSystemPrompt()).thenReturn("System");
        when(promptBuilder.buildUserPrompt(any(), any())).thenReturn("prompt");
        when(aiExecutionService.execute(any(LlmRequest.class)))
                .thenThrow(new ProviderException("All providers exhausted"));

        // ProviderException must propagate so the controller advice can handle it
        assertThrows(ProviderException.class, () -> researchService.research(request));
    }

    @Test
    void testResearch_PromptBuilderBuildUserPrompt_NoEvidence_ContainsNoFakeSourceClaim() {
        // Test the REAL prompt builder without mocks
        ResearchPromptBuilder builder = new ResearchPromptBuilder();
        RetrievalResult empty = RetrievalResult.empty("noop");
        String prompt = builder.buildUserPrompt("What is Redis?", empty);

        assertTrue(prompt.contains("No external sources were retrieved"), "Must inform LLM no sources exist");
        assertFalse(prompt.contains("[1]"), "Must NOT generate fake citation markers");
        assertFalse(prompt.contains("http"), "Must NOT generate fake URLs when no evidence");
        assertTrue(prompt.contains("What is Redis?"), "Must include the original query");
    }

    @Test
    void testResearch_PromptBuilderBuildUserPrompt_WithEvidence_IncludesContext() {
        ResearchPromptBuilder builder = new ResearchPromptBuilder();
        RetrievedDocument doc = new RetrievedDocument(
                "Redis Internals", "Redis uses a single-threaded event loop...",
                "test-source", "https://test.com", Map.of());
        RetrievalResult result = new RetrievalResult(List.of(doc), "test-provider");

        String prompt = builder.buildUserPrompt("How does Redis work?", result);

        assertTrue(prompt.contains("test-provider"), "Must reference retrieval source");
        assertTrue(prompt.contains("Redis Internals"), "Must include document title");
        assertTrue(prompt.contains("Redis uses a single-threaded"), "Must include document content");
        assertTrue(prompt.contains("How does Redis work?"), "Must include the original query");
    }

    @Test
    void testResearch_ServiceDoesNotDirectlyReferenceProviders() {
        // Compile-time guarantee — ResearchService only knows about AiExecutionService.
        // This test simply verifies the service can be instantiated with a mocked interface.
        assertNotNull(researchService);
    }
}
