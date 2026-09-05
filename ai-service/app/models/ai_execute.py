from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class AiExecuteRequest(BaseModel):
    prompt: str
    systemPrompt: Optional[str] = None
    temperature: Optional[float] = None
    maxTokens: Optional[int] = None
    provider: Optional[str] = "gemini"
    images: Optional[List[str]] = None

class AiExecuteResponse(BaseModel):
    content: str
    provider: str
    model: str
