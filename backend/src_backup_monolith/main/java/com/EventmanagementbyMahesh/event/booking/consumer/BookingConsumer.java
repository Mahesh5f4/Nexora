package com.EventmanagementbyMahesh.event.booking.consumer;

import com.EventmanagementbyMahesh.event.booking.dto.BookingMessage;
import com.EventmanagementbyMahesh.event.booking.dto.BookingRequest;
import com.EventmanagementbyMahesh.event.booking.service.BookingService;
import com.EventmanagementbyMahesh.event.common.config.RabbitMQConfig;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class BookingConsumer {

    private final BookingService bookingService;
    private final StringRedisTemplate redisTemplate;

    public BookingConsumer(BookingService bookingService, StringRedisTemplate redisTemplate) {
        this.bookingService = bookingService;
        this.redisTemplate = redisTemplate;
    }

    @RabbitListener(queues = RabbitMQConfig.QUEUE)
    public void consume(BookingMessage message) {
        System.out.println("Processing booking for correlationId: " + message.correlationId);
        
        try {
            BookingRequest req = new BookingRequest();
            req.eventId = message.eventId;
            req.ticketCount = message.ticketCount;
            req.seats = message.seats;

            com.EventmanagementbyMahesh.event.booking.dto.BookingResponse res = bookingService.bookTickets(message.userEmail, req);
            
            // Update status in Redis
            redisTemplate.opsForValue().set("booking_status:" + message.correlationId, "COMPLETED");
            redisTemplate.opsForValue().set("booking_id:" + message.correlationId, res.bookingId.toString());
            redisTemplate.opsForValue().set("booking_message:" + message.correlationId, "Booking successful!");
        } catch (Exception e) {
            System.err.println("Error processing booking: " + e.getMessage());
            redisTemplate.opsForValue().set("booking_status:" + message.correlationId, "FAILED");
            redisTemplate.opsForValue().set("booking_message:" + message.correlationId, "Error: " + e.getMessage());
        }
    }
}
