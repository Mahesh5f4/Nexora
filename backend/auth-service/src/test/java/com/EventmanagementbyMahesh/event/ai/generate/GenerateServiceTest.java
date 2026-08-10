package com.EventmanagementbyMahesh.event.ai.generate;

import com.EventmanagementbyMahesh.event.ai.generate.dto.GenerateRequest;
import com.EventmanagementbyMahesh.event.ai.generate.dto.GenerateResponse;
import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.service.AiExecutionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GenerateServiceTest {

    @Mock
    private AiExecutionService aiExecutionService;

    @Mock
    private GeneratePromptBuilder promptBuilder;

    @InjectMocks
    private GenerateService generateService;

    @Test
    void testGenerateContent_Success_WithTokenUsage() {
        GenerateRequest request = new GenerateRequest("Write a unit test", GenerateType.CODE);
        when(promptBuilder.buildSystemPrompt(GenerateType.CODE)).thenReturn("Mocked System Prompt");

        LlmResponse mockedResponse = new LlmResponse("public class Test {}", "gemini", "gemini-1.5-flash", 10, 20, 30);
        when(aiExecutionService.execute(any(LlmRequest.class))).thenReturn(mockedResponse);

        GenerateResponse response = generateService.generateContent(request);

        assertNotNull(response);
        assertEquals("public class Test {}", response.getContent());
        assertEquals("gemini", response.getProvider());
        assertEquals("gemini-1.5-flash", response.getModel());
        assertNotNull(response.getTokenUsage());
        assertEquals(10, response.getTokenUsage().getInputTokens());
        assertEquals(20, response.getTokenUsage().getOutputTokens());
        assertEquals(30, response.getTokenUsage().getTotalTokens());

        ArgumentCaptor<LlmRequest> requestCaptor = ArgumentCaptor.forClass(LlmRequest.class);
        verify(aiExecutionService, times(1)).execute(requestCaptor.capture());

        LlmRequest capturedRequest = requestCaptor.getValue();
        assertEquals("Write a unit test", capturedRequest.prompt);
        assertEquals("Mocked System Prompt", capturedRequest.systemPrompt);
        assertNull(capturedRequest.model);
        assertEquals(0.7, capturedRequest.temperature);
        assertEquals(2000, capturedRequest.maxTokens);
    }

    @Test
    void testGenerateContent_Success_WithoutTokenUsage() {
        GenerateRequest request = new GenerateRequest("Write an email", GenerateType.EMAIL);
        when(promptBuilder.buildSystemPrompt(GenerateType.EMAIL)).thenReturn("Email Prompt");

        LlmResponse mockedResponse = new LlmResponse("Subject: Meeting", "groq", "llama-3.3-70b", null, null, null);
        when(aiExecutionService.execute(any(LlmRequest.class))).thenReturn(mockedResponse);

        GenerateResponse response = generateService.generateContent(request);

        assertNotNull(response);
        assertEquals("Subject: Meeting", response.getContent());
        assertEquals("groq", response.getProvider());
        assertEquals("llama-3.3-70b", response.getModel());
        assertNull(response.getTokenUsage());
    }

    @Test
    void testPromptBuilder_AllTypes() {
        GeneratePromptBuilder builder = new GeneratePromptBuilder();

        String codePrompt = builder.buildSystemPrompt(GenerateType.CODE);
        assertTrue(codePrompt.contains("ThinkAction Ai"));
        assertTrue(codePrompt.contains("production-ready code"));

        String emailPrompt = builder.buildSystemPrompt(GenerateType.EMAIL);
        assertTrue(emailPrompt.contains("professional, concise"));

        String socialPrompt = builder.buildSystemPrompt(GenerateType.SOCIAL_POST);
        assertTrue(socialPrompt.contains("engaging"));

        String docPrompt = builder.buildSystemPrompt(GenerateType.DOCUMENT);
        assertTrue(docPrompt.contains("structured, professional"));

        String generalPrompt = builder.buildSystemPrompt(GenerateType.GENERAL);
        assertTrue(generalPrompt.contains("ThinkAction Ai"));
    }
}
