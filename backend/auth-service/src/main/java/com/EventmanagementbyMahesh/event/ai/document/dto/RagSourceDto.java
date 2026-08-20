package com.EventmanagementbyMahesh.event.ai.document.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RagSourceDto {
    private String documentId;
    private String filename;
    private String chunkId;
    private double score;
    private String publishedDate;

    public RagSourceDto(String documentId, String filename, String chunkId, double score) {
        this.documentId = documentId;
        this.filename = filename;
        this.chunkId = chunkId;
        this.score = score;
    }
}
