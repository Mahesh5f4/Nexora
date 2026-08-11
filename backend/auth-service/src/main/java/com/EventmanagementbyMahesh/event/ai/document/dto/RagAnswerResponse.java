package com.EventmanagementbyMahesh.event.ai.document.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RagAnswerResponse {
    private String answer;
    private List<RagSourceDto> sources;
}
