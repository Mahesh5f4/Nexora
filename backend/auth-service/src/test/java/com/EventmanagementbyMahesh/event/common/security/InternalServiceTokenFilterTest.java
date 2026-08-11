package com.EventmanagementbyMahesh.event.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class InternalServiceTokenFilterTest {

    @Test
    void doFilterInternal_validToken_proceeds() throws ServletException, IOException {
        InternalServiceTokenFilter filter = new InternalServiceTokenFilter("valid-token");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/internal/ai/execute");
        request.addHeader("Authorization", "Bearer valid-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = mock(FilterChain.class);

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertEquals(200, response.getStatus()); // MockHttpServletResponse default is 200
    }

    @Test
    void doFilterInternal_invalidToken_returns401() throws ServletException, IOException {
        InternalServiceTokenFilter filter = new InternalServiceTokenFilter("valid-token");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/internal/ai/execute");
        request.addHeader("Authorization", "Bearer invalid-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = mock(FilterChain.class);

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain, never()).doFilter(any(), any());
        assertEquals(401, response.getStatus());
    }

    @Test
    void doFilterInternal_missingToken_returns401() throws ServletException, IOException {
        InternalServiceTokenFilter filter = new InternalServiceTokenFilter("valid-token");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/internal/ai/execute");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = mock(FilterChain.class);

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain, never()).doFilter(any(), any());
        assertEquals(401, response.getStatus());
    }

    @Test
    void doFilterInternal_notInternalPath_proceeds() throws ServletException, IOException {
        InternalServiceTokenFilter filter = new InternalServiceTokenFilter("valid-token");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/some-other-path");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = mock(FilterChain.class);

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
    }
}
