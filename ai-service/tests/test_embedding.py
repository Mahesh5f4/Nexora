import pytest
from app.services.embedding import BaseEmbeddingProvider, EmbeddingService

class MockEmbeddingProvider(BaseEmbeddingProvider):
    def embed(self, texts: list[str]) -> list[list[float]]:
        # Return a dummy vector of size 3 for each text
        return [[0.1, 0.2, 0.3] for _ in texts]
        
    @property
    def dimension(self) -> int:
        return 3

class FailingEmbeddingProvider(BaseEmbeddingProvider):
    def embed(self, texts: list[str]) -> list[list[float]]:
        raise ValueError("Provider failure")
        
    @property
    def dimension(self) -> int:
        return 3

def test_embedding_service_empty():
    service = EmbeddingService(provider=MockEmbeddingProvider())
    assert service.embed_chunks([]) == []
    
def test_embedding_service_batch():
    service = EmbeddingService(provider=MockEmbeddingProvider())
    texts = ["chunk 1", "chunk 2"]
    vectors = service.embed_chunks(texts)
    assert len(vectors) == 2
    assert vectors[0] == [0.1, 0.2, 0.3]
    assert vectors[1] == [0.1, 0.2, 0.3]
    assert service.dimension == 3
    
def test_embedding_service_failure():
    service = EmbeddingService(provider=FailingEmbeddingProvider())
    with pytest.raises(RuntimeError, match="Failed to embed chunks"):
        service.embed_chunks(["test"])
