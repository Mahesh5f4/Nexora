package com.EventmanagementbyMahesh.event.ai.usage.dto;

import java.time.LocalDateTime;

public class UsageResponse {
    private int tokensUsed;
    private int tokenBudget;
    private int tokensRemaining;
    private LocalDateTime startedAt;
    private LocalDateTime expiresAt;

    public UsageResponse() {
    }

    public int getTokensUsed() {
        return tokensUsed;
    }

    public void setTokensUsed(int tokensUsed) {
        this.tokensUsed = tokensUsed;
    }

    public int getTokenBudget() {
        return tokenBudget;
    }

    public void setTokenBudget(int tokenBudget) {
        this.tokenBudget = tokenBudget;
    }

    public int getTokensRemaining() {
        return tokensRemaining;
    }

    public void setTokensRemaining(int tokensRemaining) {
        this.tokensRemaining = tokensRemaining;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }
}
