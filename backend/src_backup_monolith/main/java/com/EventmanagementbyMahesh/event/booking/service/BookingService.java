package com.EventmanagementbyMahesh.event.booking.service;

import com.EventmanagementbyMahesh.event.auth.entity.User;
import com.EventmanagementbyMahesh.event.auth.repository.UserRepository;
import com.EventmanagementbyMahesh.event.booking.dto.*;
import com.EventmanagementbyMahesh.event.booking.entity.Booking;
import com.EventmanagementbyMahesh.event.booking.entity.BookingStatus;
import com.EventmanagementbyMahesh.event.booking.repository.BookingRepository;
import com.EventmanagementbyMahesh.event.events.entity.Event;
import com.EventmanagementbyMahesh.event.events.repository.EventRepository;
import jakarta.persistence.OptimisticLockException;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.EventmanagementbyMahesh.event.common.metrics.BookingMetrics;
import com.EventmanagementbyMahesh.event.auth.service.EmailService;
import org.springframework.data.redis.core.StringRedisTemplate;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
public class BookingService {

    private static final int MAX_RETRIES = 15;
    private static final String LOCK_KEY_PREFIX = "lock:event:";

    private final BookingRepository bookingRepo;
    private final EventRepository eventRepo;
    private final UserRepository userRepo;
    private final SeatLockService seatLockService;
    private final BookingMetrics bookingMetrics;
    private final StringRedisTemplate redisTemplate;
    private final EmailService emailService;

    public BookingService(BookingRepository bookingRepo,
                          EventRepository eventRepo,
                          UserRepository userRepo,
                          SeatLockService seatLockService,
                          BookingMetrics bookingMetrics,
                          StringRedisTemplate redisTemplate,
                          EmailService emailService) {
        this.bookingRepo = bookingRepo;
        this.eventRepo = eventRepo;
        this.userRepo = userRepo;
        this.seatLockService = seatLockService;
        this.bookingMetrics = bookingMetrics;
        this.redisTemplate = redisTemplate;
        this.emailService = emailService;
    }

    /**
     * Book tickets with optimistic locking + retry logic as described in README.
     * Retry flow:
     *   1. Re-fetch latest event data
     *   2. Re-check available seats
     *   3. Retry transaction with bounded retry count
     *   4. If retries exhausted → throw 409 CONFLICT
     */
    @CacheEvict(value = {"events", "event"}, allEntries = true)
    public BookingResponse bookTickets(String userEmail, BookingRequest req) {
        User user = userRepo.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String lockKey = LOCK_KEY_PREFIX + req.eventId;
        String lockValue = UUID.randomUUID().toString();

        for (int attempt = 0; attempt < MAX_RETRIES; attempt++) {
            // Attempt to acquire Redis Lock
            Boolean acquired = redisTemplate.opsForValue().setIfAbsent(lockKey, lockValue, Duration.ofSeconds(10));
            
            if (Boolean.TRUE.equals(acquired)) {
                try {
                    BookingResponse response = attemptBooking(user, req);
                    bookingMetrics.incrementSuccess();
                    
                    // Send Email Confirmation
                    emailService.sendBookingConfirmation(
                        user.getEmail(),
                        response.eventTitle,
                        String.join(", ", response.seats),
                        response.ticketCount,
                        response.eventPrice * response.ticketCount
                    );
                    
                    return response;
                } catch (OptimisticLockException | org.springframework.orm.ObjectOptimisticLockingFailureException e) {
                    // Fall through to retry logic
                } catch (Exception e) {
                    bookingMetrics.incrementFailure(e.getMessage());
                    throw e;
                } finally {
                    // Release lock only if we own it
                    String currentLockValue = redisTemplate.opsForValue().get(lockKey);
                    if (lockValue.equals(currentLockValue)) {
                        redisTemplate.delete(lockKey);
                    }
                }
            }

            // Back-off and Retry
            if (attempt == MAX_RETRIES - 1) {
                bookingMetrics.incrementFailure("concurrency_limit");
                throw new IllegalStateException("Booking failed due to high concurrency. Please try again.");
            }
            
            try { Thread.sleep(50L + (long)(Math.random() * 50)); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
        }
        bookingMetrics.incrementFailure("unknown");
        throw new IllegalStateException("Booking failed. Please try again.");
    }

    @Transactional
    protected BookingResponse attemptBooking(User user, BookingRequest req) {
        // Re-fetch fresh state on each attempt for optimistic locking
        Event event = eventRepo.findById(req.eventId)
                .orElseThrow(() -> new RuntimeException("Event not found"));

        if (event.getAvailableSeats() < req.ticketCount) {
            throw new RuntimeException("Not enough seats available. Requested: "
                    + req.ticketCount + ", Available: " + event.getAvailableSeats());
        }

        // Decrement seats — @Version triggers optimistic lock check
        event.setAvailableSeats(event.getAvailableSeats() - req.ticketCount);
        eventRepo.save(event);

        Booking booking = new Booking();
        booking.setEventId(event.getId());
        booking.setUserId(user.getId());
        booking.setUserEmail(user.getEmail());
        booking.setTicketCount(req.ticketCount);
        
        // Take snapshot of event details for historical preservation
        booking.setEventTitle(event.getTitle());
        booking.setEventLocation(event.getLocation());
        booking.setEventTime(event.getStartTime().toString());
        booking.setImageUrl(event.getImageUrl());
        booking.setEventPrice(event.getPrice());
        
        if (req.seats != null && !req.seats.isEmpty()) {
            booking.setSeats(String.join(",", req.seats));
        }
        
        Booking saved = bookingRepo.save(booking);

        if (req.seats != null && !req.seats.isEmpty()) {
            seatLockService.unlockMultipleSeats(event.getId(), req.seats);
        }

        // Evict cache to ensure fresh data on next fetch
        evictUserBookingsCache(user.getEmail());

        return toResponse(saved, event);
    }

    @CacheEvict(value = "userBookingsV2", key = "#userEmail")
    public void evictUserBookingsCache(String userEmail) {
        // Just for cache eviction
    }

    // @Cacheable(value = "userBookingsV2", key = "#userEmail + '-' + #pageable.pageNumber + '-' + #pageable.pageSize")
    public Page<BookingResponse> getMyBookings(String userEmail, Pageable pageable) {
        return bookingRepo.findByUserEmail(userEmail, pageable)
                .map(this::toResponse);
    }

    public List<String> getBookedSeatsForEvent(Long eventId) {
        return bookingRepo.findByEventIdAndStatus(eventId, BookingStatus.CONFIRMED)
                .stream()
                .filter(b -> b.getSeats() != null)
                .flatMap(b -> List.of(b.getSeats().split(",")).stream())
                .toList();
    }

    private BookingResponse toResponse(Booking b) {
        return toResponse(b, null);
    }

    private BookingResponse toResponse(Booking b, Event event) {
        List<String> seatList = b.getSeats() != null ? 
            List.of(b.getSeats().split(",")) : List.of();
            
        // Use event data if available, otherwise fallback to stored snapshot
        String title = event != null ? event.getTitle() : b.getEventTitle();
        String location = event != null ? event.getLocation() : b.getEventLocation();
        String time = event != null ? event.getStartTime().toString() : b.getEventTime();
        Double price = event != null ? event.getPrice() : b.getEventPrice();
        String img = event != null ? event.getImageUrl() : b.getImageUrl();

        return new BookingResponse(
                b.getId(), b.getEventId(), title, location, time, price, b.getUserId(),
                b.getUserEmail(), b.getTicketCount(), seatList, b.getStatus().name()
        );
    }
}
