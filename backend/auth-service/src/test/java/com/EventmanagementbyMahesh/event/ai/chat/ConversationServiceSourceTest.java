package com.EventmanagementbyMahesh.event.ai.chat;

import com.EventmanagementbyMahesh.event.ai.analyze.AnalyzeRolePromptProvider;
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
import com.EventmanagementbyMahesh.event.ai.document.dto.RagSourceDto;
import com.EventmanagementbyMahesh.event.auth.entity.User;
import com.EventmanagementbyMahesh.event.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConversationServiceSourceTest {

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

    private User testUser;
    private Conversation testConversation;

    private com.EventmanagementbyMahesh.event.ai.chat.dto.SendMessageRequest createRequest(String content, boolean useWeb) {
        com.EventmanagementbyMahesh.event.ai.chat.dto.SendMessageRequest request = new com.EventmanagementbyMahesh.event.ai.chat.dto.SendMessageRequest();
        request.setContent(content);
        request.setUseWebSearch(useWeb);
        return request;
    }

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(conversationService, "maxContextMessages", 10);
        
        testUser = new User();
        ReflectionTestUtils.setField(testUser, "id", "1");
        testUser.setEmail("test@example.com");

        testConversation = new Conversation();
        ReflectionTestUtils.setField(testConversation, "id", 10L);
        testConversation.setUserId(testUser.getId());
        testConversation.setTitle("New conversation");
        testConversation.setRole("GENERAL");

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("test@example.com", "password")
        );
    }

    private void mockSecurityContext() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
    }

    @Test
    void testAgentResponseWithZeroSources() {
        mockSecurityContext();
        when(conversationRepository.findByIdAndUserId(10L, "1")).thenReturn(Optional.of(testConversation));
        
        when(messageRepository.save(any(Message.class))).thenAnswer(i -> {
            Message m = i.getArgument(0);
            ReflectionTestUtils.setField(m, "id", "100");
            return m;
        });

        when(messageRepository.findByConversationIdOrderByCreatedAtDesc(eq(10L), any()))
                .thenReturn(Collections.emptyList());

        AgentAskResponse response = new AgentAskResponse("Answer without sources", Collections.emptyList(), "agent");
        when(pythonAiServiceClient.askAgent(any())).thenReturn(response);

        MessageDto result = conversationService.sendMessage(10L, createRequest("Hello", false));
        
        assertNotNull(result);
        assertTrue(result.getSources().isEmpty());
    }

    @Test
    void testAgentResponseWithOneRagSource() {
        mockSecurityContext();
        when(conversationRepository.findByIdAndUserId(10L, "1")).thenReturn(Optional.of(testConversation));
        
        when(messageRepository.save(any(Message.class))).thenAnswer(i -> {
            Message m = i.getArgument(0);
            ReflectionTestUtils.setField(m, "id", "100");
            return m;
        });

        when(messageRepository.findByConversationIdOrderByCreatedAtDesc(eq(10L), any()))
                .thenReturn(Collections.emptyList());

        RagSourceDto ragSource = new RagSourceDto("doc1", "internal.pdf", "chunk1", 0.95);
        AgentAskResponse response = new AgentAskResponse("Answer with RAG", List.of(ragSource), "agent");
        when(pythonAiServiceClient.askAgent(any())).thenReturn(response);

        MessageDto result = conversationService.sendMessage(10L, createRequest("What about PDF?", false));
        
        assertNotNull(result);
        assertEquals(1, result.getSources().size());
        assertEquals("doc1", result.getSources().get(0).getDocumentId());
        assertEquals("internal.pdf", result.getSources().get(0).getFilename());
    }

    @Test
    void testAgentResponseWithOneWebSource() {
        mockSecurityContext();
        when(conversationRepository.findByIdAndUserId(10L, "1")).thenReturn(Optional.of(testConversation));
        
        when(messageRepository.save(any(Message.class))).thenAnswer(i -> {
            Message m = i.getArgument(0);
            ReflectionTestUtils.setField(m, "id", "100");
            return m;
        });

        when(messageRepository.findByConversationIdOrderByCreatedAtDesc(eq(10L), any()))
                .thenReturn(Collections.emptyList());

        RagSourceDto webSource = new RagSourceDto("https://example.com", "Example Domain", "example.com", 0.88);
        AgentAskResponse response = new AgentAskResponse("Answer with Web", List.of(webSource), "agent");
        when(pythonAiServiceClient.askAgent(any())).thenReturn(response);

        MessageDto result = conversationService.sendMessage(10L, createRequest("Search the web", false));
        
        assertNotNull(result);
        assertEquals(1, result.getSources().size());
        assertEquals("https://example.com", result.getSources().get(0).getDocumentId());
        assertEquals("Example Domain", result.getSources().get(0).getFilename());
    }

    @Test
    void testAgentResponseWithMixedSources() {
        mockSecurityContext();
        when(conversationRepository.findByIdAndUserId(10L, "1")).thenReturn(Optional.of(testConversation));
        
        when(messageRepository.save(any(Message.class))).thenAnswer(i -> {
            Message m = i.getArgument(0);
            ReflectionTestUtils.setField(m, "id", "100");
            return m;
        });

        when(messageRepository.findByConversationIdOrderByCreatedAtDesc(eq(10L), any()))
                .thenReturn(Collections.emptyList());

        RagSourceDto ragSource = new RagSourceDto("doc1", "internal.pdf", "chunk1", 0.95);
        RagSourceDto webSource = new RagSourceDto("https://example.com", "Example Domain", "example.com", 0.88);
        
        AgentAskResponse response = new AgentAskResponse("Answer with Mixed", Arrays.asList(ragSource, webSource), "agent");
        when(pythonAiServiceClient.askAgent(any())).thenReturn(response);

        MessageDto result = conversationService.sendMessage(10L, createRequest("Search everywhere", false));
        
        assertNotNull(result);
        assertEquals(2, result.getSources().size());
    }

    @Test
    void testSourcesArePersistedWithAssistantMessage() {
        mockSecurityContext();
        when(conversationRepository.findByIdAndUserId(10L, "1")).thenReturn(Optional.of(testConversation));
        
        ArgumentCaptor<Message> messageCaptor = ArgumentCaptor.forClass(Message.class);
        
        when(messageRepository.save(messageCaptor.capture())).thenAnswer(i -> {
            Message m = i.getArgument(0);
            ReflectionTestUtils.setField(m, "id", "100");
            return m;
        });

        when(messageRepository.findByConversationIdOrderByCreatedAtDesc(eq(10L), any()))
                .thenReturn(Collections.emptyList());

        RagSourceDto ragSource = new RagSourceDto("doc1", "internal.pdf", "chunk1", 0.95);
        AgentAskResponse response = new AgentAskResponse("Answer", List.of(ragSource), "agent");
        when(pythonAiServiceClient.askAgent(any())).thenReturn(response);

        conversationService.sendMessage(10L, createRequest("Hello", false));
        
        List<Message> savedMessages = messageCaptor.getAllValues();
        assertEquals(2, savedMessages.size()); // User message + Assistant message
        
        Message assistantMsg = savedMessages.get(1);
        assertEquals(MessageRole.ASSISTANT, assistantMsg.getSender());
        assertNotNull(assistantMsg.getSources());
        assertEquals(1, assistantMsg.getSources().size());
    }

    @Test
    void testHistoricalMessageWithoutSourcesStillWorksAndPagination() {
        mockSecurityContext();
        when(conversationRepository.findByIdAndUserId(10L, "1")).thenReturn(Optional.of(testConversation));
        
        Message historicalMsg = new Message(testConversation, MessageRole.ASSISTANT, "Old answer");
        ReflectionTestUtils.setField(historicalMsg, "id", "99");
        // sources is intentionally left null, like in old DB records
        historicalMsg.setSources(null); 
        
        Page<Message> messagePage = new PageImpl<>(List.of(historicalMsg));
        when(messageRepository.findByConversationIdOrderByCreatedAtAsc(eq(10L), any())).thenReturn(messagePage);
        
        Page<MessageDto> result = conversationService.getMessages(10L, PageRequest.of(0, 10));
        
        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        
        MessageDto dto = result.getContent().get(0);
        assertEquals("Old answer", dto.getContent());
        assertNotNull(dto.getSources()); // Should map null to empty list
        assertTrue(dto.getSources().isEmpty());
    }

    @Test
    void testUserCannotAccessOtherUserConversationSources() {
        mockSecurityContext();
        // Trying to access conversation not owned by the user
        when(conversationRepository.findByIdAndUserId("99", "1")).thenReturn(Optional.empty());
        
        assertThrows(RuntimeException.class, () -> {
            conversationService.sendMessage("99", createRequest("Hello", false));
        });
        
        assertThrows(RuntimeException.class, () -> {
            conversationService.getMessages("99", PageRequest.of(0, 10));
        });
    }
}

