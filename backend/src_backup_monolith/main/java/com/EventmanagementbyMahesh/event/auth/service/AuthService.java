package com.EventmanagementbyMahesh.event.auth.service;

import com.EventmanagementbyMahesh.event.auth.dto.request.*;
import com.EventmanagementbyMahesh.event.auth.dto.response.AuthResponse;
import com.EventmanagementbyMahesh.event.auth.entity.*;
import com.EventmanagementbyMahesh.event.auth.repository.UserRepository;
import com.EventmanagementbyMahesh.event.auth.security.JwtUtil;
import com.EventmanagementbyMahesh.event.common.exception.BadRequestException;
import com.EventmanagementbyMahesh.event.common.exception.ResourceNotFoundException;
import com.EventmanagementbyMahesh.event.common.exception.BaseException;
import com.EventmanagementbyMahesh.event.common.exception.UnauthorizedException;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Random;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);
    private final UserRepository repo;
    private final PasswordEncoder encoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    @Value("${google.client.id:}")
    private String googleClientId;

    public AuthService(UserRepository repo,
                       PasswordEncoder encoder,
                       JwtUtil jwtUtil,
                       EmailService emailService) {
        this.repo = repo;
        this.encoder = encoder;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
    }

    public void register(RegisterRequest req) {
        if (repo.findByEmail(req.email).isPresent()) {
            throw new BadRequestException("User with this email already exists");
        }

        User user = new User();
        user.setName(req.name);
        user.setEmail(req.email);
        user.setPassword(encoder.encode(req.password));
        user.setRole(Role.USER);

        repo.save(user);
    }

    public AuthResponse login(LoginRequest req) {
        User user = repo.findByEmail(req.email)
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));

        if (!encoder.matches(req.password, user.getPassword())) {
            throw new BadRequestException("Invalid email or password");
        }

        // Bypass 2FA for ADMIN
        if (user.getRole() == Role.ADMIN) {
            String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
            return new AuthResponse(token, user.getRole().name(), user.getEmail(), user.getName(), user.getAvatarUrl(), user.getCreatedAt());
        }

        // Generate OTP for regular users
        String otp = String.format("%06d", new Random().nextInt(999999));
        user.setOtp(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(5));
        user.setLastActive(LocalDateTime.now());
        repo.save(user);

        // Send Email
        try {
            emailService.sendOtpEmail(user.getEmail(), otp);
        } catch (Exception e) {
            logger.error("Failed to send OTP to {}: {}", user.getEmail(), e.getMessage());
        }

        return new AuthResponse(true, user.getEmail());
    }

    public AuthResponse verifyOtp(VerifyOtpRequest req) {
        User user = repo.findByEmail(req.email)
                .orElseThrow(() -> new ResourceNotFoundException("User with email " + req.email + " not found"));

        if (user.getOtp() == null || !user.getOtp().equals(req.otp)) {
            throw new BadRequestException("Invalid OTP code");
        }

        if (user.getOtpExpiry().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("OTP has expired. Please request a new one.");
        }

        // Clear OTP after successful verification
        user.setOtp(null);
        user.setOtpExpiry(null);
        repo.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
        return new AuthResponse(token, user.getRole().name(), user.getEmail(), user.getName(), user.getAvatarUrl(), user.getCreatedAt());
    }

    public AuthResponse loginWithGoogle(String credential) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(credential);
            if (idToken == null) {
                throw new RuntimeException("Invalid Google token");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            String email = payload.getEmail();
            String name = (String) payload.get("name");
            String picture = (String) payload.get("picture");

            User user = repo.findByEmail(email).orElseGet(() -> {
                User newUser = new User();
                newUser.setEmail(email);
                newUser.setName(name);
                newUser.setAvatarUrl(picture);
                newUser.setRole(Role.USER);
                newUser.setPassword(encoder.encode(UUID.randomUUID().toString()));
                return repo.save(newUser);
            });

            // Update avatar if changed or missing
            if (picture != null && !picture.equals(user.getAvatarUrl())) {
                user.setAvatarUrl(picture);
                repo.save(user);
            }

            // Google login bypasses 2FA for convenience in this demo
            String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
            return new AuthResponse(token, user.getRole().name(), user.getEmail(), user.getName(), user.getAvatarUrl(), user.getCreatedAt());
        } catch (Exception e) {
            logger.error("Google login failed for token: {}", e.getMessage());
            throw new UnauthorizedException("Authentication with Google failed");
        }
    }

    public void forgotPassword(ForgotPasswordRequest req) {
        try {
            if (req == null || req.getEmail() == null) {
                throw new BadRequestException("Email is required");
            }
            User user = repo.findByEmail(req.getEmail())
                    .orElseThrow(() -> new ResourceNotFoundException("User with email " + req.getEmail() + " not found"));

            String otp = String.format("%06d", new Random().nextInt(999999));
            user.setOtp(otp);
            user.setOtpExpiry(LocalDateTime.now().plusMinutes(10)); // 10 minutes for password reset
            repo.save(user);

            try {
                emailService.sendOtpEmail(user.getEmail(), otp);
            } catch (Exception e) {
                logger.error("Failed to send Reset OTP to {}: {}", user.getEmail(), e.getMessage());
            }
        } catch (Exception e) {
            if (e instanceof BaseException) throw (BaseException) e;
            logger.error("Error in forgotPassword flow: ", e);
            throw new BadRequestException("Could not process forgot password request. Please try again later.");
        }
    }

    public void resetPassword(ResetPasswordRequest req) {
        User user = repo.findByEmail(req.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User with email " + req.getEmail() + " not found"));

        if (user.getOtp() == null || !user.getOtp().equals(req.getOtp())) {
            throw new BadRequestException("Invalid OTP code");
        }

        if (user.getOtpExpiry().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("OTP has expired. Please request a new one.");
        }

        user.setPassword(encoder.encode(req.getNewPassword()));
        user.setOtp(null);
        user.setOtpExpiry(null);
        repo.save(user);
    }
}