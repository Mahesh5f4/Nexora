package com.EventmanagementbyMahesh.event.auth.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Request payload for verifying a 2FA OTP")
public class VerifyOtpRequest {
    @Schema(description = "User's email address", example = "user@example.com")
    public String email;
    
    @Schema(description = "The 6-digit OTP code received via email", example = "123456")
    public String otp;
}
