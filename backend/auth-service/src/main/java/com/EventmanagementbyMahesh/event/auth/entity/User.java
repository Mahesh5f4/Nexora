package com.EventmanagementbyMahesh.event.auth.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users", indexes = {
        @Index(name = "idx_email", columnList = "email", unique = true)
})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String avatarUrl;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    private LocalDateTime lastActive;

    @Enumerated(EnumType.STRING)
    private Role role;

    @Column(nullable = true, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private String otp;
    private LocalDateTime otpExpiry;

    public User() {}

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getPassword() { return password; }
    public Role getRole() { return role; }
    public String getOtp() { return otp; }
    public LocalDateTime getOtpExpiry() { return otpExpiry; }
    public LocalDateTime getLastActive() { return lastActive; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void setId(Long id) { this.id = id; }
    public void setName(String name) { this.name = name; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public void setEmail(String email) { this.email = email; }
    public void setPassword(String password) { this.password = password; }
    public void setRole(Role role) { this.role = role; }
    public void setOtp(String otp) { this.otp = otp; }
    public void setOtpExpiry(LocalDateTime otpExpiry) { this.otpExpiry = otpExpiry; }
    public void setLastActive(LocalDateTime lastActive) { this.lastActive = lastActive; }
}