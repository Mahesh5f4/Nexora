from abc import ABC, abstractmethod
import math
from functools import lru_cache

@lru_cache(maxsize=1024)
def _count_tokens_cached(text: str, chars_per_token: int) -> int:
    if not text:
        return 0
    return math.ceil(len(text) / chars_per_token)

class TokenCounter(ABC):
    @abstractmethod
    def count(self, text: str) -> int:
        pass

    @abstractmethod
    def is_exact(self) -> bool:
        pass

class SimpleEstimatorTokenCounter(TokenCounter):
    CHARS_PER_TOKEN = 4

    def count(self, text: str) -> int:
        return _count_tokens_cached(text, self.CHARS_PER_TOKEN)

    def is_exact(self) -> bool:
        return False
