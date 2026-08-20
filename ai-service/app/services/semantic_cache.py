"""
Semantic Query Cache — in-memory cosine-similarity cache for LLM responses.

How it works:
  1. Embed the incoming prompt string.
  2. Compare against stored embeddings using cosine similarity.
  3. If similarity >= threshold, return the cached response (cache HIT).
  4. On a miss, the caller gets None and should invoke the LLM, then call store().

Design decisions:
  - LRU eviction: oldest entries removed when capacity is reached.
  - Thread-safe: uses a threading.Lock so the FastAPI thread-pool stays safe.
  - Similarity threshold 0.93: tight enough to avoid wrong-answer returns,
    loose enough to handle common rephrasings ("push docker image" vs "how to push image to docker").
"""

import hashlib
import logging
import threading
from collections import OrderedDict
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    norm_a = np.linalg.norm(va)
    norm_b = np.linalg.norm(vb)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(va, vb) / (norm_a * norm_b))


class SemanticCache:
    """
    In-memory semantic cache backed by embedding vectors.

    Args:
        embedding_fn:  Callable[[str], list[float]] — embed a single string.
        max_size:      Maximum number of entries before LRU eviction (default 200).
        threshold:     Cosine similarity threshold for a cache HIT (default 0.93).
    """

    def __init__(self, embedding_fn, max_size: int = 200, threshold: float = 0.93):
        self._embed = embedding_fn
        self._max_size = max_size
        self._threshold = threshold
        # OrderedDict preserves insertion order → cheap LRU: move_to_end() on access
        self._cache: OrderedDict[str, dict] = OrderedDict()
        self._lock = threading.Lock()
        logger.info(
            f"SemanticCache initialised — capacity={max_size}, threshold={threshold}"
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        """
        Look up a cached response for the given prompt.
        If system_prompt is provided, it must match exactly.
        """
        query_vec = self._embed(prompt)

        with self._lock:
            best_key = None
            best_sim = -1.0

            for key, entry in self._cache.items():
                if entry.get("system_prompt") != system_prompt:
                    continue
                
                sim = _cosine_similarity(query_vec, entry["embedding"])
                if sim > best_sim:
                    best_sim = sim
                    best_key = key

            if best_key is not None and best_sim >= self._threshold:
                # Promote to "most recently used"
                self._cache.move_to_end(best_key)
                logger.info(
                    f"SemanticCache HIT  similarity={best_sim:.4f} key={best_key[:40]}…"
                )
                return self._cache[best_key]["response"]

        logger.debug(f"SemanticCache MISS best_similarity={best_sim:.4f}")
        return None

    def store(self, prompt: str, response: str, system_prompt: Optional[str] = None) -> None:
        """
        Store a (prompt, response) pair in the cache.
        Evicts the least-recently-used entry if at capacity.
        """
        # Ensure cache keys are unique across different system prompts for exact collisions
        key_content = f"{system_prompt or ''}:{prompt}"
        key = self._make_key(key_content)
        embedding = self._embed(prompt)

        with self._lock:
            if key in self._cache:
                # Update existing entry and promote
                self._cache[key]["response"] = response
                self._cache[key]["system_prompt"] = system_prompt
                self._cache.move_to_end(key)
            else:
                if len(self._cache) >= self._max_size:
                    evicted_key, _ = self._cache.popitem(last=False)
                    logger.debug(f"SemanticCache evicted key={evicted_key[:40]}…")
                self._cache[key] = {"embedding": embedding, "response": response, "system_prompt": system_prompt}
                logger.debug(f"SemanticCache stored key={key[:40]}… size={len(self._cache)}")

    def clear(self) -> None:
        """Flush all cached entries."""
        with self._lock:
            self._cache.clear()
        logger.info("SemanticCache cleared.")

    def stats(self) -> dict:
        with self._lock:
            return {"size": len(self._cache), "capacity": self._max_size, "threshold": self._threshold}

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _make_key(prompt: str) -> str:
        """Deterministic 64-char hex key from prompt text."""
        return hashlib.sha256(prompt.encode("utf-8")).hexdigest()
