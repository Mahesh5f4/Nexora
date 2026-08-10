package com.EventmanagementbyMahesh.event.ai.plan;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PlanPromptBuilderTest {

    private final PlanPromptBuilder builder = new PlanPromptBuilder();

    @Test
    void systemPrompt_containsPlanningBehavior() {
        String prompt = builder.getSystemPrompt();

        assertNotNull(prompt);
        assertFalse(prompt.isBlank());

        // Planning-specific language must be present
        assertTrue(prompt.toLowerCase().contains("phases"), "Must mention phases");
        assertTrue(prompt.toLowerCase().contains("tasks"), "Must mention tasks");
        assertTrue(prompt.toLowerCase().contains("dependencies"), "Must mention dependencies");
        assertTrue(prompt.toLowerCase().contains("priorities") || prompt.toLowerCase().contains("priority"),
                "Must mention priorities");
        assertTrue(prompt.toLowerCase().contains("milestones"), "Must mention milestones");
        assertTrue(prompt.toLowerCase().contains("risks"), "Must mention risks");
        assertTrue(prompt.toLowerCase().contains("assumptions"), "Must mention assumptions");
    }

    @Test
    void systemPrompt_containsConstraints() {
        String prompt = builder.getSystemPrompt();

        // Must NOT allow task execution claims
        assertTrue(prompt.contains("Do not claim that tasks have been completed"),
                "Must prohibit execution claims");
        assertTrue(prompt.contains("Do not execute external actions"),
                "Must prohibit external actions");
        assertTrue(prompt.contains("generic"), "Must prohibit generic motivational filler");
    }

    @Test
    void systemPrompt_containsThinkActionBranding() {
        String prompt = builder.getSystemPrompt();
        assertTrue(prompt.contains("ThinkAction Ai"), "Must reference ThinkAction Ai brand");
    }

    @Test
    void userPrompt_includesGoal() {
        String goal = "Build a Spring Boot payment service";
        String prompt = builder.buildUserPrompt(goal);

        assertNotNull(prompt);
        assertTrue(prompt.contains(goal), "User prompt must include the original goal");
    }

    @Test
    void userPrompt_isActionableInstruction() {
        String goal = "Prepare for a Java backend interview";
        String prompt = builder.buildUserPrompt(goal);

        // Should not just be the goal raw — should be an instruction
        assertFalse(prompt.trim().equals(goal), "User prompt should be an instruction, not just the goal");
        assertTrue(prompt.toLowerCase().contains("plan"), "User prompt should reference planning");
    }
}
