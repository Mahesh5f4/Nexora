package com.EventmanagementbyMahesh.event.events.repository;

import com.EventmanagementbyMahesh.event.events.entity.Event;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;

public interface EventRepository extends JpaRepository<Event, Long> {
    Page<Event> findByEndTimeAfterOrderByStartTimeDesc(LocalDateTime time, Pageable pageable);
    java.util.List<Event> findAllByEndTimeBefore(LocalDateTime time);
}
