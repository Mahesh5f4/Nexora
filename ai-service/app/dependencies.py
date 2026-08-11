from qdrant_client import QdrantClient
from app.core.config import settings
from app.services.chunker import CharacterChunker
from app.services.embedding import EmbeddingService, SentenceTransformerEmbeddingProvider
from app.services.vector_store import QdrantVectorStore
from app.services.rag_service import RAGService

from app.clients.spring_gateway_client import SpringAiGatewayClient

def get_rag_service() -> RAGService:
    qdrant_client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key)
    vector_store = QdrantVectorStore(client=qdrant_client)
    chunker = CharacterChunker()
    provider = SentenceTransformerEmbeddingProvider()
    embedding_service = EmbeddingService(provider=provider)
    spring_gateway_client = SpringAiGatewayClient()
    return RAGService(
        chunker=chunker, 
        embedding_service=embedding_service, 
        vector_store=vector_store,
        spring_gateway_client=spring_gateway_client
    )
