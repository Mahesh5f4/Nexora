package com.EventmanagementbyMahesh.event.booking.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookings", indexes = {
        @Index(name = "idx_booking_event_status", columnList = "event_id,status"),
        @Index(name = "idx_booking_user_history", columnList = "user_email,created_at"),
        @Index(name = "idx_booking_composite", columnList = "event_id,status,user_id")
})
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    private String userEmail;

    @Column(nullable = false)
    private Integer ticketCount;

    private String seats;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // Snapshot fields for historical preservation
    private String eventTitle;
    private String eventLocation;
    private String eventTime;
    private String imageUrl;
    private Double eventPrice;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.status = BookingStatus.CONFIRMED;
    }

    // ── Getters & Setters ──────────────────────────────────────
    public Long getId() { return id; }
    public Long getEventId() { return eventId; }
    public Long getUserId() { return userId; }
    public String getUserEmail() { return userEmail; }
    public Integer getTicketCount() { return ticketCount; }
    public String getSeats() { return seats; }
    public BookingStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void setEventId(Long eventId) { this.eventId = eventId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }
    public void setTicketCount(Integer ticketCount) { this.ticketCount = ticketCount; }
    public void setSeats(String seats) { this.seats = seats; }
    public void setStatus(BookingStatus status) { this.status = status; }

    public String getEventTitle() { return eventTitle; }
    public void setEventTitle(String eventTitle) { this.eventTitle = eventTitle; }
    public String getEventLocation() { return eventLocation; }
    public void setEventLocation(String eventLocation) { this.eventLocation = eventLocation; }
    public String getEventTime() { return eventTime; }
    public void setEventTime(String eventTime) { this.eventTime = eventTime; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public Double getEventPrice() { return eventPrice; }
    public void setEventPrice(Double eventPrice) { this.eventPrice = eventPrice; }
}
