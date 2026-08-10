package com.EventmanagementbyMahesh.event.auth.dto.response;

import java.time.LocalDateTime;

public class AuthResponse {
    public String token;
    public String role;
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