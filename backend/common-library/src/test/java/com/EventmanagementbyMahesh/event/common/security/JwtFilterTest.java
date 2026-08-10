package com.EventmanagementbyMahesh.event.common.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.anyString;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class JwtFilterTest {

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    @Mock
    private Claims claims;

    @InjectMocks
    private JwtFilter jwtFilter;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void doFilterInternalSetsAuthenticationOnValidToken() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Bearer valid-token");
        when(jwtUtil.extract("valid-token")).thenReturn(claims);
        when(claims.getSubject()).thenReturn("user@example.com");
        when(claims.get("role")).thenReturn("USER");

        jwtFilter.doFilter(request, response, filterChain);

        var authentication = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(authentication);
        assertEquals("user@example.com", authentication.getPrincipal());
        assertEquals("ROLE_USER", authentication.getAuthorities().iterator().next().getAuthority());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilterInternalSkippedWhenNoAuthHeader() throws Exception {
        when(request.getHeader("Authorization")).thenReturn(null);

        jwtFilter.doFilter(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(jwtUtil, never()).extract(anyString());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilterInternalSkippedWhenHeaderDoesNotStartWithBearer() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Basic credentials");

        jwtFilter.doFilter(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(jwtUtil, never()).extract(anyString());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilterInternalHandlesExceptionGracefully() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Bearer invalid-token");
        when(jwtUtil.extract("invalid-token")).thenThrow(new RuntimeException("Expired signature"));

        jwtFilter.doFilter(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }
}
