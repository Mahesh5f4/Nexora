package com.EventmanagementbyMahesh.event.auth.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request payload for user login")
public class LoginRequest {
    @Schema(description = "User's email address", example = "user@example.com")
    public String email;
    
    @Schema(description = "User's password", example = "P@ssw0rd123")
    public String password;
}