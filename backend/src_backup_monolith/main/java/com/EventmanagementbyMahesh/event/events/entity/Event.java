package com.EventmanagementbyMahesh.event.events.entity;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "events", indexes = {
        @Index(name = "idx_start_time", columnList = "startTime"),
        @Index(name = "idx_end_time", columnList = "endTime")
})
@SQLDelete(sql = "UPDATE events SET deleted = true WHERE id = ?")
@Where(clause = "deleted = false")
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private boolean deleted = false;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String location;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    private String imageUrl;

    private Double price;

    @Column(name = "average_rating")
    private Double averageRating = 0.0;

    @Column(name = "review_count")
    private Integer reviewCount = 0;

    @Column(nullable = false)
    private Integer totalSeats;

    @Column(nullable = false)
    private Integer availableSeats;

    /** Optimistic locking version field */
    @Version
    private Long version;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // ── Getters & Setters ──────────────────────────────────────
    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getLocation() { return location; }
    public LocalDateTime getStartTime() { return startTime; }
    public LocalDateTime getEndTime() { return endTime; }
    public String getImageUrl() { return imageUrl; }
    public Double getPrice() { return price; }
    public Integer getTotalSeats() { return totalSeats; }
    public Integer getAvailableSeats() { return availableSeats; }
    public Long getVersion() { return version; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public Double getAverageRating() { return averageRating; }
    public Integer getReviewCount() { return reviewCount; }

    public void setId(Long id) { this.id = id; }
    public void setTitle(String title) { this.title = title; }
    public void setDescription(String description) { this.description = description; }
    public void setLocation(String location) { this.location = location; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public void setPrice(Double price) { this.price = price; }
    public void setTotalSeats(Integer totalSeats) { this.totalSeats = totalSeats; }
    public void setAvailableSeats(Integer availableSeats) { this.availableSeats = availableSeats; }
    public void setVersion(Long version) { this.version = version; }
    public void setAverageRating(Double averageRating) { this.averageRating = averageRating; }
    public void setReviewCount(Integer reviewCount) { this.reviewCount = reviewCount; }
}
