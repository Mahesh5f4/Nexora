package com.EventmanagementbyMahesh.event.events.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewRequest {
    private Integer rating;
    private String comment;
    private String imageUrl;
}
