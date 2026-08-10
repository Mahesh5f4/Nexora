package com.EventmanagementbyMahesh.event.events.service;

import com.EventmanagementbyMahesh.event.events.dto.*;
import com.EventmanagementbyMahesh.event.events.entity.Event;
import com.EventmanagementbyMahesh.event.events.repository.EventRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Service
public class EventService {

    private final EventRepository repo;

    public EventService(EventRepository repo) {
        this.repo = repo;
    }

    @CacheEvict(value = {"events", "event"}, allEntries = true)
    @Transactional
    public EventResponse create(CreateEventRequest req) {
        Event e = new Event();
        e.setTitle(req.title);
        e.setDescription(req.description);
        e.setLocation(req.location);
        e.setStartTime(req.startTime);
        e.setEndTime(req.endTime);
        e.setPrice(req.price);
        e.setTotalSeats(req.totalSeats);
        e.setAvailableSeats(req.totalSeats);
        e.setImageUrl(req.imageUrl);
        Event saved = repo.save(e);
        return toResponse(saved);
    }

    public Page<EventResponse> getAll(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return repo.findByEndTimeAfterOrderByStartTimeDesc(LocalDateTime.now(), pageable).map(this::toResponse);
    }

    public EventResponse getById(Long id) {
        Event event = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found"));
        
        if (event.getEndTime().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Event has expired");
        }
        
        return toResponse(event);
    }

    @CacheEvict(value = {"events", "event"}, allEntries = true)
    @Transactional
    public Map<String, Object> update(Long id, UpdateEventRequest req) {
        Event e = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found"));

        if (req.title != null) e.setTitle(req.title);
        if (req.description != null) e.setDescription(req.description);
        if (req.location != null) e.setLocation(req.location);
        if (req.price != null) e.setPrice(req.price);
        if (req.startTime != null) e.setStartTime(req.startTime);
        if (req.endTime != null) e.setEndTime(req.endTime);
        if (req.imageUrl != null) e.setImageUrl(req.imageUrl);
        if (req.totalSeats != null) {
            int difference = req.totalSeats - e.getTotalSeats();
            e.setTotalSeats(req.totalSeats);
            e.setAvailableSeats(e.getAvailableSeats() + difference);
        }

        repo.save(e);
        return Map.of("id", e.getId());
    }

    @CacheEvict(value = {"events", "event"}, allEntries = true)
    @Transactional
    public void delete(Long id) {
        repo.deleteById(id);
    }

    private EventResponse toResponse(Event e) {
        return new EventResponse(
                e.getId(), e.getTitle(), e.getDescription(), e.getLocation(),
                e.getStartTime(), e.getEndTime(), e.getPrice(),
                e.getAvailableSeats(), e.getTotalSeats(), e.getImageUrl()
        );
    }
}
