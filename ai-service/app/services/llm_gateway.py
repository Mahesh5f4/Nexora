import os
import logging
from typing import Generator

from langchain_openai import ChatOpenAI
from langchain.globals import set_llm_cache
from langchain_core.caches import InMemoryCache
from langchain_core.messages import SystemMessage, HumanMessage

from app.models.ai_execute import AiExecuteRequest
from app.services.semantic_cache import SemanticCache

logger = logging.getLogger(__name__)

# Global exact-match cache (handles identical prompt strings instantly, zero overhead)
set_llm_cache(InMemoryCache())
logger.info("LangChain InMemoryCache initialized globally.")


class LLMGateway:
    """
    Python LLM Gateway — wraps OpenRouter via LangChain ChatOpenAI.

    Caching layers (fastest → slowest):
      1. LangChain InMemoryCache  — exact prompt match, O(1)
      2. SemanticCache            — near-duplicate match via cosine similarity, ~O(n) on cache size
      3. OpenRouter API call      — full network round-trip ~1-3 seconds
    """

    def __init__(self, semantic_cache: SemanticCache = None):
        api_key = os.getenv("OPENROUTER_API_KEY", "")
        if not api_key:
            logger.error("OPENROUTER_API_KEY is missing from environment variables!")
            raise ValueError("OPENROUTER_API_KEY is missing from environment variables!")

        self.llm = ChatOpenAI(
            model="openai/gpt-4o-mini",
            api_key=api_key,
            openai_api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
            max_retries=2
        )
        self._semantic_cache = semantic_cache

    def _build_messages(self, request: AiExecuteRequest):
        messages = []
        if request.systemPrompt:
            messages.append(SystemMessage(content=request.systemPrompt))
        messages.append(HumanMessage(content=request.prompt))
        return messages

    def _cache_key(self, request: AiExecuteRequest) -> str:
        """
        Extract the user question for semantic caching.
        If we embed the entire prompt (with RAG context and history), the context dominates 
        the embedding, causing a 0.99 similarity between completely different questions.
        """
        prompt = request.prompt
        if "--- USER QUESTION ---\n" in prompt:
            # Only embed the actual user question so similarity is based on what they asked
            return prompt.split("--- USER QUESTION ---\n")[-1].strip()
            
        if "--- ANALYSIS REQUEST ---\n" in prompt:
            return prompt.split("--- ANALYSIS REQUEST ---\n")[-1].strip()

        # Fallback for generic prompts
        return prompt.strip()

    def execute_prompt(self, request: AiExecuteRequest):
        """
        Synchronous prompt execution with two-level caching:
          1. Semantic cache (near-duplicate match).
          2. LangChain InMemoryCache (exact match, handled transparently by LC).
        """
        cache_key = self._cache_key(request)

        # --- Layer 1: semantic cache lookup ---
        if self._semantic_cache is not None:
            cached = self._semantic_cache.get(cache_key, system_prompt=request.systemPrompt)
            if cached is not None:
                class CachedResponse:
                    def __init__(self, content):
                        self.content = content
                        self.provider = "SemanticCache (Python Gateway)"
                return CachedResponse(cached)

        # --- Layer 2 + 3: LangChain (InMemoryCache exact-match → OpenRouter) ---
        messages = self._build_messages(request)
        llm_with_args = self.llm.bind(
            temperature=request.temperature or 0.2,
            max_tokens=request.maxTokens or 1000
        )
        logger.info("Executing prompt via Python LangChain Gateway...")
        response = llm_with_args.invoke(messages)
        content = response.content

        # Store in semantic cache for future near-duplicate hits
        if self._semantic_cache is not None:
            self._semantic_cache.store(cache_key, content, system_prompt=request.systemPrompt)

        class MockResponse:
            def __init__(self, text):
                self.content = text
                self.provider = "OpenRouter (Python Gateway)"

        return MockResponse(content)

    def execute_prompt_stream(self, request: AiExecuteRequest) -> Generator[str, None, None]:
        """
        Streaming prompt execution with semantic caching.
        If a cache hit occurs, the cached response is yielded as a single chunk
        (or fast chunks) to simulate streaming, skipping the LLM entirely.
        """
        cache_key = self._cache_key(request)

        # --- Layer 1: semantic cache lookup ---
        if self._semantic_cache is not None:
            cached = self._semantic_cache.get(cache_key, system_prompt=request.systemPrompt)
            if cached is not None:
                logger.info("Semantic cache HIT for stream — yielding cached response.")
                yield cached
                return

        # --- Layer 2 + 3: LangChain → OpenRouter ---
        messages = self._build_messages(request)
        llm_with_args = self.llm.bind(
            temperature=request.temperature or 0.2,
            max_tokens=request.maxTokens or 1000
        )
        logger.info("Streaming prompt via Python LangChain Gateway...")
        
        full_response = []
        for chunk in llm_with_args.stream(messages):
            if chunk.content:
                full_response.append(chunk.content)
                yield chunk.content
                
        # Store in semantic cache after streaming completes
        if self._semantic_cache is not None and full_response:
            self._semantic_cache.store(cache_key, "".join(full_response), system_prompt=request.systemPrompt)

