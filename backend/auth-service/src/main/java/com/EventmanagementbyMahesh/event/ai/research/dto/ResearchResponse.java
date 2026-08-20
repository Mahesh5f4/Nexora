package com.EventmanagementbyMahesh.event.ai.research.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import com.EventmanagementbyMahesh.event.ai.document.dto.RagSourceDto;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ResearchResponse {

    private String answer;
    private String provider;
    private String model;
    private List<RagSourceDto> sources;

    public ResearchResponse() {
    }

    public ResearchResponse(String answer, String provider, String model) {
        this.answer = answer;
        this.provider = provider;
        this.model = model;
    }

    public ResearchResponse(String answer, String provider, String model, List<RagSourceDto> sources) {
        this.answer = answer;
        this.provider = provider;
        this.model = model;
        this.sources = sources;
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

    public List<RagSourceDto> getSources() {
        return sources;
    }

    public void setSources(List<RagSourceDto> sources) {
        this.sources = sources;
    }
}
