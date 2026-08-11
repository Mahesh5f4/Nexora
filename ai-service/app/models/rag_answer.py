from pydantic import BaseModel, Field
from typing import List

class RagAnswerRequest(BaseModel):
    query: str
    userId: str
    topK: int = Field(default=5, ge=1, le=20)

class RagSourceModel(BaseModel):
    documentId: str
    filename: str
    chunkId: str
    score: float

class RagAnswerResponse(BaseModel):
    answer: str
    sources: List[RagSourceModel]
