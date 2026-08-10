package com.EventmanagementbyMahesh.event.common.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

@Component
public class BookingMetrics {

    private final MeterRegistry meterRegistry;
    private Counter bookingSuccessCounter;
    private Counter bookingFailureCounter;

    public BookingMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @PostConstruct
    public void init() {
        this.bookingSuccessCounter = Counter.builder("booking.status")
                .tag("status", "success")
                .description("Number of successful bookings")
                .register(meterRegistry);

        this.bookingFailureCounter = Counter.builder("booking.status")
                .tag("status", "failure")
                .description("Number of failed bookings")
                .register(meterRegistry);
    }

    public void incrementSuccess() {
        bookingSuccessCounter.increment();
    }

    public void incrementFailure(String reason) {
        Counter.builder("booking.status")
                .tag("status", "failure")
                .tag("reason", reason)
                .register(meterRegistry)
                .increment();
    }
}
