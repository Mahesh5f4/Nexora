package com.EventmanagementbyMahesh.event.auth.service;

import com.EventmanagementbyMahesh.event.auth.dto.request.*;
import com.EventmanagementbyMahesh.event.auth.dto.response.AuthResponse;
import com.EventmanagementbyMahesh.event.auth.dto.response.UserDto;
import com.EventmanagementbyMahesh.event.auth.entity.Role;
import com.EventmanagementbyMahesh.event.auth.entity.User;
import com.EventmanagementbyMahesh.event.auth.repository.UserRepository;
import com.EventmanagementbyMahesh.event.common.exception.BadRequestException;
import com.EventmanagementbyMahesh.event.common.exception.ResourceNotFoundException;
import com.EventmanagementbyMahesh.event.common.exception.UnauthorizedException;
import com.EventmanagementbyMahesh.event.common.security.JwtUtil;
import com.EventmanagementbyMahesh.event.common.service.EmailService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedConstruction;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository repo;
    @Mock
    private PasswordEncoder encoder;
    @Mock
    private JwtUtil jwtUtil;
    @Mock
    private EmailService emailService;

    @InjectMocks
    private AuthService authService;

    private User defaultUser;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "googleClientId", "dummy-client-id");

        defaultUser = new User();
        defaultUser.setId(1L);
        defaultUser.setEmail("user@normal.com");
        defaultUser.setName("Test User");
        defaultUser.setPassword("encoded-password");
        defaultUser.setRole(Role.USER);
    }

    @Test
    void register_Success() {
        RegisterRequest req = new RegisterRequest();
        req.email = "new@normal.com";
        req.name = "New User";
        req.password = "password123";

        when(repo.findByEmail(req.email)).thenReturn(Optional.empty());
        when(encoder.encode(req.password)).thenReturn("encoded-password");
        when(repo.save(any(User.class))).thenReturn(new User());

        assertDoesNotThrow(() -> authService.register(req));
        verify(repo).save(argThat(user -> user.getEmail().equals("new@normal.com") && user.getRole() == Role.USER));
    }

    @Test
    void register_DuplicateEmail_ThrowsException() {
        RegisterRequest req = new RegisterRequest();
        req.email = "user@normal.com";

        when(repo.findByEmail(req.email)).thenReturn(Optional.of(defaultUser));

        assertThrows(BadRequestException.class, () -> authService.register(req));
        verify(repo, never()).save(any());
    }

    @Test
    void login_Success_NormalUser_GeneratesOtp() throws Exception {
        LoginRequest req = new LoginRequest();
        req.email = "user@normal.com";
        req.password = "password123";

        when(repo.findByEmail(req.email)).thenReturn(Optional.of(defaultUser));
        when(encoder.matches(req.password, defaultUser.getPassword())).thenReturn(true);

        AuthResponse response = authService.login(req);

        assertTrue(response.requires2FA);
        assertEquals("user@normal.com", response.email);
        verify(repo).save(argThat(user -> user.getOtp() != null && user.getOtpExpiry() != null));
        verify(emailService).sendLoginOtpEmail(eq("user@normal.com"), anyString());
    }

    @Test
    void login_Success_AdminUser_ReturnsToken() {
        defaultUser.setRole(Role.ADMIN);
        LoginRequest req = new LoginRequest();
        req.email = "user@normal.com";
        req.password = "password123";

        when(repo.findByEmail(req.email)).thenReturn(Optional.of(defaultUser));
        when(encoder.matches(req.password, defaultUser.getPassword())).thenReturn(true);
        when(jwtUtil.generateToken(anyString(), anyString())).thenReturn("admin-token");

        AuthResponse response = authService.login(req);

        assertEquals("admin-token", response.token);
        assertEquals("ADMIN", response.role);
        verify(repo, never()).save(any());
        verifyNoInteractions(emailService);
    }

    @Test
    void login_InvalidPassword_ThrowsException() {
        LoginRequest req = new LoginRequest();
        req.email = "user@normal.com";
        req.password = "wrong-password";

        when(repo.findByEmail(req.email)).thenReturn(Optional.of(defaultUser));
        when(encoder.matches(req.password, defaultUser.getPassword())).thenReturn(false);

        assertThrows(BadRequestException.class, () -> authService.login(req));
    }

    @Test
    void login_EmailServiceFailure_HandlesGracefully() throws Exception {
        LoginRequest req = new LoginRequest();
        req.email = "user@normal.com";
        req.password = "password123";

        when(repo.findByEmail(req.email)).thenReturn(Optional.of(defaultUser));
        when(encoder.matches(req.password, defaultUser.getPassword())).thenReturn(true);
        doThrow(new RuntimeException("SMTP Down")).when(emailService).sendLoginOtpEmail(anyString(), anyString());

        assertDoesNotThrow(() -> authService.login(req));
        verify(repo).save(defaultUser);
    }

    @Test
    void verifyOtp_Success() {
        defaultUser.setOtp("123456");
        defaultUser.setOtpExpiry(LocalDateTime.now().plusMinutes(5));

        VerifyOtpRequest req = new VerifyOtpRequest();
        req.email = "user@normal.com";
        req.otp = "123456";

        when(repo.findByEmail(req.email)).thenReturn(Optional.of(defaultUser));
        when(jwtUtil.generateToken(defaultUser.getEmail(), defaultUser.getRole().name())).thenReturn("valid-token");

        AuthResponse response = authService.verifyOtp(req);

        assertEquals("valid-token", response.token);
        assertNull(defaultUser.getOtp());
        verify(repo).save(defaultUser);
    }

    @Test
    void verifyOtp_Expired_ThrowsException() {
        defaultUser.setOtp("123456");
        defaultUser.setOtpExpiry(LocalDateTime.now().minusMinutes(1)); // Expired

        VerifyOtpRequest req = new VerifyOtpRequest();
        req.email = "user@normal.com";
        req.otp = "123456";

        when(repo.findByEmail(req.email)).thenReturn(Optional.of(defaultUser));

        assertThrows(BadRequestException.class, () -> authService.verifyOtp(req));
    }

    @Test
    void verifyOtp_Invalid_ThrowsException() {
        defaultUser.setOtp("123456");
        defaultUser.setOtpExpiry(LocalDateTime.now().plusMinutes(5));

        VerifyOtpRequest req = new VerifyOtpRequest();
        req.email = "user@normal.com";
        req.otp = "654321"; // Wrong OTP

        when(repo.findByEmail(req.email)).thenReturn(Optional.of(defaultUser));

        assertThrows(BadRequestException.class, () -> authService.verifyOtp(req));
    }

    @Test
    void verifyOtp_UserNotFound_ThrowsException() {
        VerifyOtpRequest req = new VerifyOtpRequest();
        req.email = "unknown@normal.com";
        req.otp = "123456";

        when(repo.findByEmail(req.email)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> authService.verifyOtp(req));
    }

    @Test
    void forgotPassword_Success() throws Exception {
        ForgotPasswordRequest req = new ForgotPasswordRequest();
        req.setEmail("user@normal.com");

        when(repo.findByEmail(req.getEmail())).thenReturn(Optional.of(defaultUser));

        assertDoesNotThrow(() -> authService.forgotPassword(req));
        assertNotNull(defaultUser.getOtp());
        verify(repo).save(defaultUser);
        verify(emailService).sendForgotPasswordOtpEmail(eq("user@normal.com"), anyString());
    }

    @Test
    void resetPassword_Success() {
        defaultUser.setOtp("123456");
        defaultUser.setOtpExpiry(LocalDateTime.now().plusMinutes(5));

        ResetPasswordRequest req = new ResetPasswordRequest();
        req.setEmail("user@normal.com");
        req.setOtp("123456");
        req.setNewPassword("new-password123");

        when(repo.findByEmail(req.getEmail())).thenReturn(Optional.of(defaultUser));
        when(encoder.encode("new-password123")).thenReturn("new-encoded-pass");

        assertDoesNotThrow(() -> authService.resetPassword(req));

        assertEquals("new-encoded-pass", defaultUser.getPassword());
        assertNull(defaultUser.getOtp());
        verify(repo).save(defaultUser);
    }

    @Test
    void resetPassword_InvalidOtp_ThrowsException() {
        defaultUser.setOtp("123456");
        defaultUser.setOtpExpiry(LocalDateTime.now().plusMinutes(5));

        ResetPasswordRequest req = new ResetPasswordRequest();
        req.setEmail("user@normal.com");
        req.setOtp("wrong-otp");
        req.setNewPassword("new-password123");

        when(repo.findByEmail(req.getEmail())).thenReturn(Optional.of(defaultUser));

        assertThrows(BadRequestException.class, () -> authService.resetPassword(req));
        verify(repo, never()).save(any());
    }

    @Test
    void loginWithGoogle_Success_ExistingUser() throws Exception {
        try (MockedConstruction<GoogleIdTokenVerifier.Builder> mockedBuilder = Mockito.mockConstruction(GoogleIdTokenVerifier.Builder.class,
                (mock, context) -> {
                    GoogleIdTokenVerifier verifier = Mockito.mock(GoogleIdTokenVerifier.class);
                    GoogleIdToken idToken = Mockito.mock(GoogleIdToken.class);
                    GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
                    payload.setEmail("user@normal.com");
                    payload.set("name", "Google User");
                    payload.set("picture", "avatar.png");
                    
                    try {
                        when(mock.setAudience(any())).thenReturn(mock);
                        when(mock.build()).thenReturn(verifier);
                        when(verifier.verify(anyString())).thenReturn(idToken);
                        when(idToken.getPayload()).thenReturn(payload);
                    } catch (Exception e) {}
                })) {

            when(repo.findByEmail("user@normal.com")).thenReturn(Optional.of(defaultUser));
            when(jwtUtil.generateToken("user@normal.com", "USER")).thenReturn("google-token");

            AuthResponse res = authService.loginWithGoogle("valid-credential");

            assertEquals("google-token", res.token);
            assertEquals("avatar.png", defaultUser.getAvatarUrl());
            verify(repo).save(defaultUser); // Because avatar was updated
        }
    }

    @Test
    void loginWithGoogle_Success_NewUser() throws Exception {
        try (MockedConstruction<GoogleIdTokenVerifier.Builder> mockedBuilder = Mockito.mockConstruction(GoogleIdTokenVerifier.Builder.class,
                (mock, context) -> {
                    GoogleIdTokenVerifier verifier = Mockito.mock(GoogleIdTokenVerifier.class);
                    GoogleIdToken idToken = Mockito.mock(GoogleIdToken.class);
                    GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
                    payload.setEmail("newgoogle@normal.com");
                    payload.set("name", "New Google User");
                    payload.set("picture", "new-avatar.png");
                    
                    try {
                        when(mock.setAudience(any())).thenReturn(mock);
                        when(mock.build()).thenReturn(verifier);
                        when(verifier.verify(anyString())).thenReturn(idToken);
                        when(idToken.getPayload()).thenReturn(payload);
                    } catch (Exception e) {}
                })) {

            when(repo.findByEmail("newgoogle@normal.com")).thenReturn(Optional.empty());
            when(repo.save(any(User.class))).thenAnswer(i -> i.getArguments()[0]);
            when(encoder.encode(anyString())).thenReturn("random-pass");
            when(jwtUtil.generateToken("newgoogle@normal.com", "USER")).thenReturn("google-token-new");

            AuthResponse res = authService.loginWithGoogle("valid-credential");

            assertEquals("google-token-new", res.token);
            assertEquals("newgoogle@normal.com", res.email);
            assertEquals("new-avatar.png", res.avatarUrl);
        }
    }

    @Test
    void loginWithGoogle_InvalidToken_ThrowsException() throws Exception {
        try (MockedConstruction<GoogleIdTokenVerifier.Builder> mockedBuilder = Mockito.mockConstruction(GoogleIdTokenVerifier.Builder.class,
                (mock, context) -> {
                    GoogleIdTokenVerifier verifier = Mockito.mock(GoogleIdTokenVerifier.class);
                    try {
                        when(mock.setAudience(any())).thenReturn(mock);
                        when(mock.build()).thenReturn(verifier);
                        when(verifier.verify(anyString())).thenReturn(null); // Invalid token
                    } catch (Exception e) {}
                })) {

            assertThrows(UnauthorizedException.class, () -> authService.loginWithGoogle("invalid-credential"));
        }
    }

    @Test
    void getUserByEmail_Success() {
        when(repo.findByEmail("user@normal.com")).thenReturn(Optional.of(defaultUser));
        
        Optional<UserDto> result = authService.getUserByEmail("user@normal.com");
        
        assertTrue(result.isPresent());
        assertEquals("user@normal.com", result.get().getEmail());
    }

    @Test
    void getUserAnalytics_ReturnsCorrectData() {
        User activeUser = new User();
        activeUser.setEmail("active@normal.com");
        activeUser.setLastActive(LocalDateTime.now().minusMinutes(2));

        User inactiveUser = new User();
        inactiveUser.setEmail("inactive@normal.com");
        inactiveUser.setLastActive(LocalDateTime.now().minusMinutes(10));

        when(repo.findAll()).thenReturn(Arrays.asList(activeUser, inactiveUser));

        Map<String, Object> analytics = authService.getUserAnalytics();

        assertEquals(2L, analytics.get("totalUsers"));
        assertEquals(1L, analytics.get("activeUsersCount"));
        List<?> activeUsers = (List<?>) analytics.get("activeUsers");
        assertEquals(1, activeUsers.size());
    }
}
