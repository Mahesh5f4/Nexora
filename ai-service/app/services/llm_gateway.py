import os
import re
import logging
from typing import Generator, Tuple

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


THINKING_PATTERNS = [
    r"^here'?s a thinking process",
    r"^thinking process",
    r"^analyze user input",
    r"^analysis of user input",
    r"^understanding the user'?s request",
    r"^identify core task",
    r"^determine knowledge source",
    r"^structure the response",
    r"^draft content",
    r"^internal thoughts",
    r"^step 1: understand the user",
    r"^我是一个有帮助的"
]

def is_thinking_header(text: str) -> bool:
    t = text.strip().lower()
    return any(re.search(p, t, re.IGNORECASE) for p in THINKING_PATTERNS)

def clean_reasoning_output(text: str) -> str:
    """Strips out <think>...</think> and 'Here\\'s a thinking process:' blocks if leaked by reasoning models."""
    if not text:
        return text
    # Strip <think>...</think> tags
    cleaned = re.sub(r'<think>[\s\S]*?</think>', '', text, flags=re.IGNORECASE)
    # Strip 'Here's a thinking process: ...' blocks
    cleaned = re.sub(r"^Here'?s a thinking process:[\s\S]*?(?=\n\n(?:[A-Z0-9#\*]|Hello|Hi|Sure|To |In |The |Based |According |\Z))", "", cleaned, flags=re.IGNORECASE)
    # Strip 'Analyze User Input: ...' blocks
    cleaned = re.sub(r"^Analyze User Input:[\s\S]*?(?=\n\n(?:[A-Z0-9#\*]|Hello|Hi|Sure|To |In |The |Based |According |\Z))", "", cleaned, flags=re.IGNORECASE)
    # Strip Chinese boilerplate
    cleaned = re.sub(r"我是一个有帮助的[\s\S]*?(?=\n\n|\Z)", "", cleaned)
    return cleaned.strip()



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
        self.llm = None
        self._semantic_cache = semantic_cache
        
        if not api_key:
            logger.warning("OPENROUTER_API_KEY is not set yet. LLM requests will fail until configured.")
        else:
            self._init_llm(api_key)

    def _init_llm(self, api_key: str):
        base_params = {
            "api_key": api_key,
            "openai_api_key": api_key,
            "base_url": "https://openrouter.ai/api/v1",
            "max_retries": 0
        }

        # Active auto-routing free model on OpenRouter — routes to lowest latency healthy provider
        primary_llm = ChatOpenAI(model="openrouter/free", **base_params)
        fallback_1 = ChatOpenAI(model="google/gemma-4-31b-it:free", **base_params)
        fallback_2 = ChatOpenAI(model="nvidia/nemotron-3.5-lightning:free", **base_params)
        fallback_3 = ChatOpenAI(model="minimax/minimax-m2.7:free", **base_params)
        fallback_4 = ChatOpenAI(model="liquid/lfm-2.5-2.6b:free", **base_params)

        self.llm = primary_llm.with_fallbacks([fallback_1, fallback_2, fallback_3, fallback_4])

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

    def _ensure_llm(self):
        if self.llm is None:
            api_key = os.getenv("OPENROUTER_API_KEY", "")
            if not api_key:
                raise ValueError("OPENROUTER_API_KEY is missing from environment variables!")
            self._init_llm(api_key)

    def execute_prompt(self, request: AiExecuteRequest):
        """
        Synchronous prompt execution with two-level caching:
          1. Semantic cache (near-duplicate match).
          2. LangChain InMemoryCache (exact match, handled transparently by LC).
        """
        self._ensure_llm()
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
            max_tokens=request.maxTokens or 4096
        )
        logger.info("Executing prompt via Python LangChain Gateway...")
        response = llm_with_args.invoke(messages)
        content = clean_reasoning_output(response.content)

        # Store in semantic cache for future near-duplicate hits
        if self._semantic_cache is not None:
            self._semantic_cache.store(cache_key, content, system_prompt=request.systemPrompt)

        class MockResponse:
            def __init__(self, text):
                self.content = text
                self.provider = "Gemini (Python Gateway)"

        return MockResponse(content)

    def execute_prompt_stream(self, request: AiExecuteRequest) -> Generator[Tuple[str, str], None, None]:
        """
        Streaming prompt execution with two-level caching and thinking separation.
        Yields (event_type, chunk_text) where event_type is 'thinking' or 'token'.
        """
        self._ensure_llm()
        cache_key = self._cache_key(request)

        # --- Layer 1: semantic cache lookup ---
        if self._semantic_cache is not None:
            cached = self._semantic_cache.get(cache_key, system_prompt=request.systemPrompt)
            if cached is not None:
                logger.info("Semantic cache HIT for stream — yielding cached response.")
                yield ("token", cached)
                return

        # --- Layer 2 + 3: LangChain → OpenRouter ---
        messages = self._build_messages(request)
        llm_with_args = self.llm.bind(
            temperature=request.temperature or 0.2,
            max_tokens=request.maxTokens or 4096
        )
        logger.info("Streaming prompt via Python LangChain Gateway...")
        
        full_tokens = []
        in_think_tag = False
        in_prose_thinking = None
        header_buffer = ""

        for chunk in llm_with_args.stream(messages):
            # Explicit reasoning content
            reasoning_kwarg = chunk.additional_kwargs.get("reasoning_content") or getattr(chunk, "reasoning_content", None)
            if reasoning_kwarg:
                yield ("thinking", str(reasoning_kwarg))

            content = chunk.content
            if not content or not isinstance(content, str):
                continue

            while content:
                if not in_think_tag:
                    if "<think>" in content.lower():
                        pre, post = re.split(r'<think>', content, flags=re.IGNORECASE, maxsplit=1)
                        if pre:
                            if in_prose_thinking is False:
                                full_tokens.append(pre)
                                yield ("token", pre)
                            else:
                                header_buffer += pre
                        in_think_tag = True
                        content = post
                    else:
                        if in_prose_thinking is None:
                            header_buffer += content
                            if "\n\n" in header_buffer or len(header_buffer) > 250:
                                if is_thinking_header(header_buffer):
                                    if "\n\n" in header_buffer:
                                        parts = header_buffer.split("\n\n", 1)
                                        yield ("thinking", parts[0] + "\n\n")
                                        in_prose_thinking = False
                                        if parts[1]:
                                            full_tokens.append(parts[1])
                                            yield ("token", parts[1])
                                    else:
                                        in_prose_thinking = True
                                        yield ("thinking", header_buffer)
                                else:
                                    in_prose_thinking = False
                                    full_tokens.append(header_buffer)
                                    yield ("token", header_buffer)
                                header_buffer = ""
                        elif in_prose_thinking is True:
                            if "\n\n" in content:
                                parts = content.split("\n\n", 1)
                                yield ("thinking", parts[0] + "\n\n")
                                in_prose_thinking = False
                                if parts[1]:
                                    full_tokens.append(parts[1])
                                    yield ("token", parts[1])
                            else:
                                yield ("thinking", content)
                        else:
                            full_tokens.append(content)
                            yield ("token", content)
                        content = ""
                else:
                    if "</think>" in content.lower():
                        think_text, post = re.split(r'</think>', content, flags=re.IGNORECASE, maxsplit=1)
                        if think_text:
                            yield ("thinking", think_text)
                        in_think_tag = False
                        content = post.lstrip()
                    else:
                        yield ("thinking", content)
                        content = ""

        if header_buffer:
            if is_thinking_header(header_buffer):
                yield ("thinking", header_buffer)
            else:
                full_tokens.append(header_buffer)
                yield ("token", header_buffer)

        # Store in semantic cache after streaming completes
        if self._semantic_cache is not None and full_tokens:
            self._semantic_cache.store(cache_key, "".join(full_tokens), system_prompt=request.systemPrompt)

