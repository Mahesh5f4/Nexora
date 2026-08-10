package com.EventmanagementbyMahesh.event.events.controller;

import com.EventmanagementbyMahesh.event.auth.entity.User;
import com.EventmanagementbyMahesh.event.auth.repository.UserRepository;
import com.EventmanagementbyMahesh.event.common.ApiResponse;
import com.EventmanagementbyMahesh.event.events.dto.ReviewRequest;
import com.EventmanagementbyMahesh.event.events.dto.ReviewResponse;
import com.EventmanagementbyMahesh.event.events.service.ReviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/events/{eventId}/reviews")
public class ReviewController {

    private final ReviewService reviewService;
    private final UserRepository userRepository;

    public ReviewController(ReviewService reviewService, UserRepository userRepository) {
        this.reviewService = reviewService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ReviewResponse>> addReview(
            @PathVariable Long eventId,
            @AuthenticationPrincipal String email,
            @RequestBody ReviewRequest request) {
        
        if (email == null) {
            throw new com.EventmanagementbyMahesh.event.events.exception.ReviewException(
                "You must be logged in to post a review", 
                org.springframework.http.HttpStatus.UNAUTHORIZED, 
                "AUTH_REQUIRED"
            );
        }
        
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return ResponseEntity.ok(ApiResponse.ok(
                reviewService.addReview(eventId, user, request),
                "Review submitted successfully"
        ));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ReviewResponse>>> getReviews(@PathVariable Long eventId) {
        return ResponseEntity.ok(ApiResponse.ok(
                reviewService.getEventReviews(eventId),
                "Reviews fetched successfully"
        ));
    }
}
