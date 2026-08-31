from typing import Optional, Literal, Dict, Any
from pydantic import BaseModel, Field
import time
import uuid

ActivityStatus = Literal["running", "completed", "failed", "cancelled"]

ActivityStage = Literal[
    "understanding",
    "planning",
    "retrieval",
    "web_search",
    "evidence_evaluation",
    "query_refinement",
    "generation",
    "completion"
]

class AgentActivityEvent(BaseModel):
    type: Literal["activity"] = "activity"
    id: str = Field(default_factory=lambda: f"act_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}")
    status: ActivityStatus = "running"
    stage: ActivityStage
    title: str
    description: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
    metadata: Dict[str, Any] = Field(default_factory=dict)

def create_activity_event(
    stage: ActivityStage,
    title: str,
    status: ActivityStatus = "running",
    description: Optional[str] = None,
    event_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    event = AgentActivityEvent(
        id=event_id or f"act_{stage}_{int(time.time() * 1000)}",
        status=status,
        stage=stage,
        title=title,
        description=description,
        metadata=metadata or {}
    )
    return event.model_dump()
