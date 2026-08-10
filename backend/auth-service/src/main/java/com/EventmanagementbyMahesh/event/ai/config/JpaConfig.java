package com.EventmanagementbyMahesh.event.ai.config;

import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Configuration
@EntityScan(basePackages = "com.EventmanagementbyMahesh.event")
@EnableJpaRepositories(basePackages = "com.EventmanagementbyMahesh.event")
public class JpaConfig {
}
