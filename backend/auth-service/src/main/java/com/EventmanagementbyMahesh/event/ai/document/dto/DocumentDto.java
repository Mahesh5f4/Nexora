package com.EventmanagementbyMahesh.event.ai.document.dto;

import com.EventmanagementbyMahesh.event.ai.document.entity.Document;
import com.EventmanagementbyMahesh.event.ai.document.entity.DocumentStatus;

public class DocumentDto {
    private Long id;
    private String filename;
    private String contentType;
    private Long size;
    private DocumentStatus status;

    public DocumentDto() {}

    public DocumentDto(Long id, String filename, String contentType, Long size, DocumentStatus status) {
        this.id = id;
        this.filename = filename;
        this.contentType = contentType;
        this.size = size;
        this.status = status;
    }

    public static DocumentDto fromEntity(Document doc) {
        return new DocumentDto(
                doc.getId(),
                doc.getFilename(),
                doc.getContentType(),
                doc.getSize(),
                doc.getStatus()
        );
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public Long getSize() {
        return size;
    }

    public void setSize(Long size) {
        this.size = size;
    }

    public DocumentStatus getStatus() {
        return status;
    }

    public void setStatus(DocumentStatus status) {
        this.status = status;
    }
}
