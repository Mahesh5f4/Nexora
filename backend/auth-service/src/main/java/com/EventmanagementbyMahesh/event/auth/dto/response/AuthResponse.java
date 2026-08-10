package com.EventmanagementbyMahesh.event.auth.dto.response;

import java.time.LocalDateTime;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Authentication response containing JWT or OTP requirement")
public class AuthResponse {
    @Schema(description = "JWT Bearer token (if authentication is complete)", example = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
    public String token;
    public String role;
    @Schema(description = "Indicates if 2FA is required", example = "false")
    public boolean requires2FA;
    public String email;
    public String name;
    public String avatarUrl;
    public LocalDateTime createdAt;

    public AuthResponse(String token, String role, String email, String name, String avatarUrl, LocalDateTime createdAt) {
        this.token = token;
        this.role = role;
        this.email = email;
        this.name = name;
        this.avatarUrl = avatarUrl;
        this.createdAt = createdAt;
        this.requires2FA = false;
    }

    public AuthResponse(boolean requires2FA, String email) {
        this.requires2FA = requires2FA;
        this.email = email;
    }
}