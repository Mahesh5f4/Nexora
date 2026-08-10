package com.EventmanagementbyMahesh.event.events.service;

import com.EventmanagementbyMahesh.event.auth.entity.User;
import com.EventmanagementbyMahesh.event.events.dto.ReviewRequest;
import com.EventmanagementbyMahesh.event.events.dto.ReviewResponse;
import com.EventmanagementbyMahesh.event.events.entity.Event;
import com.EventmanagementbyMahesh.event.events.entity.Review;
import com.EventmanagementbyMahesh.event.events.repository.EventRepository;
import com.EventmanagementbyMahesh.event.events.repository.ReviewRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.EventmanagementbyMahesh.event.events.exception.ReviewException;
import org.springframework.http.HttpStatus;

@Service
public class ReviewService {

    private static final Logger logger = LoggerFactory.getLogger(ReviewService.class);
    private final ReviewRepository reviewRepository;
    private final EventRepository eventRepository;

    public ReviewService(ReviewRepository reviewRepository, EventRepository eventRepository) {
        this.reviewRepository = reviewRepository;
        this.eventRepository = eventRepository;
    }

    @Transactional
    public ReviewResponse addReview(Long eventId, User user, ReviewRequest request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ReviewException("Event not found", HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND"));

        if (reviewRepository.existsByEventIdAndUserId(eventId, user.getId())) {
            throw new ReviewException("You have already reviewed this event", HttpStatus.BAD_REQUEST, "DUPLICATE_REVIEW");
        }

        Review review = Review.builder()
                .event(event)
                .user(user)
                .rating(request.getRating())
                .comment(request.getComment())
                .imageUrl(request.getImageUrl())
                .build();

        logger.info("Saving new review for event {} by user {}", eventId, user.getEmail());
        Review saved = reviewRepository.save(review);

        // Update event rating stats
        Double avgRating = reviewRepository.getAverageRatingByEventId(eventId);
        Long count = reviewRepository.getReviewCountByEventId(eventId);
        
        event.setAverageRating(avgRating != null ? avgRating : 0.0);
        event.setReviewCount(count != null ? count.intValue() : 0);
        eventRepository.save(event);

        return toResponse(saved);
    }

    public List<ReviewResponse> getEventReviews(Long eventId) {
        return reviewRepository.findByEventIdOrderByCreatedAtDesc(eventId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private ReviewResponse toResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .userName(review.getUser().getName())
                .userAvatar(review.getUser().getAvatarUrl())
                .rating(review.getRating())
                .comment(review.getComment())
                .imageUrl(review.getImageUrl())
                .createdAt(review.getCreatedAt())
                .build();
    }
}
