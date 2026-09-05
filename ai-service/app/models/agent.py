from pydantic import BaseModel, Field
from typing import List, Optional
from app.models.rag_answer import RagSourceModel

class AgentAskRequest(BaseModel):
    query: str
    userId: str
    topK: int = Field(default=5, ge=1, le=20)
    conversationId: Optional[str] = None
    messages: Optional[List[dict]] = None
    forceWebSearch: bool = False
    forceRag: bool = False
    documentId: Optional[str] = None
    mode: Optional[str] = "CHAT"  # Agent mode: GENERAL, CODE_RESEARCHER, RESEARCH, PLAN, ANALYZE
    images: Optional[List[str]] = None

class AgentAskResponse(BaseModel):
    answer: str
    sources: List[RagSourceModel]
    mode: str
