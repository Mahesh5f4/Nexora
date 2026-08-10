package com.EventmanagementbyMahesh.event.ai.plan.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class PlanRequest {

    @NotBlank(message = "Goal cannot be blank")
    @Size(max = 5000, message = "Goal cannot exceed 5000 characters")
    private String goal;

    public PlanRequest() {
    }

    public PlanRequest(String goal) {
        this.goal = goal;
    }

    public String getGoal() {
        return goal;
    }

    public void setGoal(String goal) {
        this.goal = goal;
    }
}
