from typing import TypedDict, List, Optional
from app.models.evidence import EvidenceItem

class AgentState(TypedDict):
    query: str
    user_id: str
    messages: List[dict]
    evidence: List[EvidenceItem]
    search_queries: List[str]
    iteration: int
    max_iterations: int
    evaluation_status: str
    evaluation_reason: Optional[str]
    missing_information: List[str]
    user_memories: Optional[List[str]]
    needs_llm: bool
    needs_memory: bool
    needs_rag: bool
    needs_web: bool
    needs_code_retrieval: bool
    needs_multi_source: bool
    needs_retrieval: bool  # Legacy flag, maps to needs_rag
    needs_web_search: bool # Legacy flag, maps to needs_web
    needs_analysis: bool
    needs_product_identity: bool
    answer: Optional[str]
    mode: str
    document_id: Optional[str]
    force_rag: Optional[bool]
    final_request: Optional[dict]
    memory_status: Optional[str]
    memory_retrieval_status: Optional[str]
    document_retrieval_status: Optional[str]
    web_retrieval_status: Optional[str]
    code_retrieval_status: Optional[str]
    analyze_candidate_count: Optional[int]
    analyze_selected_count: Optional[int]
    analyze_selection_reason: Optional[str]
    analyze_evidence_types: Optional[List[str]]
    execution_metrics: Optional[dict]
    activity_events: Optional[List[dict]]
    images: Optional[List[str]]
