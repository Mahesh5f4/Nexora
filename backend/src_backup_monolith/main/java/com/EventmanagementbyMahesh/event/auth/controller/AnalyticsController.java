package com.EventmanagementbyMahesh.event.auth.controller;

import com.EventmanagementbyMahesh.event.auth.entity.User;
import com.EventmanagementbyMahesh.event.auth.repository.UserRepository;
import com.EventmanagementbyMahesh.event.booking.entity.Booking;
import com.EventmanagementbyMahesh.event.booking.entity.BookingStatus;
import com.EventmanagementbyMahesh.event.booking.repository.BookingRepository;
import com.EventmanagementbyMahesh.event.events.entity.Event;
import com.EventmanagementbyMahesh.event.events.repository.EventRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.EventmanagementbyMahesh.event.common.filter.ConcurrentRequestTracker;

import com.EventmanagementbyMahesh.event.booking.dto.RevenueResponse;
import com.EventmanagementbyMahesh.event.common.ApiResponse;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/analytics")
@PreAuthorize("hasRole('ADMIN')")
public class AnalyticsController {

    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final BookingRepository bookingRepository;
    private final ConcurrentRequestTracker concurrentRequestTracker;

    public AnalyticsController(UserRepository userRepository, 
                               EventRepository eventRepository, 
                               BookingRepository bookingRepository,
                               ConcurrentRequestTracker concurrentRequestTracker) {
        this.userRepository = userRepository;
        this.eventRepository = eventRepository;
        this.bookingRepository = bookingRepository;
        this.concurrentRequestTracker = concurrentRequestTracker;
    }

    @GetMapping("/traffic")
    public ResponseEntity<Map<String, Object>> getTrafficAnalytics() {
        List<User> allUsers = userRepository.findAll();
        List<Booking> allBookings = bookingRepository.findAll();
        List<Event> allEvents = eventRepository.findAll();
        
        LocalDateTime fiveMinsAgo = LocalDateTime.now().minusMinutes(5);

        // Traffic Stats
        long totalUsers = allUsers.size();
        long activeUsersCount = allUsers.stream()
                .filter(u -> u.getLastActive() != null && u.getLastActive().isAfter(fiveMinsAgo))
                .count();

        List<Map<String, Object>> activeUsersList = allUsers.stream()
                .filter(u -> u.getLastActive() != null && u.getLastActive().isAfter(fiveMinsAgo))
                .map(u -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("name", u.getName());
                    map.put("email", u.getEmail());
                    map.put("lastActive", u.getLastActive());
                    return map;
                })
                .collect(Collectors.toList());

        // Revenue Stats
        double totalRevenue = allBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.CONFIRMED)
                .mapToDouble(b -> {
                    Event event = allEvents.stream()
                            .filter(e -> e.getId().equals(b.getEventId()))
                            .findFirst()
                            .orElse(null);
                    return event != null ? (event.getPrice() * b.getTicketCount()) : 0.0;
                })
                .sum();

        // Top Events Stats (by ticket count)
        List<Map<String, Object>> topEvents = allBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.CONFIRMED)
                .collect(Collectors.groupingBy(Booking::getEventId, Collectors.summingInt(Booking::getTicketCount)))
                .entrySet().stream()
                .sorted(Map.Entry.<Long, Integer>comparingByValue().reversed())
                .limit(3)
                .map(entry -> {
                    Event event = allEvents.stream().filter(e -> e.getId().equals(entry.getKey())).findFirst().orElse(null);
                    Map<String, Object> map = new HashMap<>();
                    map.put("title", event != null ? event.getTitle() : "Unknown Event");
                    map.put("ticketsSold", entry.getValue());
                    map.put("revenue", event != null ? (event.getPrice() * entry.getValue()) : 0.0);
                    return map;
                })
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("totalUsers", totalUsers);
        response.put("activeUsersCount", activeUsersCount);
        response.put("activeUsers", activeUsersList);
        response.put("totalRevenue", totalRevenue);
        response.put("topEvents", topEvents);
        response.put("timestamp", LocalDateTime.now());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/revenue")
    public ResponseEntity<ApiResponse<List<RevenueResponse>>> getRevenueAnalytics() {
        List<RevenueResponse> data = bookingRepository.calculateRevenueByEvent();
        return ResponseEntity.ok(ApiResponse.ok(data, "Revenue analytics fetched successfully"));
    }
}
