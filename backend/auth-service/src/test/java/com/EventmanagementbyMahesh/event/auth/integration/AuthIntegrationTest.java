package com.EventmanagementbyMahesh.event.auth.integration;

import com.EventmanagementbyMahesh.event.auth.dto.request.LoginRequest;
import com.EventmanagementbyMahesh.event.auth.dto.request.RegisterRequest;
import com.EventmanagementbyMahesh.event.auth.dto.request.UpdateProfileRequest;
import com.EventmanagementbyMahesh.event.auth.dto.request.VerifyOtpRequest;
import com.EventmanagementbyMahesh.event.auth.repository.UserRepository;
import com.EventmanagementbyMahesh.event.auth.entity.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import org.springframework.boot.test.mock.mockito.MockBean;
import com.EventmanagementbyMahesh.event.common.security.RateLimiterService;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;
    
    @MockBean
    private RateLimiterService rateLimiterService;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        when(rateLimiterService.isAllowed(anyString(), anyInt(), anyInt())).thenReturn(true);
    }

    @Test
    void testFullAuthenticationFlow() throws Exception {
        // 1. Register User
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.email = "integration@normal.com";
        registerRequest.password = "StrongPass123!";
        registerRequest.name = "Integration Test";

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk());

        // 2. Login User (Expect requires2FA = true)
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.email = "integration@normal.com";
        loginRequest.password = "StrongPass123!";

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requires2FA").value(true));

        // Get OTP from DB
        User user = userRepository.findByEmail("integration@normal.com").orElseThrow();
        String otp = user.getOtp();

        // 3. Verify OTP
        VerifyOtpRequest otpRequest = new VerifyOtpRequest();
        otpRequest.email = "integration@normal.com";
        otpRequest.otp = otp;

        MvcResult otpResult = mockMvc.perform(post("/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(otpRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andReturn();

        String responseString = otpResult.getResponse().getContentAsString();
        String token = objectMapper.readTree(responseString).get("token").asText();

        // 4. Access Protected Route (Profile Update)
        UpdateProfileRequest updateProfileRequest = new UpdateProfileRequest();
        updateProfileRequest.setName("Integration Test Updated");

        mockMvc.perform(put("/auth/profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateProfileRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Integration Test Updated"));
                
        // 4. Access Protected Route without token should fail
        mockMvc.perform(put("/auth/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateProfileRequest)))
                .andExpect(status().isForbidden());
    }
    
    @Test
    void testUserIsolation() throws Exception {
        // 1. Register User A
        RegisterRequest regA = new RegisterRequest();
        regA.email = "userA@normal.com"; regA.password = "passA"; regA.name = "User A";
        mockMvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(regA))).andExpect(status().isOk());

        // 2. Register User B
        RegisterRequest regB = new RegisterRequest();
        regB.email = "userB@normal.com"; regB.password = "passB"; regB.name = "User B";
        mockMvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(regB))).andExpect(status().isOk());

        // 3. Login User A
        LoginRequest logA = new LoginRequest();
        logA.email = "userA@normal.com"; logA.password = "passA";
        mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(logA)))
                .andExpect(status().isOk());
                
        User userA = userRepository.findByEmail("userA@normal.com").orElseThrow();
        VerifyOtpRequest otpReqA = new VerifyOtpRequest();
        otpReqA.email = "userA@normal.com";
        otpReqA.otp = userA.getOtp();

        String resA = mockMvc.perform(post("/auth/verify-otp").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(otpReqA)))
                .andReturn().getResponse().getContentAsString();
        String tokenA = objectMapper.readTree(resA).get("token").asText();

        // User A updates profile
        UpdateProfileRequest updateA = new UpdateProfileRequest();
        updateA.setName("User A Modified");
        mockMvc.perform(put("/auth/profile")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("User A Modified"));

        // Verify User B's name is NOT modified by User A's token
        User dbUserB = userRepository.findByEmail("userB@normal.com").orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals("User B", dbUserB.getName());
    }

    @Test
    void testDuplicateEmailRegistration() throws Exception {
        RegisterRequest req1 = new RegisterRequest();
        req1.email = "duplicate@normal.com"; req1.password = "pass123"; req1.name = "User 1";
        mockMvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isOk());

        RegisterRequest req2 = new RegisterRequest();
        req2.email = "duplicate@normal.com"; req2.password = "pass456"; req2.name = "User 2";
        mockMvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testUnknownEndpointWithValidToken() throws Exception {
        RegisterRequest reg = new RegisterRequest();
        reg.email = "unknown@normal.com"; reg.password = "pass"; reg.name = "Unknown";
        mockMvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(reg))).andExpect(status().isOk());

        LoginRequest log = new LoginRequest();
        log.email = "unknown@normal.com"; log.password = "pass";
        mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(log))).andExpect(status().isOk());
        
        User user = userRepository.findByEmail("unknown@normal.com").orElseThrow();
        VerifyOtpRequest otpReq = new VerifyOtpRequest();
        otpReq.email = "unknown@normal.com";
        otpReq.otp = user.getOtp();

        String res = mockMvc.perform(post("/auth/verify-otp").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(otpReq)))
                .andReturn().getResponse().getContentAsString();
        String token = objectMapper.readTree(res).get("token").asText();

        // Accessing a route that doesn't exist should return 404 or 500 depending on Spring config, but NOT 401/403 since token is valid
        mockMvc.perform(post("/auth/this-does-not-exist")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().is5xxServerError());
    }
}
