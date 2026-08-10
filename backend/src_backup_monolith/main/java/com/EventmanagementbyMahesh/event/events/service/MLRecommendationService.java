package com.EventmanagementbyMahesh.event.events.service;

import com.EventmanagementbyMahesh.event.events.dto.EventResponse;
import com.EventmanagementbyMahesh.event.events.entity.Event;
import com.EventmanagementbyMahesh.event.events.repository.EventRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.cache.annotation.Cacheable;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class MLRecommendationService {

    private final EventRepository eventRepository;
    private final RestTemplate restTemplate;

    @Value("${ml.service.url:http://localhost:8001}")
    private String mlServiceUrl;

    public MLRecommendationService(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
        this.restTemplate = new RestTemplate();
    }

    @Cacheable(value = "recommendations", key = "#eventId")
    public List<EventResponse> getRecommendations(Long eventId) {
        try {
            // 1. Fetch all active events
            List<Event> allEvents = eventRepository.findAll();
            
            // 2. Prepare request for ML service
            Map<String, Object> request = new HashMap<>();
            request.put("target_event_id", eventId);
            
            List<Map<String, Object>> eventData = allEvents.stream().map(e -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", e.getId());
                map.put("title", e.getTitle());
                map.put("description", e.getDescription());
                map.put("location", e.getLocation());
                map.put("price", e.getPrice());
                map.put("rating", e.getAverageRating() != null ? e.getAverageRating() : 0.0);
                return map;
            }).collect(Collectors.toList());
            
            request.put("all_events", eventData);

            // 3. Call ML service
            Map<String, Object> response = restTemplate.postForObject(
                    mlServiceUrl + "/recommend",
                    request,
                    Map.class
            );

            if (response == null || !response.containsKey("recommended_event_ids")) {
                return Collections.emptyList();
            }

            List<Integer> recommendedIds = (List<Integer>) response.get("recommended_event_ids");
            
            // 4. Fetch the actual event entities and convert to response DTOs
            return recommendedIds.stream()
                    .map(id -> eventRepository.findById(id.longValue()).orElse(null))
                    .filter(Objects::nonNull)
                    .map(this::toResponse)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            System.err.println("Failed to get ML recommendations: " + e.getMessage());
            return Collections.emptyList();
        }
    }

    private EventResponse toResponse(Event e) {
        return new EventResponse(
                e.getId(), e.getTitle(), e.getDescription(), e.getLocation(),
                e.getStartTime(), e.getEndTime(), e.getPrice(),
                e.getAvailableSeats(), e.getTotalSeats(), e.getImageUrl()
        );
    }
}
