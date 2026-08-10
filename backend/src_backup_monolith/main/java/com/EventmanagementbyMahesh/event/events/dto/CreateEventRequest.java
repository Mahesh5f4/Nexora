package com.EventmanagementbyMahesh.event.events.dto;

import java.time.LocalDateTime;

public class CreateEventRequest {
    public String title;
    public String description;
    public String location;
    public LocalDateTime startTime;
    public LocalDateTime endTime;
    public Double price;
    public Integer totalSeats;
    public String imageUrl;
}
