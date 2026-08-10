package com.EventmanagementbyMahesh.event.booking.controller;

import com.EventmanagementbyMahesh.event.booking.service.SeatLockService;
import com.EventmanagementbyMahesh.event.common.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/seats")
public class SeatLockController {

    private final SeatLockService seatLockService;
    private final SimpMessagingTemplate messagingTemplate;

    public SeatLockController(SeatLockService seatLockService, SimpMessagingTemplate messagingTemplate) {
        this.seatLockService = seatLockService;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/register/{eventId}/{userId}")
    public void registerSession(@DestinationVariable Long eventId, 
                                @DestinationVariable String userId, 
                                SimpMessageHeaderAccessor headerAccessor) {
        headerAccessor.getSessionAttributes().put("eventId", eventId);
        headerAccessor.getSessionAttributes().put("userId", userId);
        System.out.println("Registered session for user: " + userId + " on event: " + eventId);
    }

    @PostMapping("/{eventId}/lock")
    public ResponseEntity<ApiResponse<Boolean>> lockSeat(
            Authentication auth,
            @PathVariable Long eventId,
            @RequestBody Map<String, String> body) {
        
        String seatId = body.get("seatId");
        String userId = auth.getName();
        
        boolean locked = seatLockService.lockSeat(eventId, seatId, userId);
        if (locked) {
            broadcastUpdate(eventId);
            return ResponseEntity.ok(ApiResponse.ok(true, "Seat locked for 5 minutes"));
        } else {
            return ResponseEntity.status(409).body(ApiResponse.error("Seat is already being booked by someone else"));
        }
    }

    @PostMapping("/{eventId}/unlock")
    public ResponseEntity<ApiResponse<Boolean>> unlockSeat(
            @PathVariable Long eventId,
            @RequestBody Map<String, String> body) {
        
        String seatId = body.get("seatId");
        seatLockService.unlockSeat(eventId, seatId);
        broadcastUpdate(eventId);
        return ResponseEntity.ok(ApiResponse.ok(true, "Seat unlocked"));
    }

    @PostMapping("/{eventId}/unlock-multiple")
    public ResponseEntity<ApiResponse<Boolean>> unlockMultiple(
            @PathVariable Long eventId,
            @RequestBody Map<String, List<String>> body) {
        
        List<String> seatIds = body.get("seatIds");
        if (seatIds != null && !seatIds.isEmpty()) {
            seatLockService.unlockMultipleSeats(eventId, seatIds);
            broadcastUpdate(eventId);
        }
        return ResponseEntity.ok(ApiResponse.ok(true, "Seats unlocked"));
    }

    private void broadcastUpdate(Long eventId) {
        List<String> lockedSeats = seatLockService.getLockedSeats(eventId);
        messagingTemplate.convertAndSend("/topic/event/" + eventId + "/seats", lockedSeats);
    }

    @GetMapping("/{eventId}/locked")
    public ResponseEntity<ApiResponse<List<String>>> getLockedSeats(@PathVariable Long eventId) {
        List<String> lockedSeats = seatLockService.getLockedSeats(eventId);
        return ResponseEntity.ok(ApiResponse.ok(lockedSeats, "Fetched all currently locked seats"));
    }

    @GetMapping("/{eventId}/my-locks")
    public ResponseEntity<ApiResponse<List<String>>> getMyLockedSeats(
            Authentication auth,
            @PathVariable Long eventId) {
        if (auth == null) return ResponseEntity.ok(ApiResponse.ok(List.of(), "Not authenticated"));
        String userId = auth.getName();
        List<String> myLockedSeats = seatLockService.getSeatsLockedByUser(eventId, userId);
        return ResponseEntity.ok(ApiResponse.ok(myLockedSeats, "Fetched your locked seats"));
    }
}
