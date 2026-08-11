from pydantic import BaseModel, Field
from typing import List, Dict, Any

class RetrievalRequest(BaseModel):
    query: str = Field(..., description="The query string to search for")
    userId: str = Field(..., description="The ID of the authenticated user")
    topK: int = Field(5, ge=1, le=20, description="The number of top chunks to retrieve")

class RetrievedChunkModel(BaseModel):
    documentId: str
    chunkId: str
    filename: str
    content: str
    score: float

class RetrievalResponse(BaseModel):
    results: List[RetrievedChunkModel]
