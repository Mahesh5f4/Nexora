package com.EventmanagementbyMahesh.event.ai.document.dto;

import java.util.List;

public class AgentAskResponse {
    private String answer;
    private List<RagSourceDto> sources;
    private String mode;

    public AgentAskResponse() {}

    public AgentAskResponse(String answer, List<RagSourceDto> sources, String mode) {
        this.answer = answer;
        this.sources = sources;
        this.mode = mode;
    }

    public String getAnswer() { return answer; }
    public void setAnswer(String answer) { this.answer = answer; }

    public List<RagSourceDto> getSources() { return sources; }
    public void setSources(List<RagSourceDto> sources) { this.sources = sources; }

    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }
}
