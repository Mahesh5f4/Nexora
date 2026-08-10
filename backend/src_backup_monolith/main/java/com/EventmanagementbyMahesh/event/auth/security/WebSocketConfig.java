package com.EventmanagementbyMahesh.event.auth.security;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // "/topic" is for broadcasting messages to all subscribers
        config.enableSimpleBroker("/topic");
        // "/app" is for messages sent from client to server
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // End point for WebSocket connection
        registry.addEndpoint("/ws-booking")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}
