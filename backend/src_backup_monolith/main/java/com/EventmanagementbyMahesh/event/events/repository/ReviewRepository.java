package com.EventmanagementbyMahesh.event.events.repository;

import com.EventmanagementbyMahesh.event.events.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByEventIdOrderByCreatedAtDesc(Long eventId);
    
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.event.id = :eventId")
    Double getAverageRatingByEventId(Long eventId);
    
    @Query("SELECT COUNT(r) FROM Review r WHERE r.event.id = :eventId")
    Long getReviewCountByEventId(Long eventId);

    boolean existsByEventIdAndUserId(Long eventId, Long userId);
}
