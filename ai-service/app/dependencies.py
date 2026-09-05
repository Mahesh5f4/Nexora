import logging
import threading
from qdrant_client import QdrantClient
from fastapi import Request

from app.core.config import settings
from app.services.chunker import CharacterChunker
from app.services.embedding import EmbeddingService, SentenceTransformerEmbeddingProvider
from app.services.vector_store import QdrantVectorStore
from app.services.rag_service import RAGService
from app.services.llm_gateway import LLMGateway
from app.services.semantic_cache import SemanticCache

logger = logging.getLogger(__name__)

_lock = threading.RLock()
_embedding_provider = None
_embedding_service = None
_semantic_cache = None
_llm_gateway = None
_qdrant_client = None
_vector_store = None
_shared_rag_service = None
_compiled_graph = None


def get_embedding_service() -> EmbeddingService:
    global _embedding_provider, _embedding_service
    if _embedding_service is None:
        with _lock:
            if _embedding_service is None:
                logger.info("Initializing SentenceTransformerEmbeddingProvider singleton...")
                _embedding_provider = SentenceTransformerEmbeddingProvider()
                _embedding_service = EmbeddingService(provider=_embedding_provider)
    return _embedding_service


def get_semantic_cache() -> SemanticCache:
    global _semantic_cache
    if _semantic_cache is None:
        with _lock:
            if _semantic_cache is None:
                def _embed_single(text: str) -> list:
                    return get_embedding_service().embed_chunks([text])[0]
                _semantic_cache = SemanticCache(embedding_fn=_embed_single, max_size=200, threshold=0.93)
                logger.info("SemanticCache singleton ready.")
    return _semantic_cache


def get_llm_gateway() -> LLMGateway:
    global _llm_gateway
    if _llm_gateway is None:
        with _lock:
            if _llm_gateway is None:
                _llm_gateway = LLMGateway(semantic_cache=get_semantic_cache())
                logger.info("LLMGateway singleton ready.")
    return _llm_gateway


def get_qdrant_client() -> QdrantClient:
    global _qdrant_client
    if _qdrant_client is None:
        with _lock:
            if _qdrant_client is None:
                import os, socket
                url = os.getenv("QDRANT_URL") or settings.qdrant_url
                if "://qdrant" in url:
                    try:
                        socket.gethostbyname("qdrant")
                    except Exception:
                        url = "http://localhost:6333"
                api_key = os.getenv("QDRANT_API_KEY") or settings.qdrant_api_key or None
                _qdrant_client = QdrantClient(url=url, api_key=api_key, timeout=5.0)
                logger.info(f"QdrantClient singleton connected to {url}")
    return _qdrant_client


def get_rag_service(request: Request = None) -> RAGService:
    global _shared_rag_service, _vector_store
    if _shared_rag_service is None:
        with _lock:
            if _shared_rag_service is None:
                _vector_store = QdrantVectorStore(client=get_qdrant_client())
                _chunker = CharacterChunker()
                _shared_rag_service = RAGService(
                    chunker=_chunker,
                    embedding_service=get_embedding_service(),
                    vector_store=_vector_store,
                    llm_gateway=get_llm_gateway()
                )
                logger.info("Shared RAGService singleton ready.")
    return _shared_rag_service


def get_compiled_graph(request: Request = None):
    global _compiled_graph
    if _compiled_graph is None:
        with _lock:
            if _compiled_graph is None:
                from app.agent.graph import AgentGraph
                logger.info("Compiling LangGraph agent graph singleton...")
                agent_graph = AgentGraph(get_rag_service())
                _compiled_graph = agent_graph.build()
                logger.info("LangGraph compiled graph ready — reused for all requests.")
    return _compiled_graph
