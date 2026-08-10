package com.EventmanagementbyMahesh.event.ai.analyze;

import com.EventmanagementbyMahesh.event.ai.analyze.dto.ConversationDto;
import com.EventmanagementbyMahesh.event.ai.analyze.dto.CreateConversationRequest;
import com.EventmanagementbyMahesh.event.ai.analyze.dto.MessageDto;
import com.EventmanagementbyMahesh.event.ai.analyze.dto.SendMessageRequest;
import com.EventmanagementbyMahesh.event.ai.analyze.entity.MessageRole;
import com.EventmanagementbyMahesh.event.ai.analyze.service.ConversationService;
import com.EventmanagementbyMahesh.event.ai.gateway.AiGatewayExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class ConversationControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ConversationService conversationService;

    @InjectMocks
    private ConversationController conversationController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(conversationController)
                .setControllerAdvice(new AiGatewayExceptionHandler())
                .build();
    }

    @Test
    void createConversation_ValidRequest() throws Exception {
        CreateConversationRequest request = new CreateConversationRequest();
        request.setRole("CODE");

        ConversationDto dto = new ConversationDto();
        dto.setId(1L);
        dto.setRole("CODE");

        when(conversationService.createConversation(any(CreateConversationRequest.class))).thenReturn(dto);

        mockMvc.perform(post("/ai/conversations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.role").value("CODE"));
    }

    @Test
    void createConversation_InvalidRequest() throws Exception {
        CreateConversationRequest request = new CreateConversationRequest(); // missing role
        mockMvc.perform(post("/ai/conversations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void sendMessage_ValidRequest() throws Exception {
        SendMessageRequest request = new SendMessageRequest();
        request.setContent("Hello");

        MessageDto dto = new MessageDto();
        dto.setId(2L);
        dto.setSender(MessageRole.ASSISTANT);
        dto.setContent("Hi there!");

        when(conversationService.sendMessage(eq(1L), eq("Hello"))).thenReturn(dto);

        mockMvc.perform(post("/ai/conversations/1/messages")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sender").value("ASSISTANT"))
                .andExpect(jsonPath("$.content").value("Hi there!"));
    }

    @Test
    void getConversations() throws Exception {
        ConversationDto dto = new ConversationDto();
        dto.setId(1L);
        when(conversationService.listConversations()).thenReturn(List.of(dto));

        mockMvc.perform(get("/ai/conversations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    void deleteConversation() throws Exception {
        doNothing().when(conversationService).deleteConversation(1L);

        mockMvc.perform(delete("/ai/conversations/1"))
                .andExpect(status().isNoContent());
    }
}
