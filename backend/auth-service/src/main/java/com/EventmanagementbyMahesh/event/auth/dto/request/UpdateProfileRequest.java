package com.EventmanagementbyMahesh.event.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    @NotBlank(message = "Name is required")
    private String name;
}
