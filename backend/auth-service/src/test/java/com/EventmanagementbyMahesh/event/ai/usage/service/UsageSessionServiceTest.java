package com.EventmanagementbyMahesh.event.ai.usage.service;

import com.EventmanagementbyMahesh.event.ai.exception.UsageExhaustedException;
import com.EventmanagementbyMahesh.event.ai.usage.entity.UsageSession;
import com.EventmanagementbyMahesh.event.ai.usage.repository.UsageSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UsageSessionServiceTest {

    @Mock
    private UsageSessionRepository usageSessionRepository;

    @InjectMocks
    private UsageSessionService usageSessionService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(usageSessionService, "windowMinutes", 60);
        ReflectionTestUtils.setField(usageSessionService, "tokenBudget", 50000);
    }

    @Test
    void testCheckAndReserve_CreatesNewSession_WhenNoneExists() {
        when(usageSessionRepository.findFirstByUserIdAndExpiresAtAfterOrderByCreatedAtDesc(eq(1L), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());

        UsageSession newSession = new UsageSession();
        newSession.setId(10L);
        newSession.setUserId(1L);
        newSession.setTokenBudget(50000);
        newSession.setTokensUsed(0);
        newSession.setStartedAt(LocalDateTime.now());
        newSession.setExpiresAt(LocalDateTime.now().plusMinutes(60));
        
        when(usageSessionRepository.save(any(UsageSession.class))).thenReturn(newSession);

        UsageSession result = usageSessionService.checkAndReserve(1L, 100);

        assertNotNull(result);
        assertEquals(50000, result.getTokenBudget());
        assertEquals(0, result.getTokensUsed());
        verify(usageSessionRepository, times(1)).save(any(UsageSession.class));
    }

    @Test
    void testCheckAndReserve_UsesExistingSession() {
        UsageSession existingSession = new UsageSession();
        existingSession.setId(10L);
        existingSession.setUserId(1L);
        existingSession.setTokenBudget(50000);
        existingSession.setTokensUsed(1000);
        
        when(usageSessionRepository.findFirstByUserIdAndExpiresAtAfterOrderByCreatedAtDesc(eq(1L), any(LocalDateTime.class)))
                .thenReturn(Optional.of(existingSession));

        UsageSession result = usageSessionService.checkAndReserve(1L, 100);

        assertNotNull(result);
        assertEquals(10L, result.getId());
        assertEquals(1000, result.getTokensUsed());
        verify(usageSessionRepository, never()).save(any(UsageSession.class));
    }

    @Test
    void testCheckAndReserve_ThrowsUsageExhausted_WhenBudgetExceeded() {
        UsageSession existingSession = new UsageSession();
        existingSession.setId(10L);
        existingSession.setUserId(1L);
        existingSession.setTokenBudget(50000);
        existingSession.setTokensUsed(49950);
        existingSession.setExpiresAt(LocalDateTime.now().plusMinutes(30));
        
        when(usageSessionRepository.findFirstByUserIdAndExpiresAtAfterOrderByCreatedAtDesc(eq(1L), any(LocalDateTime.class)))
                .thenReturn(Optional.of(existingSession));

        UsageExhaustedException exception = assertThrows(UsageExhaustedException.class, () -> {
            usageSessionService.checkAndReserve(1L, 100);
        });
        
        assertEquals(existingSession.getExpiresAt(), exception.getResetTime());
    }

    @Test
    void testRecordUsage_UpdatesTokens() {
        UsageSession existingSession = new UsageSession();
        existingSession.setId(10L);
        existingSession.setUserId(1L);
        existingSession.setTokensUsed(500);
        
        when(usageSessionRepository.findFirstByUserIdAndExpiresAtAfterOrderByCreatedAtDesc(eq(1L), any(LocalDateTime.class)))
                .thenReturn(Optional.of(existingSession));
                
        when(usageSessionRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(existingSession));

        usageSessionService.recordUsage(1L, 250);

        assertEquals(750, existingSession.getTokensUsed());
        verify(usageSessionRepository, times(1)).save(existingSession);
    }
}
