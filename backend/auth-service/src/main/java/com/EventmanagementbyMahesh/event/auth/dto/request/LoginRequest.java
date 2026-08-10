package com.EventmanagementbyMahesh.event.auth.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Request payload for user login")
public class LoginRequest {
    @Schema(description = "User's email address", example = "user@example.com")
    public String email;
    
    @Schema(description = "User's password", example = "P@ssw0rd123")
    public String password;
}