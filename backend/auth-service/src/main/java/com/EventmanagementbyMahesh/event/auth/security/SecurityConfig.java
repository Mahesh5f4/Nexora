package com.EventmanagementbyMahesh.event.auth.security;

import com.EventmanagementbyMahesh.event.common.security.JwtUtil;
import com.EventmanagementbyMahesh.event.common.security.JwtFilter;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.*;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtUtil jwtUtil;

    public SecurityConfig(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        JwtFilter jwtFilter = new JwtFilter(jwtUtil);

        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**", "/auth/**").permitAll()
                        .requestMatchers("/events").permitAll()
                        .requestMatchers("/events/{id}").permitAll()
                        .requestMatchers("/events/*/recommendations").permitAll()
                        .requestMatchers("/bookings/event/*/seats").permitAll()
                        .requestMatchers("/seats/*/locked").permitAll()
                        .requestMatchers("/ws-booking/**").permitAll()
                        .requestMatchers("/admin/analytics/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/events/*/reviews").permitAll()
                        .requestMatchers("/actuator/**").permitAll()
                        .requestMatchers("/error").permitAll()
                        .dispatcherTypeMatchers(jakarta.servlet.DispatcherType.ERROR).permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.addAllowedOriginPattern("*");
        config.addAllowedMethod("*");
        config.addAllowedHeader("*");
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

}