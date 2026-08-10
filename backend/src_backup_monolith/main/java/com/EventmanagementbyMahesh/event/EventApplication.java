package com.EventmanagementbyMahesh.event;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableCaching
public class EventApplication {

	public static void main(String[] args) {
		io.github.cdimascio.dotenv.Dotenv dotenv = io.github.cdimascio.dotenv.Dotenv.configure()
				.ignoreIfMissing()
				.load();
		dotenv.entries().forEach(entry -> System.setProperty(entry.getKey(), entry.getValue()));
		
		SpringApplication.run(EventApplication.class, args);
	}

}
