package com.EventmanagementbyMahesh.event.auth.admin.dto;

import lombok.Data;
import lombok.Builder;

@Data
@Builder
public class AdminStatsResponse {
    private long totalUsers;
    private long totalMessages;
    private long totalTokensUsed;
}
