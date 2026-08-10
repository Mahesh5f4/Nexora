package com.EventmanagementbyMahesh.event.events.dto;

import java.io.Serializable;
import java.time.LocalDateTime;

public class EventResponse implements Serializable {
    private static final long serialVersionUID = 1L;
    public Long id;
    public String title;
    public String description;
    public String location;
    public LocalDateTime startTime;
    public LocalDateTime endTime;
    public Double price;
    public Integer availableSeats;
    public Integer totalSeats;
    public String imageUrl;

    public EventResponse() {
    }

    public EventResponse(Long id, String title, String description, String location,
                         LocalDateTime startTime, LocalDateTime endTime,
                         Double price, Integer availableSeats, Integer totalSeats, String imageUrl) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.location = location;
        this.startTime = startTime;
        this.endTime = endTime;
        this.price = price;
        this.availableSeats = availableSeats;
        this.totalSeats = totalSeats;
        this.imageUrl = imageUrl;
    }
}
