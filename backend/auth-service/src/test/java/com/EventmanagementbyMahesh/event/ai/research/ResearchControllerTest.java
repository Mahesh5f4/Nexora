package com.EventmanagementbyMahesh.event.ai.research;

import com.EventmanagementbyMahesh.event.ai.exception.ProviderException;
import com.EventmanagementbyMahesh.event.ai.research.dto.ResearchRequest;
import com.EventmanagementbyMahesh.event.ai.research.dto.ResearchResponse;
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

@WebMvcTest(ResearchController.class)
@ContextConfiguration(classes = com.EventmanagementbyMahesh.event.auth.AuthApplication.class)
@AutoConfigureMockMvc(addFilters = false)
class ResearchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ResearchService researchService;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private JwtFilter jwtFilter;

    @Test
    @WithMockUser
    void testResearch_Success() throws Exception {
        ResearchRequest request = new ResearchRequest("Compare Redis and Memcached.");
        ResearchResponse response = new ResearchResponse(
                "Redis is better for complex data types...", "groq", "gpt-oss-120b");

        when(researchService.research(any(ResearchRequest.class))).thenReturn(response);

        mockMvc.perform(post("/ai/research")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answer").value("Redis is better for complex data types..."))
                .andExpect(jsonPath("$.provider").value("groq"))
                .andExpect(jsonPath("$.model").value("gpt-oss-120b"));
    }

    @Test
    @WithMockUser
    void testResearch_Validation_BlankQuery() throws Exception {
        ResearchRequest request = new ResearchRequest("");

        mockMvc.perform(post("/ai/research")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void testResearch_Validation_WhitespaceOnlyQuery() throws Exception {
        ResearchRequest request = new ResearchRequest("   \n\t   ");

        mockMvc.perform(post("/ai/research")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void testResearch_Validation_MissingQuery() throws Exception {
        ResearchRequest request = new ResearchRequest();
        request.setQuery(null);

        mockMvc.perform(post("/ai/research")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void testResearch_Validation_OversizedQuery() throws Exception {
        String hugeQuery = "q".repeat(5001);
        ResearchRequest request = new ResearchRequest(hugeQuery);

        mockMvc.perform(post("/ai/research")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void testResearch_ProviderException_Returns503() throws Exception {
        ResearchRequest request = new ResearchRequest("Valid research query");

        when(researchService.research(any(ResearchRequest.class)))
                .thenThrow(new ProviderException("All providers failed"));

        mockMvc.perform(post("/ai/research")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .with(csrf()))
                .andExpect(status().isServiceUnavailable());
    }
}
