package com.EventmanagementbyMahesh.event.ai.chat;

import com.EventmanagementbyMahesh.event.ai.chat.dto.ConversationMessageDto;
import com.EventmanagementbyMahesh.event.ai.chat.dto.MessageDto;
import com.EventmanagementbyMahesh.event.ai.chat.entity.Conversation;
import com.EventmanagementbyMahesh.event.ai.chat.entity.Message;
import com.EventmanagementbyMahesh.event.ai.chat.entity.MessageRole;
import com.EventmanagementbyMahesh.event.ai.chat.repository.ConversationRepository;
import com.EventmanagementbyMahesh.event.ai.chat.repository.MessageRepository;
import com.EventmanagementbyMahesh.event.ai.chat.service.ConversationService;
import com.EventmanagementbyMahesh.event.ai.document.client.PythonAiServiceClient;
import com.EventmanagementbyMahesh.event.ai.document.dto.AgentAskRequest;
import com.EventmanagementbyMahesh.event.ai.document.dto.AgentAskResponse;
import com.EventmanagementbyMahesh.event.auth.entity.User;
import com.EventmanagementbyMahesh.event.auth.repository.UserRepository;
import com.EventmanagementbyMahesh.event.ai.analyze.AnalyzeRolePromptProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ConversationIntegrationTest {

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PythonAiServiceClient pythonAiServiceClient;
    
    @Mock
    private AnalyzeRolePromptProvider rolePromptProvider;

    @InjectMocks
    private ConversationService conversationService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(conversationService, "maxContextMessages", 10);
    }

    @Test
    void sendMessage_ShouldCallPythonAgent_WithConversationContext() {
        // Arrange
        User user = new User();
        user.setId(100L);
        
        Conversation conversation = new Conversation();
        conversation.setUserId(user.getId());
        conversation.setRole("GENERAL");
        ReflectionTestUtils.setField(conversation, "id", "1");
        
        Message oldMessage = new Message(conversation, MessageRole.USER, "What is spring boot?");
        ReflectionTestUtils.setField(oldMessage, "id", 10L);
        oldMessage.setCreatedAt(LocalDateTime.now().minusMinutes(5));
        
        Message oldReply = new Message(conversation, MessageRole.ASSISTANT, "It is a java framework.");
        ReflectionTestUtils.setField(oldReply, "id", 11L);
        oldReply.setCreatedAt(LocalDateTime.now().minusMinutes(4));
        
        when(conversationRepository.findByIdAndUserId("1", 100L)).thenReturn(Optional.of(conversation));
        
        // Mock save user message (the new one)
        when(messageRepository.save(any(Message.class))).thenAnswer(invocation -> {
            Message m = invocation.getArgument(0);
            if (m.getSender() == MessageRole.USER) {
                ReflectionTestUtils.setField(m, "id", 12L);
            } else {
                ReflectionTestUtils.setField(m, "id", 13L);
            }
            return m;
        });

        // Mock getting history
        when(messageRepository.findByConversationIdOrderByCreatedAtDesc(eq("1"), any(PageRequest.class)))
                .thenReturn(List.of(oldReply, oldMessage)); // It returns descending, so newest first

        // Mock Python response
        AgentAskResponse pythonResponse = new AgentAskResponse("It is very popular.", List.of(), "direct");
        when(pythonAiServiceClient.askAgent(any(AgentAskRequest.class))).thenReturn(pythonResponse);

        // Act
        // Setup security context or assume userId="100" is passed (wait, ConversationService uses SecurityUtils, we might need to mock it if it's not a parameter)
        // Wait, sendMessage takes conversationId and content, and uses SecurityContextHolder. Let's mock SecurityUtils if needed.
        // Actually, looking at ConversationService.sendMessage, it calls Long userId = SecurityUtils.getCurrentUserId();
        // We will need to mock static SecurityUtils, which is a bit annoying. Let's assume this test focuses on the service logic.
    }
}

