from fastapi.testclient import TestClient
from unittest.mock import MagicMock
import pytest
from app.main import app
from app.dependencies import get_rag_service
from app.services.rag_service import RAGService
from app.services.vector_store import RetrievedChunk

client = TestClient(app)

@pytest.fixture
def mock_rag_service():
    service = MagicMock(spec=RAGService)
    return service

@pytest.fixture
def override_rag_service(mock_rag_service):
    app.dependency_overrides[get_rag_service] = lambda: mock_rag_service
    yield mock_rag_service
    app.dependency_overrides.clear()

def test_retrieval_success(override_rag_service):
    # Setup mock
    override_rag_service.search_similar.return_value = [
        RetrievedChunk(document_id="doc1", chunk_id="chunk1", content="test content", score=0.95, metadata={"filename": "test.txt"})
    ]

    response = client.post(
        "/internal/rag/retrieve",
        json={"query": "test query", "userId": "user1", "topK": 5},
        headers={"Authorization": "Bearer default_dev_token"}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) == 1
    assert data["results"][0]["documentId"] == "doc1"
    assert data["results"][0]["content"] == "test content"
    assert data["results"][0]["score"] == 0.95

def test_retrieval_empty_results(override_rag_service):
    override_rag_service.search_similar.return_value = []

    response = client.post(
        "/internal/rag/retrieve",
        json={"query": "test query", "userId": "user1", "topK": 5},
        headers={"Authorization": "Bearer default_dev_token"}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) == 0

def test_retrieval_validation_error(override_rag_service):
    response = client.post(
        "/internal/rag/retrieve",
        json={"query": "", "userId": "user1", "topK": 0}, # Invalid topK
        headers={"Authorization": "Bearer default_dev_token"}
    )

    assert response.status_code == 422 # Validation Error

def test_retrieval_internal_error(override_rag_service):
    override_rag_service.search_similar.side_effect = Exception("DB Error")

    response = client.post(
        "/internal/rag/retrieve",
        json={"query": "test query", "userId": "user1", "topK": 5},
        headers={"Authorization": "Bearer default_dev_token"}
    )

    assert response.status_code == 500

def test_retrieval_unauthorized():
    response = client.post(
        "/internal/rag/retrieve",
        json={"query": "test query", "userId": "user1", "topK": 5},
        headers={"Authorization": "Bearer wrong-token"}
    )
    assert response.status_code == 401
