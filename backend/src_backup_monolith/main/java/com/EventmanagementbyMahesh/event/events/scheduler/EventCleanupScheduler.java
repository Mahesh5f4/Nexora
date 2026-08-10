package com.EventmanagementbyMahesh.event.events.scheduler;

import com.EventmanagementbyMahesh.event.events.repository.EventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
public class EventCleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(EventCleanupScheduler.class);
    private final EventRepository eventRepository;

    public EventCleanupScheduler(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    /**
     * Automatically delete events whose end date has passed.
     * Runs every minute (60000 milliseconds).
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void deleteExpiredEvents() {
        LocalDateTime now = LocalDateTime.now();
        log.info("Starting expired events cleanup task at {}", now);
        
        java.util.List<com.EventmanagementbyMahesh.event.events.entity.Event> expiredEvents = eventRepository.findAllByEndTimeBefore(now);
        
        if (!expiredEvents.isEmpty()) {
            eventRepository.deleteAll(expiredEvents);
            log.info("Successfully soft-deleted {} expired events", expiredEvents.size());
        } else {
            log.info("No expired events found for cleanup");
        }
    }
}
