package com.EventmanagementbyMahesh.event.ai.research.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ResearchResponse {

    private String answer;
    private String provider;
    private String model;

    public ResearchResponse() {
    }

    public ResearchResponse(String answer, String provider, String model) {
        this.answer = answer;
        this.provider = provider;
        this.model = model;
    }

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }
}
