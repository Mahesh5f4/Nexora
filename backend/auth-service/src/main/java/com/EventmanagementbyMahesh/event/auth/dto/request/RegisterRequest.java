package com.EventmanagementbyMahesh.event.auth.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Request payload for user registration")
public class RegisterRequest {
    @Schema(description = "User's full name", example = "John Doe")
    public String name;
    
    @Schema(description = "User's email address", example = "john@example.com")
    public String email;
    
    @Schema(description = "User's chosen password", example = "P@ssw0rd123")
    public String password;
}