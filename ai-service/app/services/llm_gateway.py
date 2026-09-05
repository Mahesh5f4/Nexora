import os
import re
import json
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
    """Strips out <think>...</think> and multi-paragraph 'Here\\'s a thinking process:' scratchpads."""
    if not text:
        return text

    content = text.strip()

    # 1. Strip <think>...</think> tags
    content = re.sub(r'<think>[\s\S]*?</think>', '', content, flags=re.IGNORECASE).strip()

    # 2. Handle prose thinking blocks starting with 'Here's a thinking process' or 'Analyze User Input'
    if re.match(r'^(?:Here\'?s a thinking process|Thinking Process|Analyze User Input|Draft Content \(mental\))', content, re.IGNORECASE):
        # Look for explicit Draft: or Response: transition
        draft_m = re.search(r'\n(?:Draft|Final Response|Response):\s*["\']?([\s\S]*)$', content, re.IGNORECASE)
        if draft_m:
            content = draft_m.group(1).rstrip("\"'").strip()
        else:
            paragraphs = content.split('\n\n')
            content_blocks = []
            in_thinking = True
            for p in paragraphs:
                trimmed = p.strip()
                is_think_header = bool(re.match(r'^(?:Here\'?s a thinking process|Thinking Process|Analyze|Identify|Determine|Consider|Check|Structure|Draft -|Step \d+:|Key Elements:)[^\n]*:', trimmed, re.IGNORECASE))
                if in_thinking and is_think_header:
                    continue
                elif in_thinking and bool(re.match(r'^(?:User says|Context:|Need to|Should |Start:|Bridge:|Roadmap|Ask |Keep |Check constraints:)', trimmed, re.IGNORECASE)):
                    continue
                else:
                    in_thinking = False
                    content_blocks.append(p)
            if content_blocks:
                content = '\n\n'.join(content_blocks).strip()

    # 3. Strip Chinese boilerplate if any
    content = re.sub(r"我是一个有帮助的[\s\S]*?(?=\n\n|\Z)", "", content).strip()

    # 4. Filter out raw provider guardrail artifacts (e.g. Llama-Guard or moderation classification outputs)
    if re.search(r'^(?:User Safety:\s*(?:un)?safe|Safety Categories:)', content, re.IGNORECASE):
        content = "I currently don't have any saved memories or personal facts about you. Feel free to tell me about your background, preferences, or goals, and I'll remember them for our chats!"

    return content



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

    MODELS = [
        "minimax/minimax-m2.7:free",
        "openrouter/auto",
        "minimax/minimax-m3:free",
        "google/gemma-4-31b-it:free",
        "google/gemma-4-26b-a4b-it:free",
        "nvidia/nemotron-3-super-120b-a12b:free",
        "z-ai/glm-5.2:free"
    ]

    def _init_llm(self, api_key: str):
        self._api_key = api_key

    def _build_messages_payload(self, request: AiExecuteRequest):
        messages = []
        if request.systemPrompt:
            messages.append({"role": "system", "content": request.systemPrompt})
        messages.append({"role": "user", "content": request.prompt})
        return messages

    def _cache_key(self, request: AiExecuteRequest) -> str:
        prompt = request.prompt
        if "--- USER QUESTION ---\n" in prompt:
            return prompt.split("--- USER QUESTION ---\n")[-1].strip()
        if "--- ANALYSIS REQUEST ---\n" in prompt:
            return prompt.split("--- ANALYSIS REQUEST ---\n")[-1].strip()
        return prompt.strip()

    def _ensure_llm(self):
        if not getattr(self, "_api_key", None):
            api_key = os.getenv("OPENROUTER_API_KEY", "")
            if not api_key:
                raise ValueError("OPENROUTER_API_KEY is missing from environment variables!")
            self._init_llm(api_key)

    def execute_prompt(self, request: AiExecuteRequest):
        self._ensure_llm()
        cache_key = self._cache_key(request)

        # 1. Semantic cache lookup
        if self._semantic_cache is not None:
            cached = self._semantic_cache.get(cache_key, system_prompt=request.systemPrompt)
            if cached is not None:
                class CachedResponse:
                    def __init__(self, content):
                        self.content = content
                        self.provider = "SemanticCache"
                return CachedResponse(cached)

        # 2. Call OpenRouter with fallback models
        messages = self._build_messages_payload(request)
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://thinkactionai.netlify.app",
            "X-Title": "ThinkAction AI"
        }

        import requests, json
        last_error = None
        for model in self.MODELS:
            try:
                logger.info(f"Executing prompt via OpenRouter model: {model}")
                payload = {
                    "model": model,
                    "messages": messages,
                    "temperature": request.temperature or 0.2,
                    "max_tokens": request.maxTokens or 4096
                }
                r = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=10
                )
                if r.status_code == 200:
                    data = json.loads(r.content.decode("utf-8", errors="replace"))
                    msg = data.get("choices", [{}])[0].get("message", {})
                    raw_content = msg.get("content") or msg.get("reasoning") or ""
                    clean_content = clean_reasoning_output(raw_content)

                    if self._semantic_cache is not None and clean_content:
                        self._semantic_cache.store(cache_key, clean_content, system_prompt=request.systemPrompt)

                    class ModelResponse:
                        def __init__(self, text):
                            self.content = text
                            self.provider = model

                    return ModelResponse(clean_content)
                else:
                    logger.warning(f"Model {model} returned HTTP {r.status_code}: {r.text[:150]}")
            except Exception as e:
                logger.warning(f"Model {model} failed: {e}")
                last_error = e

        raise RuntimeError(f"All LLM models in fallback chain failed. Last error: {last_error}")

    def execute_prompt_stream(self, request: AiExecuteRequest) -> Generator[Tuple[str, str], None, None]:
        self._ensure_llm()
        cache_key = self._cache_key(request)

        # 1. Semantic cache lookup
        if self._semantic_cache is not None:
            cached = self._semantic_cache.get(cache_key, system_prompt=request.systemPrompt)
            if cached is not None:
                logger.info("Semantic cache HIT for stream — yielding cached response.")
                yield ("token", cached)
                return

        # 2. Call OpenRouter with fallback models
        messages = self._build_messages_payload(request)
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://thinkactionai.netlify.app",
            "X-Title": "ThinkAction AI"
        }

        import requests, json
        streamed_successfully = False
        last_error = None

        for model in self.MODELS:
            full_tokens = []
            try:
                logger.info(f"Streaming prompt via OpenRouter model: {model}")
                payload = {
                    "model": model,
                    "messages": messages,
                    "stream": True,
                    "temperature": request.temperature or 0.2,
                    "max_tokens": request.maxTokens or 4096
                }
                r = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    stream=True,
                    timeout=10
                )
                if r.status_code != 200:
                    logger.warning(f"Model {model} stream returned HTTP {r.status_code}: {r.text[:150]}")
                    continue

                in_think_tag = False
                in_prose_thinking = None
                header_buffer = ""

                for line_bytes in r.iter_lines(decode_unicode=False):
                    if not line_bytes:
                        continue
                    line = line_bytes.decode("utf-8", errors="replace")
                    if not line.startswith("data:"):
                        continue
                    data_str = line[5:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk_obj = json.loads(data_str)
                        delta = chunk_obj.get("choices", [{}])[0].get("delta", {})
                        
                        # Explicit reasoning content
                        reasoning = delta.get("reasoning")
                        if reasoning:
                            yield ("thinking", str(reasoning))

                        content = delta.get("content")
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
                                        if "\n\n" in header_buffer or len(header_buffer) > 200:
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
                    except Exception:
                        pass

                if header_buffer:
                    if is_thinking_header(header_buffer):
                        yield ("thinking", header_buffer)
                    else:
                        full_tokens.append(header_buffer)
                        yield ("token", header_buffer)

                if full_tokens:
                    streamed_successfully = True
                    if self._semantic_cache is not None:
                        self._semantic_cache.store(cache_key, "".join(full_tokens), system_prompt=request.systemPrompt)
                    break

            except Exception as e:
                logger.warning(f"Model {model} stream execution failed: {e}")
                last_error = e

        if not streamed_successfully:
            logger.error(f"All streaming models failed. Last error: {last_error}")
            yield ("token", "I'm having a brief connection issue reaching the AI model. Please try again in a moment.")

