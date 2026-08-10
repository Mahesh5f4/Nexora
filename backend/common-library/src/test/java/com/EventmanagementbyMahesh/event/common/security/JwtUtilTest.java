package com.EventmanagementbyMahesh.event.common.security;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;

class JwtUtilTest {

    @Test
    void generateTokenAndExtractClaims() {
        JwtUtil jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret", "mysecretkeymysecretkeymysecretkey123456");
        ReflectionTestUtils.setField(jwtUtil, "expiration", 60000L);

        String token = jwtUtil.generateToken("user@example.com", "USER");
        Claims claims = jwtUtil.extract(token);

        assertEquals("user@example.com", claims.getSubject());
        assertEquals("USER", claims.get("role", String.class));
    }

    @Test
    void extractClaimsFromExpiredTokenThrowsException() {
        JwtUtil jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret", "mysecretkeymysecretkeymysecretkey123456");
        ReflectionTestUtils.setField(jwtUtil, "expiration", -1000L); // Expired immediately

        String token = jwtUtil.generateToken("user@example.com", "USER");

        org.junit.jupiter.api.Assertions.assertThrows(io.jsonwebtoken.ExpiredJwtException.class, () -> {
            jwtUtil.extract(token);
        });
    }

    @Test
    void extractClaimsFromMalformedTokenThrowsException() {
        JwtUtil jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret", "mysecretkeymysecretkeymysecretkey123456");

        org.junit.jupiter.api.Assertions.assertThrows(io.jsonwebtoken.MalformedJwtException.class, () -> {
            jwtUtil.extract("malformed.token.here");
        });
    }

    @Test
    void extractClaimsFromInvalidSignatureThrowsException() {
        JwtUtil jwtUtil1 = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil1, "secret", "mysecretkeymysecretkeymysecretkey123456");
        ReflectionTestUtils.setField(jwtUtil1, "expiration", 60000L);

        JwtUtil jwtUtil2 = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil2, "secret", "anothersecretkeyanothersecretkey123456");

        String token = jwtUtil1.generateToken("user@example.com", "USER");

        org.junit.jupiter.api.Assertions.assertThrows(io.jsonwebtoken.security.SignatureException.class, () -> {
            jwtUtil2.extract(token);
        });
    }
}
