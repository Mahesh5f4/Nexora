package com.EventmanagementbyMahesh.event.auth.common;

import com.EventmanagementbyMahesh.event.auth.entity.Role;
import com.EventmanagementbyMahesh.event.auth.entity.User;
import com.EventmanagementbyMahesh.event.auth.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.email:admin@eventhub.com}")
    private String adminEmail;

    @Value("${admin.password:admin123}")
    private String adminPassword;

    public AdminInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.findByEmail(adminEmail).isEmpty()) {
            User admin = new User();
            admin.setName("Super Admin");
            admin.setEmail(adminEmail);
            admin.setPassword(passwordEncoder.encode(adminPassword));
            admin.setRole(Role.ADMIN);
            userRepository.save(admin);
            System.out.println("====================================================");
            System.out.println("Default Admin User Created!");
            System.out.println("Email: " + adminEmail);
            System.out.println("Password: [SECURE]");
            System.out.println("====================================================");
        }
    }
}
