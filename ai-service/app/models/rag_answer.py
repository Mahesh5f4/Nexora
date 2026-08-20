from pydantic import BaseModel, Field
from typing import List

class RagAnswerRequest(BaseModel):
    query: str
    userId: str
    topK: int = Field(default=5, ge=1, le=20)
    documentId: str | None = None

class RagSourceModel(BaseModel):
    documentId: str
    filename: str
    chunkId: str
    score: float
    publishedDate: str | None = None

class RagAnswerResponse(BaseModel):
    answer: str
    sources: List[RagSourceModel]
