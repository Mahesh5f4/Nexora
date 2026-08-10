package com.EventmanagementbyMahesh.event.auth.controller;

import com.EventmanagementbyMahesh.event.auth.dto.request.*;
import com.EventmanagementbyMahesh.event.auth.dto.response.AuthResponse;
import com.EventmanagementbyMahesh.event.auth.entity.Role;
import com.EventmanagementbyMahesh.event.auth.entity.User;
import com.EventmanagementbyMahesh.event.auth.service.AuthService;
import com.EventmanagementbyMahesh.event.common.security.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AuthController.class, excludeAutoConfiguration = {
        org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class,
        org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration.class
})
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private com.EventmanagementbyMahesh.event.common.security.RateLimiterService rateLimiterService;

    @MockBean
    private JwtUtil jwtUtil; // Required because SecurityConfig loads it in context

    @Test
    void registerUserSuccessfully() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.email = "newuser@example.com";
        request.password = "password123";
        request.name = "New User";

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User registered successfully"));

        verify(authService).register(any(RegisterRequest.class));
    }

    @Test
    void loginUserSuccessfully() throws Exception {
        LoginRequest request = new LoginRequest();
        request.email = "admin@example.com";
        request.password = "password";

        AuthResponse authResponse = new AuthResponse("token", "ADMIN", "admin@example.com", "Admin User", "avatar", java.time.LocalDateTime.now());
        when(authService.login(any(LoginRequest.class))).thenReturn(authResponse);
        when(rateLimiterService.isAllowed(anyString(), org.mockito.ArgumentMatchers.anyInt(), org.mockito.ArgumentMatchers.anyInt())).thenReturn(true);

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("token"))
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.email").value("admin@example.com"));
    }

    @Test
    void loginUserBlockedByBruteForceProtection() throws Exception {
        LoginRequest request = new LoginRequest();
        request.email = "hacker@example.com";
        request.password = "wrongpassword";

        when(rateLimiterService.isAllowed(anyString(), org.mockito.ArgumentMatchers.anyInt(), org.mockito.ArgumentMatchers.anyInt())).thenReturn(false);

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value("Too many login attempts. Please try again later."));
    }

    @Test
    void verifyOtpSuccessfully() throws Exception {
        VerifyOtpRequest request = new VerifyOtpRequest();
        request.email = "user@example.com";
        request.otp = "123456";

        AuthResponse authResponse = new AuthResponse("token-otp", "USER", "user@example.com", "Standard User", "avatar", java.time.LocalDateTime.now());
        when(authService.verifyOtp(any(VerifyOtpRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("token-otp"));
    }

    @Test
    void googleLoginSuccessfully() throws Exception {
        Map<String, String> payload = Map.of("credential", "google-id-token");
        AuthResponse authResponse = new AuthResponse("google-token", "USER", "google@example.com", "Google User", "avatar", java.time.LocalDateTime.now());
        when(authService.loginWithGoogle("google-id-token")).thenReturn(authResponse);

        mockMvc.perform(post("/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("google-token"));
    }

    @Test
    void forgotPasswordValidationFailureOnInvalidEmail() throws Exception {
        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("invalid-email-format");

        mockMvc.perform(post("/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest()); // Jakarta @Valid handles bad format
    }

    @Test
    void resetPasswordValidationFailureOnShortOtp() throws Exception {
        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setEmail("user@example.com");
        request.setOtp("123"); // Needs 6 digits
        request.setNewPassword("newpass");

        mockMvc.perform(post("/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getUserByEmailReturnsUser() throws Exception {
        com.EventmanagementbyMahesh.event.auth.dto.response.UserDto userDto = new com.EventmanagementbyMahesh.event.auth.dto.response.UserDto(1L, "user@example.com", "User Name", "avatar");

        when(authService.getUserByEmail("user@example.com")).thenReturn(Optional.of(userDto));

        mockMvc.perform(get("/auth/internal/users/by-email")
                        .param("email", "user@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("user@example.com"));
    }

    @Test
    void getUserByEmailReturnsNotFound() throws Exception {
        when(authService.getUserByEmail("unknown@example.com")).thenReturn(Optional.empty());

        mockMvc.perform(get("/auth/internal/users/by-email")
                        .param("email", "unknown@example.com"))
                .andExpect(status().isNotFound());
    }
}
