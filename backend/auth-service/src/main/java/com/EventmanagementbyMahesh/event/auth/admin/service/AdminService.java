package com.EventmanagementbyMahesh.event.auth.admin.service;

import com.EventmanagementbyMahesh.event.auth.admin.dto.AdminStatsResponse;
import com.EventmanagementbyMahesh.event.auth.admin.dto.AdminUserDto;
import com.EventmanagementbyMahesh.event.auth.entity.User;
import com.EventmanagementbyMahesh.event.auth.repository.UserRepository;
import com.EventmanagementbyMahesh.event.ai.chat.repository.MessageRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final MessageRepository messageRepository;

    public AdminService(
            UserRepository userRepository,
            MessageRepository messageRepository
    ) {
        this.userRepository = userRepository;
        this.messageRepository = messageRepository;
    }

    public AdminStatsResponse getStats() {
        long totalUsers = userRepository.count();
        long totalMessages = messageRepository.count();
        long totalTokensUsed = 0;

        return AdminStatsResponse.builder()
                .totalUsers(totalUsers)
                .totalMessages(totalMessages)
                .totalTokensUsed(totalTokensUsed)
                .build();
    }


    public List<AdminUserDto> getUsers() {
        return userRepository.findAll().stream().map(user -> AdminUserDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .lastActive(user.getLastActive())
                .createdAt(user.getCreatedAt())
                .build()).collect(Collectors.toList());
    }
}
