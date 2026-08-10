package com.EventmanagementbyMahesh.event.ai.plan.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * PlanResponse keeps a clean textual plan as the primary payload.
 *
 * The LLM is instructed to produce structured Markdown (phases, tasks,
 * milestones, risks) but we do not attempt brittle JSON parsing of the
 * LLM output in this task. The plan text is returned as-is, structured
 * enough for the frontend to render as rich Markdown.
 *
 * provider + model are included so the caller can see which backend served
 * the response — they expose no internal routing state or credentials.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PlanResponse {

    private String goal;
    private String plan;
    private String provider;
    private String model;

    public PlanResponse() {
    }

    public PlanResponse(String goal, String plan, String provider, String model) {
        this.goal = goal;
        this.plan = plan;
        this.provider = provider;
        this.model = model;
    }

    public String getGoal() {
        return goal;
    }

    public void setGoal(String goal) {
        this.goal = goal;
    }

    public String getPlan() {
        return plan;
    }

    public void setPlan(String plan) {
        this.plan = plan;
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
