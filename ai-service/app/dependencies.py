import logging
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

# ---------------------------------------------------------------------------
# Opt 3: Single SentenceTransformer — heavy model, must not reload per request
# ---------------------------------------------------------------------------
_embedding_provider = SentenceTransformerEmbeddingProvider()
_embedding_service = EmbeddingService(provider=_embedding_provider)

# ---------------------------------------------------------------------------
# Opt 2: Semantic cache — uses the embedding provider we already have
#   embedding_fn wraps a single-text call to the shared embedding service
# ---------------------------------------------------------------------------
def _embed_single(text: str) -> list:
    return _embedding_service.embed_chunks([text])[0]

_semantic_cache = SemanticCache(embedding_fn=_embed_single, max_size=200, threshold=0.93)
logger.info("SemanticCache singleton ready.")

# ---------------------------------------------------------------------------
# Opt 2: LLMGateway with semantic cache injected
# ---------------------------------------------------------------------------
_llm_gateway = LLMGateway(semantic_cache=_semantic_cache)
logger.info("LLMGateway singleton ready.")

# ---------------------------------------------------------------------------
# Opt 4: Qdrant client singleton — one HTTP connection pool for all requests
# ---------------------------------------------------------------------------
_qdrant_client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key)
logger.info(f"QdrantClient singleton connected to {settings.qdrant_url}")

# ---------------------------------------------------------------------------
# Shared RAGService (used by the graph singleton below)
# ---------------------------------------------------------------------------
_vector_store = QdrantVectorStore(client=_qdrant_client)
_chunker = CharacterChunker()
_shared_rag_service = RAGService(
    chunker=_chunker,
    embedding_service=_embedding_service,
    vector_store=_vector_store,
    llm_gateway=_llm_gateway
)

# ---------------------------------------------------------------------------
# Opt 1: Compiled LangGraph graph singleton
#   .compile() is expensive (builds routing tables, validates state schema).
#   The compiled graph is stateless and fully safe to reuse across requests.
# ---------------------------------------------------------------------------
def _build_compiled_graph():
    from app.agent.graph import AgentGraph
    logger.info("Compiling LangGraph agent graph (one-time startup cost)…")
    agent_graph = AgentGraph(_shared_rag_service)
    compiled = agent_graph.build()
    logger.info("LangGraph compiled graph ready — will be reused for all requests.")
    return compiled

_compiled_graph = _build_compiled_graph()


# ---------------------------------------------------------------------------
# FastAPI dependency injection helpers
# ---------------------------------------------------------------------------

def get_rag_service(request: Request) -> RAGService:
    """Returns the shared RAGService (singleton Qdrant + embedding)."""
    return _shared_rag_service


def get_compiled_graph(request: Request):
    """Returns the pre-compiled LangGraph graph singleton."""
    return _compiled_graph

