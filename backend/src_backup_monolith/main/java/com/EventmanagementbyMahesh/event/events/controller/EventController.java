package com.EventmanagementbyMahesh.event.events.controller;

import com.EventmanagementbyMahesh.event.common.ApiResponse;
import com.EventmanagementbyMahesh.event.events.dto.*;
import com.EventmanagementbyMahesh.event.events.service.EventService;
import com.EventmanagementbyMahesh.event.events.service.MLRecommendationService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/events")
public class EventController {

    private final EventService service;
    private final MLRecommendationService recommendationService;

    public EventController(EventService service, MLRecommendationService recommendationService) {
        this.service = service;
        this.recommendationService = recommendationService;
    }

    @GetMapping("/{id}/recommendations")
    public ResponseEntity<ApiResponse<List<EventResponse>>> getRecommendations(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(
                recommendationService.getRecommendations(id),
                "Recommended events fetched successfully"
        ));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<ApiResponse<EventResponse>> create(@RequestBody CreateEventRequest req) {
        EventResponse response = service.create(req);
        return ResponseEntity.ok(ApiResponse.ok(response, "Event created successfully"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<EventResponse>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.ok(service.getAll(page, size), "Events fetched successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EventResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getById(id), "Event fetched successfully"));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> update(
            @PathVariable Long id,
            @RequestBody UpdateEventRequest req) {
        Map<String, Object> result = service.update(id, req);
        return ResponseEntity.ok(ApiResponse.ok(result, "Event updated successfully"));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Event deleted successfully"));
    }
}
