package com.EventmanagementbyMahesh.event.auth.admin.dto;

import com.EventmanagementbyMahesh.event.auth.entity.Role;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class AdminUserDto {
    private Long id;
    private String name;
    private String email;
    private String avatarUrl;
    private Role role;
    private LocalDateTime lastActive;
    private LocalDateTime createdAt;
}
