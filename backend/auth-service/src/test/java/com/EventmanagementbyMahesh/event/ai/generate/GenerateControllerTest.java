package com.EventmanagementbyMahesh.event.ai.generate;

import com.EventmanagementbyMahesh.event.ai.exception.ProviderException;
import com.EventmanagementbyMahesh.event.ai.generate.dto.GenerateRequest;
import com.EventmanagementbyMahesh.event.ai.generate.dto.GenerateResponse;
import com.EventmanagementbyMahesh.event.common.security.JwtUtil;
import com.EventmanagementbyMahesh.event.common.security.JwtFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(GenerateController.class)
@ContextConfiguration(classes = com.EventmanagementbyMahesh.event.auth.AuthApplication.class)
@AutoConfigureMockMvc(addFilters = false)
class GenerateControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private GenerateService generateService;

    @MockBean
    private JwtUtil jwtUtil;
    
    @MockBean
    private JwtFilter jwtFilter;

    @Test
    @WithMockUser
    void testGenerateContent_Success() throws Exception {
        GenerateRequest request = new GenerateRequest("Write a unit test", GenerateType.CODE);
        GenerateResponse response = new GenerateResponse("Content", "gemini", "gemini-1.5-flash", null);

        when(generateService.generateContent(any(GenerateRequest.class))).thenReturn(response);

        mockMvc.perform(post("/ai/content/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Content"))
                .andExpect(jsonPath("$.provider").value("gemini"))
                .andExpect(jsonPath("$.model").value("gemini-1.5-flash"));
    }

    @Test
    @WithMockUser
    void testGenerateContent_Validation_BlankPrompt() throws Exception {
        GenerateRequest request = new GenerateRequest("", GenerateType.GENERAL);

        mockMvc.perform(post("/ai/content/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void testGenerateContent_Validation_WhitespaceOnlyPrompt() throws Exception {
        GenerateRequest request = new GenerateRequest("   \n\t   ", GenerateType.GENERAL);

        mockMvc.perform(post("/ai/content/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void testGenerateContent_Validation_MissingPrompt() throws Exception {
        GenerateRequest request = new GenerateRequest();
        request.setType(GenerateType.GENERAL);

        mockMvc.perform(post("/ai/content/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void testGenerateContent_Validation_OversizedPrompt() throws Exception {
        String hugePrompt = "a".repeat(10001);
        GenerateRequest request = new GenerateRequest(hugePrompt, GenerateType.GENERAL);

        mockMvc.perform(post("/ai/content/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void testGenerateContent_ProviderException() throws Exception {
        GenerateRequest request = new GenerateRequest("Valid prompt", GenerateType.GENERAL);

        when(generateService.generateContent(any(GenerateRequest.class)))
                .thenThrow(new ProviderException("No providers available"));

        mockMvc.perform(post("/ai/content/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isServiceUnavailable());
    }
}
