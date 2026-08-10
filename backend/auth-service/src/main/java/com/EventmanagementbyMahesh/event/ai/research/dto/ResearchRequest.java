package com.EventmanagementbyMahesh.event.ai.research.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ResearchRequest {

    @NotBlank(message = "Query cannot be blank")
    @Size(max = 5000, message = "Query cannot exceed 5000 characters")
    private String query;

    public ResearchRequest() {
    }

    public ResearchRequest(String query) {
        this.query = query;
    }

    public String getQuery() {
        return query;
    }

    public void setQuery(String query) {
        this.query = query;
    }
}
