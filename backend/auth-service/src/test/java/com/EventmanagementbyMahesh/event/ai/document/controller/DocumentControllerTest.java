package com.EventmanagementbyMahesh.event.ai.document.controller;

import com.EventmanagementbyMahesh.event.ai.document.entity.Document;
import com.EventmanagementbyMahesh.event.ai.document.entity.DocumentStatus;
import com.EventmanagementbyMahesh.event.ai.document.repository.DocumentRepository;
import com.EventmanagementbyMahesh.event.ai.document.dto.RagAskRequest;
import com.EventmanagementbyMahesh.event.ai.document.dto.RagAnswerResponse;
import com.EventmanagementbyMahesh.event.ai.document.dto.RagSourceDto;
import com.EventmanagementbyMahesh.event.ai.document.dto.RetrievalRequest;
import com.EventmanagementbyMahesh.event.ai.document.dto.RetrievalResponse;
import com.EventmanagementbyMahesh.event.ai.document.dto.RetrievedChunkDto;
import com.EventmanagementbyMahesh.event.auth.entity.Role;
import com.EventmanagementbyMahesh.event.auth.entity.User;
import com.EventmanagementbyMahesh.event.auth.repository.UserRepository;
import com.EventmanagementbyMahesh.event.common.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.*;
import java.util.List;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.test.mock.mockito.MockBean;
import com.EventmanagementbyMahesh.event.ai.document.client.PythonAiServiceClient;

@SpringBootTest(classes = com.EventmanagementbyMahesh.event.auth.AuthApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class DocumentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private JwtUtil jwtUtil;
    
    @MockBean
    private PythonAiServiceClient pythonAiServiceClient;

    private User testUser;
    private String userToken;

    @BeforeEach
    void setUp() {
        documentRepository.deleteAll();
        userRepository.deleteAll();

        User user = new User();
        user.setName("Doc Test User");
        user.setEmail("doc.test@example.com");
        user.setPassword("password123");
        user.setRole(Role.USER);
        testUser = userRepository.save(user);

        userToken = jwtUtil.generateToken(testUser.getEmail(), testUser.getRole().name());
    }

    @Test
    void shouldUploadDocument() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.txt",
                "text/plain",
                "Hello World".getBytes()
        );

        mockMvc.perform(multipart("/ai/documents")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.filename", is("test.txt")))
                .andExpect(jsonPath("$.contentType", is("text/plain")));
                
        // In the controller, the return object is created from the doc before async processing completes. 
        // We verify that the client was called or mock it gracefully.
        verify(pythonAiServiceClient).indexDocument(org.mockito.Mockito.any(Document.class), org.mockito.Mockito.any(byte[].class));
    }

    @Test
    void shouldListDocuments() throws Exception {
        Document doc = new Document(testUser.getId(), "test.txt", "text/plain", 11L, DocumentStatus.COMPLETED);
        documentRepository.save(doc);

        mockMvc.perform(get("/ai/documents")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].filename", is("test.txt")));
    }

    @Test
    void shouldDeleteDocument() throws Exception {
        Document doc = new Document(testUser.getId(), "delete_me.txt", "text/plain", 11L, DocumentStatus.COMPLETED);
        doc = documentRepository.save(doc);

        mockMvc.perform(delete("/ai/documents/" + doc.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/ai/documents")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void shouldSearchDocuments() throws Exception {
        RetrievalRequest request = new RetrievalRequest("test query", 5);
        RetrievedChunkDto chunk = new RetrievedChunkDto("doc1", "chunk1", "test.txt", "content", 0.95);
        RetrievalResponse mockResponse = new RetrievalResponse(List.of(chunk));

        when(pythonAiServiceClient.retrieveDocuments("test query", testUser.getId(), 5))
                .thenReturn(mockResponse);

        mockMvc.perform(post("/ai/documents/search")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results", hasSize(1)))
                .andExpect(jsonPath("$.results[0].documentId", is("doc1")))
                .andExpect(jsonPath("$.results[0].content", is("content")));
    }

    @Test
    void shouldFailSearchWithBlankQuery() throws Exception {
        RetrievalRequest request = new RetrievalRequest("", 5);

        mockMvc.perform(post("/ai/documents/search")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldFailSearchUnauthenticated() throws Exception {
        RetrievalRequest request = new RetrievalRequest("test query", 5);

        mockMvc.perform(post("/ai/documents/search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    void shouldAskQuestion() throws Exception {
        RagAskRequest request = new RagAskRequest("test question", 5);
        RagSourceDto source = new RagSourceDto("doc1", "test.txt", "chunk1", 0.95);
        RagAnswerResponse mockResponse = new RagAnswerResponse("answer", List.of(source));

        when(pythonAiServiceClient.askQuestion("test question", testUser.getId(), 5))
                .thenReturn(mockResponse);

        mockMvc.perform(post("/ai/documents/ask")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answer", is("answer")))
                .andExpect(jsonPath("$.sources", hasSize(1)))
                .andExpect(jsonPath("$.sources[0].documentId", is("doc1")));
    }

    @Test
    void shouldFailAskWithBlankQuery() throws Exception {
        RagAskRequest request = new RagAskRequest("", 5);

        mockMvc.perform(post("/ai/documents/ask")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
