from abc import ABC, abstractmethod
from typing import List

class BaseEmbeddingProvider(ABC):
    """
    Abstract base class for embedding providers.
    """
    @abstractmethod
    def embed(self, texts: List[str]) -> List[List[float]]:
        pass
        
    @property
    @abstractmethod
    def dimension(self) -> int:
        pass


class SentenceTransformerEmbeddingProvider(BaseEmbeddingProvider):
    """
    Local embedding provider using sentence-transformers.
    Model: all-MiniLM-L6-v2 (Dimension: 384)
    """
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        from sentence_transformers import SentenceTransformer
        self._model_name = model_name
        # Lazy load to avoid huge overhead if unused, but we'll instantiate here for simplicity
        # and reuse it across calls
        self._model = SentenceTransformer(model_name)
        
    def embed(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
            
        # sentence-transformers encode method returns a numpy array or tensor, convert to list
        embeddings = self._model.encode(texts, convert_to_numpy=True)
        return embeddings.tolist()
        
    @property
    def dimension(self) -> int:
        return 384


class EmbeddingService:
    """
    Orchestrator class for handling batch embeddings.
    Allows easy swapping of underlying provider.
    """
    def __init__(self, provider: BaseEmbeddingProvider = None):
        self._provider = provider or SentenceTransformerEmbeddingProvider()
        
    @property
    def dimension(self) -> int:
        return self._provider.dimension
        
    def embed_chunks(self, chunks: List[str]) -> List[List[float]]:
        if not chunks:
            return []
            
        try:
            return self._provider.embed(chunks)
        except Exception as e:
            # Handle and wrap provider specific failures
            raise RuntimeError(f"Failed to embed chunks: {str(e)}") from e
