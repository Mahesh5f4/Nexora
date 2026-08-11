import pytest
from qdrant_client import QdrantClient
from app.services.vector_store import QdrantVectorStore
from app.services.qdrant_init import initialize_qdrant_collection

@pytest.fixture
def qdrant_client():
    # Use memory for fast, isolated tests without Docker
    client = QdrantClient(location=":memory:")
    return client

@pytest.fixture
def vector_store(qdrant_client):
    collection_name = "test_collection"
    initialize_qdrant_collection(qdrant_client, collection_name, dimension=3)
    return QdrantVectorStore(client=qdrant_client, collection_name=collection_name)

def test_qdrant_vector_store_upsert_and_search(vector_store):
    user_id = "user1"
    doc_id = "doc1"
    chunks = ["test chunk 1", "test chunk 2"]
    vectors = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]]
    
    vector_store.upsert(user_id, doc_id, chunks, vectors, metadata={"source": "test"})
    
    # Search for user1
    results = vector_store.search(user_id, query_vector=[1.0, 0.0, 0.0], top_k=5)
    
    assert len(results) == 2
    # The first result should be the closer vector
    assert results[0].content == "test chunk 1"
    assert results[0].document_id == "doc1"
    assert results[0].metadata["source"] == "test"

def test_qdrant_multi_tenant_isolation(vector_store):
    # Index data for user A
    vector_store.upsert(
        user_id="userA",
        document_id="docA",
        chunks=["A's secret chunk"],
        vectors=[[0.5, 0.5, 0.5]]
    )
    
    # Index data for user B
    vector_store.upsert(
        user_id="userB",
        document_id="docB",
        chunks=["B's public chunk"],
        vectors=[[0.5, 0.5, 0.5]] # Exact same vector to ensure purely filter-based isolation
    )
    
    # User A searches
    results_A = vector_store.search("userA", query_vector=[0.5, 0.5, 0.5])
    assert len(results_A) == 1
    assert results_A[0].content == "A's secret chunk"
    
    # User B searches
    results_B = vector_store.search("userB", query_vector=[0.5, 0.5, 0.5])
    assert len(results_B) == 1
    assert results_B[0].content == "B's public chunk"
    
def test_qdrant_empty_search(vector_store):
    results = vector_store.search("userX", query_vector=[0.0, 0.0, 0.0])
    assert len(results) == 0
