from pydantic import BaseModel
from typing import Optional

class EvidenceItem(BaseModel):
    source_type: str  # "document" or "web"
    title: str
    content: str
    url: Optional[str] = None
    document_id: Optional[str] = None
    chunk_id: Optional[str] = None
    source_domain: Optional[str] = None
    score: Optional[float] = None
    published_date: Optional[str] = None
