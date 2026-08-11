import pytest
from qdrant_client import QdrantClient
from app.services.vector_store import QdrantVectorStore
from app.services.qdrant_init import initialize_qdrant_collection
from app.services.embedding import SentenceTransformerEmbeddingProvider, EmbeddingService
from app.services.chunker import CharacterChunker
from app.services.rag_service import RAGService

@pytest.fixture
def qdrant_client():
    return QdrantClient(location=":memory:")

from typing import List
from app.services.embedding import BaseEmbeddingProvider, EmbeddingService

class DummyEmbeddingProvider(BaseEmbeddingProvider):
    def embed(self, texts: List[str]) -> List[List[float]]:
        # Return deterministic dummy vectors based on text length
        return [[float(len(t)), 0.0, 0.0] for t in texts]
    
    @property
    def dimension(self) -> int:
        return 3

@pytest.fixture
def rag_service(qdrant_client):
    collection_name = "test_retrieval_collection"
    embedding_service = EmbeddingService(DummyEmbeddingProvider())
    dimension = embedding_service.dimension
    
    initialize_qdrant_collection(qdrant_client, collection_name, dimension=dimension)
    
    vector_store = QdrantVectorStore(client=qdrant_client, collection_name=collection_name)
    chunker = CharacterChunker(chunk_size=100, chunk_overlap=10)
    
    return RAGService(chunker=chunker, embedding_service=embedding_service, vector_store=vector_store)

def test_full_retrieval_pipeline_and_isolation(rag_service):
    # 1. Index chunks for User A
    rag_service.index_chunks(
        document_id="doc_a",
        user_id="userA",
        text="Nexora uses Spring Boot for the backend API.",
        metadata={"filename": "user_a.txt"}
    )
    
    # 2. Index chunks for User B (similar content, different user)
    rag_service.index_chunks(
        document_id="doc_b",
        user_id="userB",
        text="Nexora uses Spring Boot and Python for its architecture.",
        metadata={"filename": "user_b.txt"}
    )
    
    # 3. Create query and retrieve relevant chunks for User A
    results_a = rag_service.search_similar(query="What is the backend of Nexora?", user_id="userA", top_k=5)
    
    # Verify User A gets User A's document
    assert len(results_a) > 0
    for chunk in results_a:
        assert chunk.document_id == "doc_a"
        assert "user_b.txt" not in chunk.metadata.get("filename", "")
        
    # 4. Create query and retrieve relevant chunks for User B
    results_b = rag_service.search_similar(query="What is the backend of Nexora?", user_id="userB", top_k=5)
    
    # Verify User B gets User B's document
    assert len(results_b) > 0
    for chunk in results_b:
        assert chunk.document_id == "doc_b"
        assert "user_a.txt" not in chunk.metadata.get("filename", "")
        
    # 5. Empty query or unrelated query
    results_empty = rag_service.search_similar(query="apples and oranges", user_id="userA", top_k=5)
    # Depending on embedding distance, they might still return chunks but with lower scores.
    # To strictly test empty, use an empty string
    results_none = rag_service.search_similar(query="", user_id="userA", top_k=5)
    assert len(results_none) == 0
