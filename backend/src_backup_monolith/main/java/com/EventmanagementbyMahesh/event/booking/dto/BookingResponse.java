package com.EventmanagementbyMahesh.event.booking.dto;

import java.util.List;

public class BookingResponse {
    public Long bookingId;
    public Long eventId;
    public String eventTitle;
    public String eventLocation;
    public String eventTime;
    public Double eventPrice;
    public Long userId;
    public String userEmail;
    public Integer ticketCount;
    public List<String> seats;
    public String status;

    public BookingResponse() {
    }

    public BookingResponse(Long bookingId, Long eventId, String eventTitle, String eventLocation, 
                           String eventTime, Double eventPrice, Long userId, String userEmail, 
                           Integer ticketCount, List<String> seats, String status) {
        this.bookingId = bookingId;
        this.eventId = eventId;
        this.eventTitle = eventTitle;
        this.eventLocation = eventLocation;
        this.eventTime = eventTime;
        this.eventPrice = eventPrice;
        this.userId = userId;
        this.userEmail = userEmail;
        this.ticketCount = ticketCount;
        this.seats = seats;
        this.status = status;
    }
}
