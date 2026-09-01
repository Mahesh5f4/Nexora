import pytest
import time
import asyncio
from unittest.mock import Mock, MagicMock
from qdrant_client import QdrantClient
from app.services.chunker import CharacterChunker
from app.services.embedding import EmbeddingService, SentenceTransformerEmbeddingProvider
from app.services.vector_store import QdrantVectorStore
from app.services.rag_service import RAGService
from app.models.ai_execute import AiExecuteResponse

@pytest.fixture
def rag_service():
    qdrant_client = QdrantClient(location=":memory:")
    vector_store = QdrantVectorStore(client=qdrant_client)
    chunker = CharacterChunker(chunk_size=200, chunk_overlap=20)
    provider = SentenceTransformerEmbeddingProvider()
    embedding_service = EmbeddingService(provider=provider)
    llm_gateway = Mock()
    
    service = RAGService(
        chunker=chunker,
        embedding_service=embedding_service,
        vector_store=vector_store,
        llm_gateway=llm_gateway
    )
    return service

def test_retrieval_latency(rag_service):
    user_id = "perf_user"
    for i in range(20):
        rag_service.index_chunks(f"doc{i}", user_id, f"Document content {i} for performance testing.", metadata={"filename": f"{i}.txt"})
    
    latencies = []
    
    for _ in range(10):
        start = time.perf_counter()
        rag_service.search_similar("What is document 15?", user_id, top_k=5)
        end = time.perf_counter()
        latencies.append((end - start) * 1000)
    
    avg_latency = sum(latencies) / len(latencies)
    latencies.sort()
    p50 = latencies[len(latencies)//2]
    p95 = latencies[int(len(latencies)*0.95)]
    
    print(f"\nRetrieval Average: {avg_latency:.2f} ms")
    print(f"Retrieval P50: {p50:.2f} ms")
    print(f"Retrieval P95: {p95:.2f} ms")
    
    # Very generous assertions just to ensure it runs
    assert avg_latency < 500
    assert p95 < 1000

@pytest.mark.asyncio
async def test_concurrency_isolation():
    qdrant_client = QdrantClient(location=":memory:")
    vector_store = QdrantVectorStore(client=qdrant_client)
    chunker = CharacterChunker(chunk_size=200, chunk_overlap=20)
    provider = SentenceTransformerEmbeddingProvider()
    embedding_service = EmbeddingService(provider=provider)
    llm_gateway = Mock()
    
    rag_service = RAGService(
        chunker=chunker,
        embedding_service=embedding_service,
        vector_store=vector_store,
        llm_gateway=llm_gateway
    )
    
    rag_service.index_chunks("docA", "userA", "User A content", metadata={"filename": "a.txt"})
    rag_service.index_chunks("docB", "userB", "User B content", metadata={"filename": "b.txt"})
    rag_service.index_chunks("docC", "userC", "User C content", metadata={"filename": "c.txt"})
    
    def query_user(user_id):
        return rag_service.search_similar("content", user_id, top_k=5)
        
    loop = asyncio.get_event_loop()
    # Execute concurrently
    results = await asyncio.gather(
        loop.run_in_executor(None, query_user, "userA"),
        loop.run_in_executor(None, query_user, "userB"),
        loop.run_in_executor(None, query_user, "userC")
    )
    
    # Verify strict isolation in concurrent scenario
    assert len(results[0]) == 1 and results[0][0].document_id == "docA"
    assert len(results[1]) == 1 and results[1][0].document_id == "docB"
    assert len(results[2]) == 1 and results[2][0].document_id == "docC"
