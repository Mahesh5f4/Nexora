package com.EventmanagementbyMahesh.event.booking.controller;

import com.EventmanagementbyMahesh.event.booking.dto.*;
import com.EventmanagementbyMahesh.event.booking.repository.BookingRepository;
import com.EventmanagementbyMahesh.event.booking.service.BookingService;
import com.EventmanagementbyMahesh.event.common.ApiResponse;
import com.EventmanagementbyMahesh.event.common.config.RabbitMQConfig;
import com.EventmanagementbyMahesh.event.common.security.RateLimiterService;
import com.EventmanagementbyMahesh.event.common.service.PdfTicketService;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/bookings")
public class BookingController {

    private final BookingService service;
    private final BookingRepository bookingRepo;
    private final RateLimiterService rateLimiter;
    private final RabbitTemplate rabbitTemplate;
    private final StringRedisTemplate redisTemplate;
    private final PdfTicketService pdfTicketService;

    public BookingController(BookingService service, 
                             BookingRepository bookingRepo,
                             RateLimiterService rateLimiter,
                             RabbitTemplate rabbitTemplate,
                             StringRedisTemplate redisTemplate,
                             PdfTicketService pdfTicketService) {
        this.service = service;
        this.bookingRepo = bookingRepo;
        this.rateLimiter = rateLimiter;
        this.rabbitTemplate = rabbitTemplate;
        this.redisTemplate = redisTemplate;
        this.pdfTicketService = pdfTicketService;
    }

    @PostMapping
    public ResponseEntity<?> book(
            Authentication auth,
            @RequestBody BookingRequest req) {
        String email = auth.getName();
        
        if (!rateLimiter.isAllowed("booking:" + email, 500, 60)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ApiResponse.error("Too many booking attempts. Please wait a minute."));
        }

        BookingMessage message = new BookingMessage(email, req);
        
        // Mark status as PENDING in Redis
        redisTemplate.opsForValue().set("booking_status:" + message.correlationId, "PENDING");
        
        // Push to RabbitMQ
        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.ROUTING_KEY, message);
        
        return ResponseEntity.accepted().body(ApiResponse.ok(
            java.util.Map.of("bookingId", message.correlationId, "status", "PENDING"), 
            "Booking request accepted and queued"
        ));
    }

    @GetMapping("/status/{correlationId}")
    public ResponseEntity<?> getStatus(@PathVariable String correlationId) {
        String status = redisTemplate.opsForValue().get("booking_status:" + correlationId);
        if (status == null) return ResponseEntity.notFound().build();
        
        String message = redisTemplate.opsForValue().get("booking_message:" + correlationId);
        String id = redisTemplate.opsForValue().get("booking_id:" + correlationId);
        
        return ResponseEntity.ok(ApiResponse.ok(
            java.util.Map.of(
                "status", status, 
                "message", message != null ? message : "",
                "id", id != null ? id : ""
            ),
            "Booking status fetched"
        ));
    }

    @GetMapping("/event/{eventId}/seats")
    public ResponseEntity<ApiResponse<List<String>>> getBookedSeats(@PathVariable Long eventId) {
        List<String> seats = service.getBookedSeatsForEvent(eventId);
        return ResponseEntity.ok(ApiResponse.ok(seats, "Booked seats fetched"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<BookingResponse>>> getMyBookings(
            Authentication auth,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        String email = auth.getName();
        System.out.println("Fetching bookings for: " + email + " | Page: " + page + " | Size: " + size);
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<BookingResponse> bookings = service.getMyBookings(email, pageable);
        return ResponseEntity.ok(ApiResponse.ok(bookings, "Bookings fetched successfully"));
    }

    @GetMapping("/{id}/ticket")
    public ResponseEntity<byte[]> downloadTicket(@PathVariable Long id) {
        return bookingRepo.findById(id)
                .map(booking -> {
                    byte[] pdf = pdfTicketService.generateTicket(booking);
                    return ResponseEntity.ok()
                            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=ticket-" + id + ".pdf")
                            .contentType(MediaType.APPLICATION_PDF)
                            .body(pdf);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
