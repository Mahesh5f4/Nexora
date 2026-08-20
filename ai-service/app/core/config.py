from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    spring_ai_gateway_url: str = "http://localhost:8081"
    ai_service_internal_token: str = "default-internal-token"
    
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: Optional[str] = None
    qdrant_collection_name: str = "nexora_documents"
    
    tavily_api_key: Optional[str] = None
    web_search_max_results: int = 5
    web_search_timeout_seconds: int = 10
    
    # Safety Limits for context and evidence processing
    safety_max_input_chars: int = 10000
    safety_max_messages: int = 50
    safety_max_chars_per_message: int = 2000
    safety_max_rag_chunks: int = 3
    safety_max_chars_per_rag_chunk: int = 1500
    safety_max_web_results: int = 3
    safety_max_chars_per_web_result: int = 1500
    safety_max_total_evidence_chars: int = 20000
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
