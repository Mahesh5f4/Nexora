package com.EventmanagementbyMahesh.event.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RevenueResponse {
    private Long eventId;
    private String eventTitle;
    private Long totalTickets;
    private Double totalRevenue;
}
