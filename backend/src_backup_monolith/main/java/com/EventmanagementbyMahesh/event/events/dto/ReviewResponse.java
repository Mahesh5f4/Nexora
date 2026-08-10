package com.EventmanagementbyMahesh.event.events.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {
    private Long id;
    private String userName;
    private String userAvatar;
    private Integer rating;
    private String comment;
    private String imageUrl;
    private LocalDateTime createdAt;
}
