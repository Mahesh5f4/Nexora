package com.EventmanagementbyMahesh.event.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class InternalServiceTokenFilter extends OncePerRequestFilter {

    private final String internalToken;
    private final JwtUtil jwtUtil;

    public InternalServiceTokenFilter(
            @Value("${ai.internal.token:${AI_INTERNAL_TOKEN:${AI_SERVICE_INTERNAL_TOKEN:super-secret-dev-token}}}") String internalToken,
            JwtUtil jwtUtil) {
        this.internalToken = internalToken;
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String path = request.getServletPath();
        if (path == null || path.isEmpty()) {
            path = request.getRequestURI();
        }
        if (path.startsWith("/internal/") || path.startsWith("/api/internal/")) {
            String authHeader = request.getHeader("Authorization");
            if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                if (StringUtils.hasText(internalToken) && internalToken.equals(token)) {
                    // Internal authentication passed. Check for user identity propagation.
                    String userJwt = request.getHeader("X-User-Jwt");
                    if (StringUtils.hasText(userJwt)) {
                        try {
                            var claims = jwtUtil.extract(userJwt);
                            String email = claims.getSubject();
                            String role = (String) claims.get("role");

                            var auth = new UsernamePasswordAuthenticationToken(
                                    email,
                                    null,
                                    List.of(() -> "ROLE_" + role)
                            );
                            SecurityContextHolder.getContext().setAuthentication(auth);
                        } catch (Exception e) {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.getWriter().write("Unauthorized: Invalid user identity token");
                            return;
                        }
                    }
                    filterChain.doFilter(request, response);
                    return;
                }
            }
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("Unauthorized: Invalid or missing internal service token");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
