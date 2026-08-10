package com.EventmanagementbyMahesh.event.auth.security;

import com.EventmanagementbyMahesh.event.auth.entity.User;
import com.EventmanagementbyMahesh.event.auth.repository.UserRepository;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public JwtFilter(JwtUtil jwtUtil, UserRepository userRepository) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req,
                                    HttpServletResponse res,
                                    FilterChain chain)
            throws ServletException, IOException {

        String header = req.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                var claims = jwtUtil.extract(token);
                String email = claims.getSubject();
                String role = (String) claims.get("role");

                var auth = new UsernamePasswordAuthenticationToken(
                        email,
                        null,
                        List.of(() -> "ROLE_" + role)
                );

                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception ignored) {}
        }

        chain.doFilter(req, res);
    }
}