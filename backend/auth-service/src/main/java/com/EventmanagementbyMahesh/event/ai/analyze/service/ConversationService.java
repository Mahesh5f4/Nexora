package com.EventmanagementbyMahesh.event.ai.analyze.service;

import com.EventmanagementbyMahesh.event.ai.analyze.AnalyzeRolePromptProvider;
import com.EventmanagementbyMahesh.event.ai.analyze.dto.ConversationDto;
import com.EventmanagementbyMahesh.event.ai.analyze.dto.CreateConversationRequest;
import com.EventmanagementbyMahesh.event.ai.analyze.dto.MessageDto;
import com.EventmanagementbyMahesh.event.ai.analyze.entity.Conversation;
import com.EventmanagementbyMahesh.event.ai.analyze.entity.Message;
import com.EventmanagementbyMahesh.event.ai.analyze.entity.MessageRole;
import com.EventmanagementbyMahesh.event.ai.analyze.repository.ConversationRepository;
import com.EventmanagementbyMahesh.event.ai.analyze.repository.MessageRepository;
import com.EventmanagementbyMahesh.event.ai.model.LlmRequest;
import com.EventmanagementbyMahesh.event.ai.model.LlmResponse;
import com.EventmanagementbyMahesh.event.ai.service.AiExecutionService;
import com.EventmanagementbyMahesh.event.auth.entity.User;
import com.EventmanagementbyMahesh.event.auth.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final AiExecutionService aiExecutionService;
    private final AnalyzeRolePromptProvider rolePromptProvider;

    @Value("${ai.conversation.max-context-messages:10}")
    private int maxContextMessages;

    public ConversationService(
            ConversationRepository conversationRepository,
            MessageRepository messageRepository,
            UserRepository userRepository,
            AiExecutionService aiExecutionService,
            AnalyzeRolePromptProvider rolePromptProvider) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.aiExecutionService = aiExecutionService;
        this.rolePromptProvider = rolePromptProvider;
    }

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private Conversation getConversationSecurely(Long id) {
        User user = getAuthenticatedUser();
        return conversationRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new RuntimeException("Conversation not found or unauthorized"));
    }

    @Transactional(readOnly = true)
    public List<ConversationDto> listConversations() {
        User user = getAuthenticatedUser();
        return conversationRepository.findAllByUserIdOrderByUpdatedAtDesc(user.getId())
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ConversationDto getConversation(Long id) {
        Conversation conversation = getConversationSecurely(id);
        return mapToDto(conversation);
    }

    @Transactional(readOnly = true)
    public List<MessageDto> getMessages(Long conversationId) {
        getConversationSecurely(conversationId); // verify ownership
        return messageRepository.findAllByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ConversationDto createConversation(CreateConversationRequest request) {
        User user = getAuthenticatedUser();
        Conversation conversation = new Conversation();
        conversation.setUserId(user.getId());
        conversation.setTitle("New conversation");
        conversation.setRole(request.getRole().toUpperCase());
        conversation = conversationRepository.save(conversation);
        return mapToDto(conversation);
    }

    @Transactional
    public void deleteConversation(Long id) {
        Conversation conversation = getConversationSecurely(id);
        messageRepository.deleteAllByConversationId(conversation.getId());
        conversationRepository.delete(conversation);
    }

    // No @Transactional here so we can save user message in a separate tx, or we can just rely on the repository's own transactional save for the user message, and not roll it back when the AI call fails.
    public MessageDto sendMessage(Long conversationId, String content) {
        Conversation conversation = getConversationSecurely(conversationId);

        // 1. Save USER message (Repository.save is transactional on its own)
        Message userMessage = new Message(conversation, MessageRole.USER, content);
        messageRepository.save(userMessage);

        // 2. Load context and build prompt
        String systemPrompt = rolePromptProvider.getSystemPromptForRole(conversation.getRole());
        String fullPrompt = buildConversationContext(conversation.getId(), content);

        // 3. Call AI
        LlmRequest llmRequest = new LlmRequest(fullPrompt, systemPrompt, null, 0.7, 1500);
        LlmResponse llmResponse;
        try {
            llmResponse = aiExecutionService.execute(llmRequest);
        } catch (Exception e) {
            // User message is already saved, and since this method is NOT @Transactional, it won't rollback!
            throw new com.EventmanagementbyMahesh.event.ai.exception.ProviderException("Unable to get a response right now. Please try again.");
        }

        // 4. Save ASSISTANT message
        Message assistantMessage = new Message(conversation, MessageRole.ASSISTANT, llmResponse.content);
        assistantMessage = messageRepository.save(assistantMessage);

        // 5. Generate title if it's the first exchange
        updateTitleIfFirstMessage(conversation, content);

        return mapToDto(assistantMessage);
    }

    private String buildConversationContext(Long conversationId, String currentContent) {
        // Fetch recent messages (excluding the one we just saved to avoid duplication in history, 
        // actually we can just fetch all recent and format them).
        // Since we already saved the user message, we fetch maxContextMessages.
        List<Message> history = messageRepository.findByConversationIdOrderByCreatedAtDesc(
                conversationId, PageRequest.of(0, maxContextMessages));
        
        Collections.reverse(history);

        StringBuilder promptBuilder = new StringBuilder();
        promptBuilder.append("Here is the conversation history:\n\n");
        for (Message msg : history) {
            promptBuilder.append(msg.getSender() == MessageRole.USER ? "User:\n" : "Assistant:\n");
            promptBuilder.append(msg.getContent()).append("\n\n");
        }
        
        promptBuilder.append("Please respond to the latest User message.");
        return promptBuilder.toString();
    }

    private void updateTitleIfFirstMessage(Conversation conversation, String firstMessage) {
        if ("New conversation".equals(conversation.getTitle())) {
            String title = firstMessage.trim();
            if (title.length() > 40) {
                title = title.substring(0, 37) + "...";
            }
            // Strip newlines
            title = title.replaceAll("\\r\\n|\\r|\\n", " ");
            conversation.setTitle(title);
            conversationRepository.save(conversation);
        }
    }

    private ConversationDto mapToDto(Conversation entity) {
        ConversationDto dto = new ConversationDto();
        dto.setId(entity.getId());
        dto.setTitle(entity.getTitle());
        dto.setRole(entity.getRole());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }

    private MessageDto mapToDto(Message entity) {
        MessageDto dto = new MessageDto();
        dto.setId(entity.getId());
        dto.setSender(entity.getSender());
        dto.setContent(entity.getContent());
        dto.setCreatedAt(entity.getCreatedAt());
        return dto;
    }
}
