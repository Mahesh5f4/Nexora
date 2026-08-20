import pytest
from app.services.vector_store import QdrantVectorStore
from app.services.rag_service import RAGService
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
import uuid

class DummyEmbeddingProvider:
    def embed(self, texts):
        vectors = []
        for text in texts:
            if "query" in text.lower():
                vectors.append([1.0, 0.0, 0.0])
            elif "resume" in text.lower():
                vectors.append([0.95, 0.05, 0.0]) 
            elif "architecture" in text.lower():
                vectors.append([0.9, 0.1, 0.0])
            elif "memory" in text.lower():
                vectors.append([0.5, 0.5, 0.0])
            elif "django" in text.lower():
                vectors.append([0.0, 1.0, 0.0])
            else:
                vectors.append([0.1, 0.9, 0.0])
        return vectors

class DummyEmbeddingService:
    def __init__(self):
        self.provider = DummyEmbeddingProvider()
    def embed_chunks(self, chunks):
        return self.provider.embed(chunks)

@pytest.fixture
def rag_service():
    client = QdrantClient(":memory:")
    collection_name = "test_collection"
    client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=3, distance=Distance.COSINE),
    )
    
    vector_store = QdrantVectorStore(client=client, collection_name=collection_name)
    embedding_service = DummyEmbeddingService()
    
    return RAGService(chunker=None, embedding_service=embedding_service, vector_store=vector_store, spring_gateway_client=None)


def test_cross_conversation_and_negative_ranking(rag_service):
    user_id = "user_A"
    
    rag_service.vector_store.upsert(
        user_id=user_id,
        document_id="doc_resume",
        chunks=["Spring Boot backend developer resume..."],
        vectors=[[0.95, 0.05, 0.0]]
    )
    
    rag_service.vector_store.upsert(
        user_id=user_id,
        document_id="doc_arch",
        chunks=["Spring Boot microservices architecture..."],
        vectors=[[0.9, 0.1, 0.0]]
    )
    
    rag_service.add_user_memory(user_id, "My favorite framework is Spring Boot. (Memory)")
    
    chunks = rag_service.search_user_memory("query: What is my favorite framework?", user_id, top_k=3)
    
    assert len(chunks) == 1
    assert chunks[0].document_id == "user_profile_memory"
    assert "Memory" in chunks[0].content

def test_user_isolation(rag_service):
    user_a = "user_A"
    user_b = "user_B"
    
    rag_service.add_user_memory(user_a, "My favorite framework is Spring Boot. (Memory)")
    rag_service.add_user_memory(user_b, "My favorite framework is Django. (django)")
    
    chunks_b = rag_service.search_user_memory("query: framework?", user_b, top_k=3)
    
    assert len(chunks_b) == 1
    assert chunks_b[0].document_id == "user_profile_memory"
    assert "Django" in chunks_b[0].content
    
    chunks_a = rag_service.search_user_memory("query: framework?", user_a, top_k=3)
    assert len(chunks_a) == 1
    assert "Spring Boot" in chunks_a[0].content
