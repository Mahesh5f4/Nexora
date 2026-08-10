package com.EventmanagementbyMahesh.event.booking.dto;

import java.util.List;
import java.util.UUID;

public class BookingMessage {
    public String correlationId;
    public String userEmail;
    public Long eventId;
    public Integer ticketCount;
    public List<String> seats;

    public BookingMessage() {}

    public BookingMessage(String userEmail, BookingRequest request) {
        this.correlationId = UUID.randomUUID().toString();
        this.userEmail = userEmail;
        this.eventId = request.eventId;
        this.ticketCount = request.ticketCount;
        this.seats = request.seats;
    }
}
