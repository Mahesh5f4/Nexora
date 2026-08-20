package com.EventmanagementbyMahesh.event.ai.usage.repository;

import com.EventmanagementbyMahesh.event.ai.usage.entity.UsageSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;

import java.time.LocalDateTime;
import java.util.Optional;

public interface UsageSessionRepository extends JpaRepository<UsageSession, Long> {
    
    // Find active session for user
    Optional<UsageSession> findFirstByUserIdAndExpiresAtAfterOrderByCreatedAtDesc(Long userId, LocalDateTime now);
    
    // Lock for updates
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM UsageSession u WHERE u.id = :id")
    Optional<UsageSession> findByIdForUpdate(Long id);

    @Query("SELECT COALESCE(SUM(u.tokensUsed), 0) FROM UsageSession u")
    Long sumTokensUsed();
}
