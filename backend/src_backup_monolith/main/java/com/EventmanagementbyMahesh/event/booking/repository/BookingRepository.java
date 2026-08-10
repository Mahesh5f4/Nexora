package com.EventmanagementbyMahesh.event.booking.repository;

import com.EventmanagementbyMahesh.event.booking.entity.Booking;
import com.EventmanagementbyMahesh.event.booking.entity.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    Page<Booking> findByUserEmail(String email, Pageable pageable);
    List<Booking> findByEventId(Long eventId);
    List<Booking> findByEventIdAndStatus(Long eventId, BookingStatus status);

    @org.springframework.data.jpa.repository.Query("SELECT new com.EventmanagementbyMahesh.event.booking.dto.RevenueResponse(" +
            "b.eventId, b.eventTitle, SUM(b.ticketCount), SUM(b.ticketCount * COALESCE(b.eventPrice, 0.0))) " +
            "FROM Booking b WHERE b.status = 'CONFIRMED' GROUP BY b.eventId, b.eventTitle")
    List<com.EventmanagementbyMahesh.event.booking.dto.RevenueResponse> calculateRevenueByEvent();
}
