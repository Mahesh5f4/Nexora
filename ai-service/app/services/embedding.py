from abc import ABC, abstractmethod
from typing import List
from functools import lru_cache

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

    Opt 3: Per-instance LRU cache (maxsize=512) on single-text embeds.
    Repeated queries (e.g. same user asking the same question) skip the
    ~50-100ms encode() call entirely.
    """
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        from sentence_transformers import SentenceTransformer
        self._model_name = model_name
        # torch 2.13 + sentence-transformers 3.x loads weights into a meta device first
        # then calls .to('cpu'), which raises NotImplementedError on meta tensors.
        # Passing low_cpu_mem_usage=False forces direct CPU allocation, bypassing meta-device.
        self._model = SentenceTransformer(
            model_name,
            device='cpu',
            model_kwargs={"low_cpu_mem_usage": False}
        )
        # Build a bound, cached version of _encode_single after the model is ready
        self._cached_encode_single = lru_cache(maxsize=512)(self._encode_single)

    def _encode_single(self, text: str) -> tuple:
        """Encode exactly one text string and return a hashable tuple of floats."""
        result = self._model.encode([text], convert_to_numpy=True)
        return tuple(result[0].tolist())

    def embed(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        if len(texts) == 1:
            # Fast path: single text — hit the LRU cache
            return [list(self._cached_encode_single(texts[0]))]
        # Batch path: multiple texts (e.g. chunking on upload) — no cache needed
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
