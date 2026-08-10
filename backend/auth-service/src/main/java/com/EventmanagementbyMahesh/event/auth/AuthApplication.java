package com.EventmanagementbyMahesh.event.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication(scanBasePackages = "com.EventmanagementbyMahesh.event")
@EnableCaching
public class AuthApplication {

    public static void main(String[] args) {
        io.github.cdimascio.dotenv.Dotenv dotenv = io.github.cdimascio.dotenv.Dotenv.configure()
                .ignoreIfMissing()
                .load();
        dotenv.entries().forEach(entry -> System.setProperty(entry.getKey(), entry.getValue()));
        
        SpringApplication.run(AuthApplication.class, args);
    }
}
