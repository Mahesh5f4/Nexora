package com.EventmanagementbyMahesh.event.auth.controller;

import com.EventmanagementbyMahesh.event.auth.dto.request.*;
import com.EventmanagementbyMahesh.event.auth.dto.response.AuthResponse;
import com.EventmanagementbyMahesh.event.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@Tag(name = "Authentication APIs", description = "Endpoints for user registration, login, OAuth, and password management")
public class AuthController {

    private final AuthService service;
    private final com.EventmanagementbyMahesh.event.common.security.RateLimiterService rateLimiter;

    public AuthController(AuthService service, com.EventmanagementbyMahesh.event.common.security.RateLimiterService rateLimiter) {
        this.service = service;
        this.rateLimiter = rateLimiter;
    }

    @Operation(summary = "Register a new user", description = "Creates a new user account with email and password.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User registered successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid input or email already exists")
    })
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        service.register(req);
        return ResponseEntity.ok(Map.of("message", "User registered successfully"));
    }

    @Operation(summary = "Login with email and password", description = "Authenticates a user and returns a JWT or requests OTP verification.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Login successful or OTP required"),
            @ApiResponse(responseCode = "401", description = "Invalid credentials"),
            @ApiResponse(responseCode = "429", description = "Too many failed login attempts")
    })
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        if (!rateLimiter.isAllowed("login:" + req.email, 5, 300)) { // 5 attempts per 5 minutes
            return ResponseEntity.status(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Too many login attempts. Please try again later."));
        }
        return ResponseEntity.ok(service.login(req));
    }

    @Operation(summary = "Verify OTP", description = "Verifies the OTP sent to the user's email for 2FA.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "OTP verified successfully, JWT returned"),
            @ApiResponse(responseCode = "400", description = "Invalid or expired OTP")
    })
    @PostMapping("/verify-otp")
    public ResponseEntity<AuthResponse> verifyOtp(@RequestBody VerifyOtpRequest req) {
        return ResponseEntity.ok(service.verifyOtp(req));
    }

    @Operation(summary = "Google OAuth Login", description = "Authenticates a user using a Google OAuth JWT credential.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Google login successful, JWT returned"),
            @ApiResponse(responseCode = "401", description = "Invalid Google token")
    })
    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(@RequestBody Map<String, String> payload) {
        String credential = payload.get("credential");
        return ResponseEntity.ok(service.loginWithGoogle(credential));
    }

    @Operation(summary = "Forgot Password", description = "Triggers a password reset OTP to be sent to the user's email.")
    @ApiResponse(responseCode = "200", description = "Reset OTP sent successfully")
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        service.forgotPassword(req);
        return ResponseEntity.ok(Map.of("message", "Reset OTP sent to your email"));
    }

    @Operation(summary = "Reset Password", description = "Resets the user's password using the OTP received via email.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Password reset successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid OTP or request")
    })
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        service.resetPassword(req);
        return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
    }

    @Operation(summary = "Update Profile", description = "Updates the authenticated user's profile information.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Profile updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid input")
    })
    @PutMapping("/profile")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AuthResponse> updateProfile(org.springframework.security.core.Authentication auth, @Valid @RequestBody UpdateProfileRequest req) {
        return ResponseEntity.ok(service.updateProfile(auth.getName(), req));
    }

    @Operation(summary = "Internal: Get User By Email", description = "Internal service-to-service call to fetch a user by email.")
    @GetMapping("/internal/users/by-email")
    public ResponseEntity<?> getUserByEmail(@Parameter(description = "User's email address") @RequestParam String email) {
        return service.getUserByEmail(email)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Internal: Get User Analytics", description = "Internal endpoint to fetch global user analytics.")
    @GetMapping("/internal/users/analytics")
    public ResponseEntity<?> getUserAnalytics() {
        return ResponseEntity.ok(service.getUserAnalytics());
    }

    @Operation(summary = "Admin: Get All Users", description = "Admin endpoint to fetch a list of all registered users.")
    @GetMapping("/admin/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllUsers() {
        return ResponseEntity.ok(service.getAllUsers());
    }
}