package com.EventmanagementbyMahesh.event.ai.plan;

import com.EventmanagementbyMahesh.event.ai.plan.dto.PlanRequest;
import com.EventmanagementbyMahesh.event.ai.plan.dto.PlanResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ai")
public class PlanController {

    private final PlanService planService;

    public PlanController(PlanService planService) {
        this.planService = planService;
    }

    @PostMapping("/plan")
    public ResponseEntity<PlanResponse> plan(@Valid @RequestBody PlanRequest request) {
        PlanResponse response = planService.createPlan(request);
        return ResponseEntity.ok(response);
    }
}
