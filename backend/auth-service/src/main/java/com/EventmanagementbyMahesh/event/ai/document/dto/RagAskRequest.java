package com.EventmanagementbyMahesh.event.ai.document.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RagAskRequest {

    @NotBlank(message = "Query cannot be empty")
    private String query;

    @Min(value = 1, message = "topK must be at least 1")
    @Max(value = 20, message = "topK cannot exceed 20")
    @Builder.Default
    private int topK = 5;

    private String documentId;
}
