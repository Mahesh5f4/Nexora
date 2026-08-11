package com.EventmanagementbyMahesh.event.ai.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RetrievedChunkDto {
    private String documentId;
    private String chunkId;
    private String filename;
    private String content;
    private double score;
}
