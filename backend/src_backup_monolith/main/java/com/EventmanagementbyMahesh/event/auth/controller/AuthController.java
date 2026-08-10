package com.EventmanagementbyMahesh.event.auth.controller;

import com.EventmanagementbyMahesh.event.auth.dto.request.*;
import com.EventmanagementbyMahesh.event.auth.dto.response.AuthResponse;
import com.EventmanagementbyMahesh.event.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService service;

    public AuthController(AuthService service) {
        this.service = service;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        service.register(req);
        return ResponseEntity.ok(Map.of("message", "User registered successfully"));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest req) {
        return ResponseEntity.ok(service.login(req));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<AuthResponse> verifyOtp(@RequestBody VerifyOtpRequest req) {
        return ResponseEntity.ok(service.verifyOtp(req));
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(@RequestBody Map<String, String> payload) {
        String credential = payload.get("credential");
        return ResponseEntity.ok(service.loginWithGoogle(credential));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        service.forgotPassword(req);
        return ResponseEntity.ok(Map.of("message", "Reset OTP sent to your email"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        service.resetPassword(req);
        return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
    }
}