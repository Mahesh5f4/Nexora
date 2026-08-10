package com.EventmanagementbyMahesh.event.events.dto;

import java.time.LocalDateTime;

public class UpdateEventRequest {
    public String title;
    public String description;
    public String location;
    public Double price;
    public LocalDateTime startTime;
    public LocalDateTime endTime;
    public Integer totalSeats;
    public String imageUrl;
}
