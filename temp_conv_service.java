package com.EventmanagementbyMahesh.event.ai.chat.service;

import com.EventmanagementbyMahesh.event.ai.analyze.AnalyzeRolePromptProvider;
import com.EventmanagementbyMahesh.event.ai.chat.dto.ConversationDto;
import com.EventmanagementbyMahesh.event.ai.chat.dto.CreateConversationRequest;
import com.EventmanagementbyMahesh.event.ai.chat.dto.MessageDto;
import com.EventmanagementbyMahesh.event.ai.chat.entity.Conversation;
import com.EventmanagementbyMahesh.event.ai.chat.entity.Message;
import com.EventmanagementbyMahesh.event.ai.chat.entity.MessageRole;
import com.EventmanagementbyMahesh.event.ai.chat.repository.ConversationRepository;
import com.EventmanagementbyMahesh.event.ai.chat.repository.MessageRepository;
import com.EventmanagementbyMahesh.event.ai.chat.dto.ConversationMessageDto;
import com.EventmanagementbyMahesh.event.ai.document.client.PythonAiServiceClient;
import com.EventmanagementbyMahesh.event.ai.document.dto.AgentAskRequest;
import com.EventmanagementbyMahesh.event.ai.document.dto.AgentAskResponse;
import com.EventmanagementbyMahesh.event.ai.document.dto.AiExecuteRequest;
import com.EventmanagementbyMahesh.event.ai.document.dto.AiExecuteResponse;
import com.EventmanagementbyMahesh.event.auth.entity.User;
import com.EventmanagementbyMahesh.event.auth.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Service
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final PythonAiServiceClient pythonAiServiceClient;
    private final AnalyzeRolePromptProvider rolePromptProvider;

    @Value("${ai.conversation.max-context-messages:10}")
    private int maxContextMessages;

    public ConversationService(
            ConversationRepository conversationRepository,
            MessageRepository messageRepository,
            UserRepository userRepository,
            PythonAiServiceClient pythonAiServiceClient,
            AnalyzeRolePromptProvider rolePromptProvider) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.pythonAiServiceClient = pythonAiServiceClient;
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
    public Page<MessageDto> getMessages(Long conversationId, Pageable pageable) {
        getConversationSecurely(conversationId); // verify ownership
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId, pageable)
                .map(this::mapToDto);
    }
    
    @Transactional
    public ConversationDto renameConversation(Long conversationId, String newTitle) {
        Conversation conversation = getConversationSecurely(conversationId);
        conversation.setTitle(newTitle);
        conversation = conversationRepository.save(conversation);
        return mapToDto(conversation);
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
    public MessageDto sendMessage(Long conversationId, com.EventmanagementbyMahesh.event.ai.chat.dto.SendMessageRequest request) {
        Conversation conversation = getConversationSecurely(conversationId);
        String content = request.getContent();

        // 1. Save USER message
        Message userMessage = new Message(conversation, MessageRole.USER, content);
        messageRepository.save(userMessage);

        // 2. Load context
        List<Message> history = messageRepository.findAllByConversationIdOrderByCreatedAtAsc(conversationId);
        List<ConversationMessageDto> messages = history.stream()
                .filter(m -> !m.getId().equals(userMessage.getId()))
                .map(m -> new ConversationMessageDto(m.getSender().name().toLowerCase(), m.getContent()))
                .collect(Collectors.toList());

        // 3. Call AI Agent
        AgentAskRequest agentRequest = new AgentAskRequest(
                content,
                String.valueOf(conversation.getUserId()),
                5,
                String.valueOf(conversationId),
                messages,
                request.isUseWebSearch()
        );
        agentRequest.setForceRag(request.isForceRag());
        agentRequest.setDocumentId(request.getDocumentId());
        agentRequest.setMode(request.getMode());
        AgentAskResponse response;
        try {
            response = pythonAiServiceClient.askAgent(agentRequest);
        } catch (com.EventmanagementbyMahesh.event.ai.exception.UsageExhaustedException e) {
            throw e;
        } catch (Exception e) {
            // User message is already saved, and since this method is NOT @Transactional, it won't rollback!
            throw new com.EventmanagementbyMahesh.event.ai.exception.ProviderException("Unable to get a response right now. Please try again.");
        }

        // 4. Save ASSISTANT message
        Message assistantMessage = new Message(conversation, MessageRole.ASSISTANT, response.getAnswer());
        assistantMessage.setSources(response.getSources());
        messageRepository.save(assistantMessage);

        // We no longer synchronously truncate the title. The frontend will call /generate-title separately.
        
        return mapToDto(assistantMessage);
    }

    public SseEmitter streamMessage(Long conversationId, com.EventmanagementbyMahesh.event.ai.chat.dto.SendMessageRequest request) {
        Conversation conversation = getConversationSecurely(conversationId);
        String content = request.getContent();

        // 1. Save USER message
        Message userMessage = new Message(conversation, MessageRole.USER, content);
        messageRepository.save(userMessage);

        // 2. Load context
        List<Message> history = messageRepository.findAllByConversationIdOrderByCreatedAtAsc(conversationId);
        List<ConversationMessageDto> messages = history.stream()
                .filter(m -> !m.getId().equals(userMessage.getId()))
                .map(m -> new ConversationMessageDto(m.getSender().name().toLowerCase(), m.getContent()))
                .collect(Collectors.toList());

        // 3. Call AI Stream
        AgentAskRequest agentRequest = new AgentAskRequest(
                content,
                String.valueOf(conversation.getUserId()),
                5,
                String.valueOf(conversationId),
                messages,
                request.isUseWebSearch()
        );
        agentRequest.setForceRag(request.isForceRag());
        agentRequest.setDocumentId(request.getDocumentId());
        agentRequest.setMode(request.getMode());

        SseEmitter emitter = new SseEmitter(120000L);
        StringBuilder fullAnswer = new StringBuilder();

        // Capture request attributes to propagate to the new thread
        org.springframework.web.context.request.RequestAttributes attributes = org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();

        // Run the blocking stream request in a separate thread
        new Thread(() -> {
            org.springframework.web.context.request.RequestContextHolder.setRequestAttributes(attributes);
            try {
                pythonAiServiceClient.streamAgent(
                    agentRequest,
                    eventBlock -> {
                        try {
                            String eventName = "message";
                            String data = "";

                            String[] lines = eventBlock.split("\n");
                            for (String line : lines) {
                                if (line.startsWith("event:")) {
                                    eventName = line.substring(6).trim();
                                } else if (line.startsWith("data:")) {
                                    data = line.substring(5).trim();
                                }
                            }

                            if (!data.isEmpty()) {
                                Object dataToSend = data;
                                try {
                                    com.fasterxml.jackson.databind.JsonNode node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(data);
                                    if ("token".equals(eventName) && node.has("text")) {
                                        String textChunk = node.get("text").asText();
                                        fullAnswer.append(textChunk);
                                        // Keep dataToSend as the JSON node to safely transmit newlines over SSE
                                        dataToSend = node;
                                    } else {
                                        dataToSend = node;
                                    }
                                } catch (Exception ignored) {
                                }

                                // Send the formatted event to the frontend
                                emitter.send(SseEmitter.event().name(eventName).data(dataToSend));
                            }
                        } catch (Exception e) {
                            emitter.completeWithError(e);
                        }
                    },
                    error -> emitter.completeWithError(error),
                    () -> {
                        try {
                            // 4. Save ASSISTANT message
                            Message assistantMessage = new Message(conversation, MessageRole.ASSISTANT, fullAnswer.toString());
                            messageRepository.save(assistantMessage);
                            
                            emitter.complete();
                        } catch (Exception e) {
                            emitter.completeWithError(e);
                        }
                    }
                );
            } catch (Exception e) {
                emitter.completeWithError(e);
            } finally {
                org.springframework.web.context.request.RequestContextHolder.resetRequestAttributes();
            }
        }).start();

        return emitter;
    }

    private String buildConversationContext(Long conversationId, String currentContent) {
        // This method is no longer used, context is built by Python
        return "";
    }

    @Transactional
    public ConversationDto generateTitle(Long conversationId, String firstMessage) {
        Conversation conversation = getConversationSecurely(conversationId);
        
        // Only generate title if it's still named "New conversation"
        if (!"New conversation".equals(conversation.getTitle())) {
            return mapToDto(conversation);
        }

        String prompt = String.format("Generate a short, concise title (3 to 6 words max) for a chat conversation that begins with the following message. "
                + "Return ONLY the title, no quotes, no extra text, no punctuation at the end.\\n\\nMessage: %s", firstMessage);

        AiExecuteRequest llmRequest = new AiExecuteRequest(
                prompt,
                "You are a helpful AI that summarizes text into short titles.",
                null,
                0.3,
                20
        );

        try {
            AiExecuteResponse response = pythonAiServiceClient.executePrompt(llmRequest);
            String newTitle = response.getContent().trim().replaceAll("^[\"']|[\"']$", ""); // strip quotes if any
            if (!newTitle.isEmpty()) {
                conversation.setTitle(newTitle);
                conversation = conversationRepository.save(conversation);
            }
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(ConversationService.class)
                    .error("Failed to generate title for conversation {}", conversationId, e);
            // Fallback to basic truncation if LLM fails
            String title = firstMessage.trim();
            if (title.length() > 40) {
                title = title.substring(0, 37) + "...";
            }
            title = title.replaceAll("\\r\\n|\\r|\\n", " ");
            conversation.setTitle(title);
            conversation = conversationRepository.save(conversation);
        }

        return mapToDto(conversation);
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
        dto.setSources(entity.getSources() != null ? entity.getSources() : java.util.Collections.emptyList());
        return dto;
    }
}
