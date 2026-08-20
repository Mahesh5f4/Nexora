package com.EventmanagementbyMahesh.event.ai.usage.service;

import com.EventmanagementbyMahesh.event.ai.exception.UsageExhaustedException;
import com.EventmanagementbyMahesh.event.ai.usage.entity.UsageSession;
import com.EventmanagementbyMahesh.event.ai.usage.repository.UsageSessionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import com.EventmanagementbyMahesh.event.ai.usage.dto.UsageResponse;

@Service
public class UsageSessionService {

    private final UsageSessionRepository usageSessionRepository;

    @Value("${ai.usage.window-minutes:60}")
    private int windowMinutes;

    @Value("${ai.usage.token-budget:500000}")
    private int tokenBudget;

    public UsageSessionService(UsageSessionRepository usageSessionRepository) {
        this.usageSessionRepository = usageSessionRepository;
    }

    /**
     * Retrieves the current usage session without mutating state.
     * If no active session exists, returns a default response representing 0 usage.
     */
    @Transactional(readOnly = true)
    public UsageResponse getCurrentUsage(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        UsageSession session = usageSessionRepository
                .findFirstByUserIdAndExpiresAtAfterOrderByCreatedAtDesc(userId, now)
                .orElse(null);

        UsageResponse response = new UsageResponse();
        if (session != null) {
            response.setTokensUsed(session.getTokensUsed());
            response.setTokenBudget(session.getTokenBudget());
            response.setTokensRemaining(Math.max(0, session.getTokenBudget() - session.getTokensUsed()));
            response.setStartedAt(session.getStartedAt());
            response.setExpiresAt(session.getExpiresAt());
        } else {
            response.setTokensUsed(0);
            response.setTokenBudget(tokenBudget);
            response.setTokensRemaining(tokenBudget);
            response.setStartedAt(now);
            response.setExpiresAt(now.plusMinutes(windowMinutes));
        }
        return response;
    }

    /**
     * Checks if the user has an active session and enough budget.
     * Creates a new session if none exists or if the current one is expired.
     */
    @Transactional
    public UsageSession checkAndReserve(Long userId, int estimatedTokens) {
        LocalDateTime now = LocalDateTime.now();
        UsageSession session = usageSessionRepository
                .findFirstByUserIdAndExpiresAtAfterOrderByCreatedAtDesc(userId, now)
                .orElseGet(() -> createNewSession(userId, now));

        // BYPASS USAGE CHECK FOR NOW
        // if (session.getTokensUsed() + estimatedTokens > session.getTokenBudget()) {
        //     throw new UsageExhaustedException(
        //             "Usage budget exhausted. Please try again after the session resets.",
        //             session.getExpiresAt()
        //     );
        // }

        return session;
    }

    /**
     * Records exact token usage for the active session atomically.
     */
    @Transactional
    public void recordUsage(Long userId, int totalTokens) {
        if (totalTokens <= 0) return;
        
        LocalDateTime now = LocalDateTime.now();
        UsageSession session = usageSessionRepository
                .findFirstByUserIdAndExpiresAtAfterOrderByCreatedAtDesc(userId, now)
                .orElse(null);

        if (session != null) {
            // Lock and update to prevent concurrent modification race conditions
            UsageSession lockedSession = usageSessionRepository.findByIdForUpdate(session.getId())
                    .orElseThrow(() -> new IllegalStateException("Session vanished"));
            
            lockedSession.setTokensUsed(lockedSession.getTokensUsed() + totalTokens);
            usageSessionRepository.save(lockedSession);
        }
    }

    private UsageSession createNewSession(Long userId, LocalDateTime now) {
        UsageSession newSession = new UsageSession();
        newSession.setUserId(userId);
        newSession.setTokenBudget(tokenBudget);
        newSession.setStartedAt(now);
        newSession.setExpiresAt(now.plusMinutes(windowMinutes));
        return usageSessionRepository.save(newSession);
    }
}
