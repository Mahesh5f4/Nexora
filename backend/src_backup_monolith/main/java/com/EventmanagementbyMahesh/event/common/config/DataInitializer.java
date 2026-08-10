package com.EventmanagementbyMahesh.event.common.config;

import com.EventmanagementbyMahesh.event.events.entity.Event;
import com.EventmanagementbyMahesh.event.events.repository.EventRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDateTime;
import java.util.List;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initDatabase(EventRepository repository) {
        return args -> {
            if (repository.count() == 0) {
                System.out.println("Empty database detected. Seeding initial events...");
                
                Event e1 = Event.builder()
                        .title("Global Tech Summit 2026")
                        .description("Experience the future of AI and Web3 with industry leaders. A 3-day deep dive into the technologies shaping our world.")
                        .location("HITEC City, Hyderabad")
                        .startTime(LocalDateTime.now().plusDays(30))
                        .endTime(LocalDateTime.now().plusDays(33))
                        .price(2500.0)
                        .totalSeats(500)
                        .availableSeats(500)
                        .imageUrl("https://images.unsplash.com/photo-1540575861501-7c001173a270?auto=format&fit=crop&q=80&w=1200")
                        .averageRating(4.8)
                        .reviewCount(120)
                        .build();

                Event e2 = Event.builder()
                        .title("Neon Nights Music Festival")
                        .description("The ultimate electronic music experience featuring top international DJs and immersive light shows.")
                        .location("Gachibowli Stadium, Hyderabad")
                        .startTime(LocalDateTime.now().plusDays(15))
                        .endTime(LocalDateTime.now().plusDays(16))
                        .price(1500.0)
                        .totalSeats(1000)
                        .availableSeats(1000)
                        .imageUrl("https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1200")
                        .averageRating(4.9)
                        .reviewCount(85)
                        .build();

                Event e3 = Event.builder()
                        .title("International Art Expo")
                        .description("A curated collection of contemporary masterpieces from over 50 countries.")
                        .location("State Gallery of Art, Madhapur")
                        .startTime(LocalDateTime.now().plusDays(45))
                        .endTime(LocalDateTime.now().plusDays(50))
                        .price(500.0)
                        .totalSeats(300)
                        .availableSeats(300)
                        .imageUrl("https://images.unsplash.com/photo-1460666819451-7410f5ef1397?auto=format&fit=crop&q=80&w=1200")
                        .averageRating(4.7)
                        .reviewCount(45)
                        .build();

                Event e4 = Event.builder()
                        .title("Elite Business Networking")
                        .description("Connect with CEOs and founders in an exclusive high-level networking environment.")
                        .location("Park Hyatt, Banjara Hills")
                        .startTime(LocalDateTime.now().plusDays(10))
                        .endTime(LocalDateTime.now().plusDays(10).plusHours(6))
                        .price(5000.0)
                        .totalSeats(100)
                        .availableSeats(100)
                        .imageUrl("https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=1200")
                        .averageRating(4.9)
                        .reviewCount(30)
                        .build();

                repository.saveAll(List.of(e1, e2, e3, e4));
                System.out.println("Database seeded successfully!");
            }
        };
    }
}
