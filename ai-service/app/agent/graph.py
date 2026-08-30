"""
Research Agent Graph — Sprint 4 Task 4

Improvements over Task 3:
  1. Improved intent-pattern classification (regex, no LLM cost)
  2. Tiered semantic evidence evaluation (Tier-1 deterministic + Tier-2 LLM via Spring Gateway)
  3. Missing-information-aware query refinement
  4. Query normalization for duplicate detection
  5. Conflict detection hint in final synthesis
"""
import re
import json
import logging
import concurrent.futures
from langgraph.graph import StateGraph, END
from fastapi import HTTPException

from app.agent.state import AgentState
from app.agent.tools import DocumentRetrievalTool, WebResearchTool
from app.agent.search_provider import TavilyWebSearchProvider
from app.agent.evaluator import EvidenceEvaluator
from app.services.rag_service import RAGService
from app.models.ai_execute import AiExecuteRequest
from app.models.evidence import EvidenceItem
from app.core.config import settings
from app.services.context_manager import ContextManagerService
from app.services.context_manager import ContextManagerService
from app.services.token_counter import SimpleEstimatorTokenCounter
from app.services.code_retrieval import CodeRetrievalService, LocalRepositorySource
import os

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Intent-pattern lists for deterministic classification
# (phrase-level, not isolated keyword matching)
# ---------------------------------------------------------------------------

# Patterns that strongly suggest the user wants to query their own documents
_RAG_PATTERNS = [
    r"\bmy (document|file|upload|data|note|policy|project|architecture)\b",
    r"\baccording to my\b",
    r"\bin my (document|file|upload|notes|policy)\b",
    r"\buploaded\b",
    r"\bwhat does (my|the) (document|file|policy) say\b",
    r"\bfrom my\b",
    r"\bmy (uploaded|stored)\b",
    r"\bcompare my\b",
    r"\bsay about\b",
    r"\bin the (document|file|notes|policy)\b",
]

# Patterns that strongly suggest the user wants external / recent information
_WEB_PATTERNS = [
    r"\blatest\b",
    r"\bcurrent(ly)?\b",
    r"\brecent(ly)?\b",
    r"\btoday\b",
    r"\bthis week\b",
    r"\bthis year\b",
    r"\bnews\b",
    r"\bwhat happened\b",
    r"\bwho won\b",
    r"\bweather\b",
    r"\bsearch (the )?web\b",
    r"\bfind online\b",
    r"\bup-to-date\b",
    r"\bindustry (practice|standard|recommendation|trend)\b",
    # Sports / events / results — likely need current data
    r"\bwinner\b",
    r"\bwon\b",
    r"\bscore\b",
    r"\bresult(s)?\b",
    r"\bstanding(s)?\b",
    r"\bchampion(s)?\b",
    r"\bipl\b",
    r"\bworld cup\b",
    r"\belection\b",
    r"\bolympics\b",
    # Prices / market data
    r"\bprice of\b",
    r"\bcost of\b",
    r"\bstock\b",
    r"\bmarket\b",
    # Current leadership / positions
    r"\bpresident of\b",
    r"\bprime minister of\b",
    r"\bceo of\b",
    # Year references (2024+) imply recency need
    r"\b20(2[4-9]|[3-9]\d)\b",
]

_MEMORY_PATTERNS = [
    r"\bmy favorite\b",
    r"\bi prefer\b",
    r"\bmy (experience|background|resume|skills|name|job|hobby|city|company|goal|goals|interests)\b",
    r"\bremember (that|this)\b",
    r"\bmy name is\b",
    r"\bi work (at|as)\b",
    r"\bi live in\b",
    r"\btell me about (me|myself)\b",
    r"\bwhat do you know about me\b",
    r"\bwhat do you remember\b",
    r"\bwho am i\b",
    r"\babout me\b",
    r"\bmy profile\b",
    r"\bwhat (is|are) my\b",
    r"\bi am a\b",
    r"\bi am an\b",
    r"\bi'm a\b",
    r"\bi'm an\b",
    r"\bi love\b",
    r"\bi like\b",
    r"\bi use\b",
    r"\bknow about me\b",
]

_CODE_PATTERNS = [
    r"\bwhere is .+ implemented\b",
    r"\btrace this (api|request|endpoint|call)\b",
    r"\bfind where\b",
    r"\bin this (repository|repo|codebase)\b",
    r"\bwhich (class|method|function|file)\b",
    r"\bsource code\b",
    r"\bcode for\b",
]

_PLAN_PATTERNS = [
    r"\b(create|make|build|write|give) .{0,20}(plan|steps|roadmap|implementation)\b",
    r"\bhow (should|do|can) (i|we) (build|implement|create|design)\b",
]


# Patterns that strongly suggest deep analytical reasoning.
# These are phrase-level to avoid false positives on isolated keywords.
_ANALYZE_PATTERNS = [
    # Explicit analyze verbs
    r"\banalyze\b",
    r"\bevaluate\b",
    r"\bdiagnose\b",
    r"\binterpret\b",
    # Phrase-level analytical requests
    r"\broot cause\b",
    r"\bbreak down\b",
    r"\bdeep dive\b",
    r"\bpros and cons\b",
    r"\bstrengths and weaknesses\b",
    r"\bwhat (is|are|went) wrong\b",
    r"\bwhat are the (weaknesses|strengths|findings|issues|risks|gaps|problems)\b",
    r"\bkey (findings|takeaways|insights)\b",
    r"\bcompare (these|the|two|both|this)\b",
    r"\breview (this|my|the)\b",
    r"\bexplain (what is wrong|the root|why .+ (fail|error|break|crash))\b",
    r"\bwhy (is|are|does|did|do) .+ (fail|error|return|break|crash|slow)\w*\b",
]

# Patterns that indicate the request is NOT analysis even if an analyze keyword matches.
# These take priority over _ANALYZE_PATTERNS.
_ANTI_ANALYZE_PATTERNS = [
    # Research intent: user wants fresh external information, not reasoning over evidence
    r"\b(latest|recent|current|news|today|this week|this year)\b",
    r"\bsearch (the )?web\b",
    r"\bfind online\b",
    # Plan intent: user wants an implementation plan
    r"\b(create|make|build|write|give) .{0,20}(plan|steps|roadmap|implementation)\b",
    r"\bhow (should|do|can) (i|we) (build|implement|create|design)\b",
    # Code Researcher intent: user wants code-level tracing
    r"\b(find|trace|which) .{0,30}(class|method|function|exception|endpoint|file)\b",
    r"\bthrough the (repo|repository|codebase)\b",
]


def _matches_any(text: str, patterns: list[str]) -> bool:
    return any(re.search(p, text) for p in patterns)

_FACTUAL_INDICATORS = [
    r"\b(who|what|when|where|which)\b.*\b(is|are|was|were|will)\b",
    r"\bgive\b.*\b(me|the|ipl|world|winner|result)\b",
    r"\btell\b.*\b(me|the)\b",
    r"\blist\b.*\b(the|all|top)\b",
]

_CONCEPTUAL_INDICATORS = [
    r"\bhow (to|do|does|can|should)\b",
    r"\bexplain\b",
    r"\bwhat is the (difference|meaning|definition)\b",
    r"\btutorial\b",
    r"\bhelp me (understand|learn)\b",
    r"\bwrite (a|an|me|the)\b",
    r"\bgenerate\b",
    r"\bcreate (a|an)\b",
    r"\bwhat is\b.*\bin programming\b",
    r"^who are you\??$",
    r"^who is this\??$",
    r"^who made you\??$",
    r"^who created you\??$",
]


def _detect_analysis_intent(query_lower: str) -> bool:
    """
    Determine whether a query has analysis intent.

    Returns True only when:
      1. The query matches at least one _ANALYZE_PATTERN, AND
      2. The query does NOT match any _ANTI_ANALYZE_PATTERN.

    This prevents queries like "analyze the latest news" from being
    misrouted to the Analyze agent when they are clearly Research requests.

    This function is independently testable without instantiating AgentGraph.
    """
    if not _matches_any(query_lower, _ANALYZE_PATTERNS):
        return False
    if _matches_any(query_lower, _ANTI_ANALYZE_PATTERNS):
        return False
    return True


def _normalize_query(query: str) -> str:
    """Lowercase and collapse whitespace/punctuation for duplicate comparison."""
    q = query.lower()
    q = re.sub(r"[^\w\s]", " ", q)
    q = re.sub(r"\s+", " ", q).strip()
    return q


class AgentGraph:
    def __init__(self, rag_service: RAGService):
        self.rag_service = rag_service
        self.prompt_builder = rag_service.prompt_builder
        self.llm_gateway = rag_service.llm_gateway
        self.retrieval_tool = DocumentRetrievalTool(rag_service).get_tool()

        search_provider = TavilyWebSearchProvider(
            api_key=settings.tavily_api_key,
            timeout_seconds=settings.web_search_timeout_seconds
        )
        self.web_search_tool = WebResearchTool(
            search_provider,
            max_results=settings.safety_max_web_results
        ).get_tool()

        self.evaluator = EvidenceEvaluator(self.llm_gateway)
        self.context_manager = ContextManagerService(SimpleEstimatorTokenCounter())

        # Initialize Code Retrieval
        # The base path should be the root of the project. We are in ai-service/app/agent/graph.py
        # root is 3 levels up: ai-service -> event-management-system
        workspace_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
        local_repo = LocalRepositorySource(base_path=workspace_dir, repo_name="event-management-system")
        self.code_retrieval_service = CodeRetrievalService(local_repo)

    # -------------------------------------------------------------------------
    # Node: classify_question
    # -------------------------------------------------------------------------

    def classify_question(self, state: AgentState) -> AgentState:
        """
        Source Decision Layer: Determines exactly what information is required.
        Uses deterministic logic first (intent-pattern classification) + mode defaults.
        """
        query_lower = state["query"].lower()
        mode = state.get("mode", "CHAT").upper()

        # 1. Base intent from query patterns
        has_rag_intent = _matches_any(query_lower, _RAG_PATTERNS)
        has_web_intent = _matches_any(query_lower, _WEB_PATTERNS)
        has_mem_intent = _matches_any(query_lower, _MEMORY_PATTERNS)
        has_code_intent = _matches_any(query_lower, _CODE_PATTERNS)
        has_analysis_intent = _detect_analysis_intent(query_lower)

        # 2. Mode-specific defaults & overrides
        needs_llm = True
        needs_rag = has_rag_intent or state.get("force_rag", False)
        needs_web = has_web_intent or state.get("needs_web_search", False)
        needs_memory = bool(has_mem_intent)
        
        # Defensive override: If the user is talking about themselves/memory, IGNORE forced web search
        if needs_memory and not has_web_intent:
            needs_web = False
        needs_code = has_code_intent
        needs_analysis = has_analysis_intent

        if mode == "CHAT":
            # Chat is minimal friction. Only retrieve if explicit intent.
            pass
            
        elif mode == "ANALYZE":
            needs_analysis = True
            # Analyze requires RAG if a document is present, but we rely on has_rag_intent or if the frontend passes a doc context.
            if has_rag_intent or re.search(r'\b(this|document|pdf|architecture|design|file|uploaded|report|resume)\b', query_lower):
                needs_rag = True
                
        elif mode == "RESEARCH":
            # Research defaults to web if not a purely conceptual question
            if not has_rag_intent and not has_code_intent and not has_mem_intent:
                # E.g. "What is Redis" might be LLM only, but "Latest Redis" is Web.
                # If they explicitly ask a generic conceptual question (like "who are you"), skip web.
                if not _matches_any(query_lower, _CONCEPTUAL_INDICATORS):
                    needs_web = True
                
        elif mode == "PLAN":
            # Plan relies heavily on LLM and memory unless explicitly asked for docs/web
            pass
            
        elif mode == "CODE_RESEARCHER":
            # Code Researcher prioritizes code retrieval
            if not _matches_any(query_lower, _ANTI_ANALYZE_PATTERNS) and not has_web_intent and not has_rag_intent:
                needs_code = True

        # ── Factual-vs-Conceptual fallback ─────────────────────────────
        # If no retrieval source is flagged, check whether the query is
        # factual (likely needs current data) vs conceptual (LLM can answer).
        # This catches edge cases that slip through pattern matching.
        if not needs_rag and not needs_web and not needs_memory and not needs_code:
            is_factual = _matches_any(query_lower, _FACTUAL_INDICATORS)
            is_conceptual = _matches_any(query_lower, _CONCEPTUAL_INDICATORS)

            if is_factual and not is_conceptual:
                needs_web = True
                logger.info(
                    "Factual fallback: routing to web search for likely current-knowledge query"
                )

        # Normalize query further for product identity matching
        query_normalized = " ".join(query_lower.split())
        
        # Product Identity matching
        IDENTITY_PHRASES = [
            "who created you",
            "who createdyou",
            "who built you",
            "who developed you",
            "who designed you",
            "who made you",
            "who founded you",
            "who is your founder",
            "who is founder of you",
            "who created thinkaction",
            "who built thinkaction",
            "who developed thinkaction",
            "who designed thinkaction",
            "who is the founder of thinkaction",
            "who is founder of thinkaction",
            "who founded thinkaction"
        ]
        needs_product_identity = any(phrase in query_normalized for phrase in IDENTITY_PHRASES)

        if needs_product_identity:
            needs_rag = True
            needs_web = False
            needs_memory = False
            needs_code = False
            needs_llm = True
            needs_multi_source = False
        else:
            # Determine if multiple sources are required
            sources_count = sum([needs_rag, needs_web, needs_memory, needs_code])
            needs_multi_source = sources_count > 1

        state["needs_llm"] = needs_llm
        state["needs_memory"] = needs_memory
        state["needs_rag"] = needs_rag
        state["needs_web"] = needs_web
        state["needs_code_retrieval"] = needs_code
        state["needs_multi_source"] = needs_multi_source
        state["needs_product_identity"] = needs_product_identity
        
        # Legacy mappings for backward compatibility in evaluate/search nodes
        state["needs_retrieval"] = needs_rag
        state["needs_web_search"] = needs_web
        state["needs_analysis"] = needs_analysis
        
        logger.info(
            f"Decision Layer [{mode}]: RAG={needs_rag}, Web={needs_web}, Mem={needs_memory}, "
            f"Code={needs_code}, LLM={needs_llm}, Multi={needs_multi_source}, Identity={needs_product_identity}"
        )
        return state

    def extract_user_memory(self, state: AgentState) -> AgentState:
        """
        Extract facts about the user from the query and save to vector store with smart deduplication.
        Also populates state["user_memories"] for injection into the system prompt.
        """
        query = state["query"]
        user_id = state["user_id"]
        
        # 1. Fetch all existing memories for this user
        existing_memories = []
        try:
            existing_memories = self.rag_service.list_user_memory(user_id)
            state["user_memories"] = [m["content"] for m in existing_memories]
        except Exception as e:
            logger.error(f"Failed to list user memories: {e}")
            state["user_memories"] = []
            
        # 2. Extract facts from personal statements or explicit memory intents
        has_personal_fact_signal = bool(re.search(
            r'\b(i am|i\'m|my goal|my favorite|i prefer|i like|i love|i work|i live|my name|i use|i study|i plan|i want to|remember|my stack|my experience|my background|my job|my role|my company|my project)\b',
            query,
            re.IGNORECASE
        ))
        
        if not (state.get("needs_memory") or has_personal_fact_signal):
            state["memory_status"] = "SKIPPED"
            return state
            
        # 3. Build smart deduplication prompt
        memories_str = "None"
        if existing_memories:
            memories_str = "\n".join([f"- [ID: {m['id']}] {m['content']}" for m in existing_memories])
            
        prompt = f"""User query: '{query}'

Existing memories:
{memories_str}

Extract any new long-term facts about the user from this query (e.g., their name, profession, preferences).
If the new fact contradicts an existing memory (e.g., they changed their favorite language), you must provide the ID of the old memory to delete.

CRITICAL INSTRUCTION: Output ONLY valid JSON. Do not include any explanations, reasoning, or markdown formatting. The JSON must exactly match this structure:
{{
  "extracted_fact": "The new fact to save, or null if nothing to extract",
  "delete_ids": ["id_to_delete_1", "id_to_delete_2"]
}}
"""
        
        ai_request = AiExecuteRequest(
            prompt=prompt,
            systemPrompt="You are a smart memory manager. Output ONLY raw JSON without any markdown formatting.",
            temperature=0.1,
            maxTokens=150
        )
        
        
        try:
            response = self.llm_gateway.execute_prompt(ai_request)
            content = response.content.strip()
            
            # Clean thinking tags and markdown wrappers
            cleaned = re.sub(r'<think>[\s\S]*?</think>', '', content, flags=re.IGNORECASE).strip()
            
            result = None
            # 1. Direct JSON parse
            try:
                result = json.loads(cleaned)
            except Exception:
                pass
                
            # 2. Markdown json code block
            if result is None and "```json" in cleaned:
                try:
                    block = cleaned.split("```json")[1].split("```")[0].strip()
                    result = json.loads(block)
                except Exception:
                    pass
                    
            if result is None and "```" in cleaned:
                try:
                    block = cleaned.split("```")[1].split("```")[0].strip()
                    result = json.loads(block)
                except Exception:
                    pass
                    
            # 3. Match explicit JSON object structure
            if result is None:
                json_match = re.search(r'\{\s*"extracted_fact"[\s\S]*?\}', cleaned)
                if json_match:
                    try:
                        result = json.loads(json_match.group(0))
                    except Exception:
                        pass
                        
            # 4. Fallback regex to extract fact string directly
            if result is None:
                fact_match = re.search(r'"extracted_fact"\s*:\s*"([^"]+)"', cleaned)
                if fact_match:
                    result = {"extracted_fact": fact_match.group(1), "delete_ids": []}
                else:
                    result = {"extracted_fact": None, "delete_ids": []}
            
            fact = result.get("extracted_fact")
            delete_ids = result.get("delete_ids") or []
            
            # Delete old memories
            for d_id in delete_ids:
                if d_id:
                    self.rag_service.delete_user_memory(user_id, d_id)
                    logger.info(f"Deleted old user memory ID: {d_id}")
                    
            # Rebuild user_memories list safely by filtering out deleted ones
            state["user_memories"] = [
                m["content"] for m in existing_memories 
                if m["id"] not in delete_ids
            ]
                    
            # Add new memory
            if fact and isinstance(fact, str) and fact.lower() not in ["none", "null"]:
                logger.info(f"Extracted user memory via LLM: {fact}")
                self.rag_service.add_user_memory(user_id, fact)
                state["user_memories"].append(fact)
                state["memory_status"] = "SAVED"
            else:
                state["memory_status"] = "SKIPPED"
                
        except json.JSONDecodeError:
            logger.error("Failed to parse memory JSON from LLM")
            state["memory_status"] = "FAILED"
        except Exception as e:
            err_str = str(e).lower()
            if any(x in err_str for x in ["429", "503", "500", "502", "504", "timeout", "connection"]):
                state["memory_status"] = "LLM_UNAVAILABLE"
                logger.warning(f"LLM Unavailable during memory extraction: {e}")
            else:
                state["memory_status"] = "FAILED"
                logger.error(f"Failed to extract memory via LLM: {e}")
            
        return state

    def route_classification(self, state: AgentState) -> str:
        needs_retrieval = (
            state.get("needs_memory") or
            state.get("needs_rag") or
            state.get("needs_web") or
            state.get("needs_code_retrieval")
        )
        if needs_retrieval or state.get("needs_analysis"):
            return "collect_initial_evidence"
        return "direct_answer"

    # -------------------------------------------------------------------------
    # Evidence helpers
    # -------------------------------------------------------------------------

    def _execute_memory_retrieval(self, query: str, user_id: str) -> list[EvidenceItem]:
        try:
            memories = self.rag_service.search_user_memory(query, user_id)
            return [
                EvidenceItem(
                    source_type="user_memory",
                    title="User Profile Memory",
                    content=f"[USER FACT] {mem.content}",
                    document_id="user_profile_memory",
                    chunk_id=mem.chunk_id,
                    score=mem.score
                )
                for mem in memories
            ]
        except Exception as e:
            logger.error(f"Failed to fetch user memory: {e}")
            return []

    def _execute_retrieval(self, query: str, user_id: str, top_k: int = None, document_id: str = None) -> list[EvidenceItem]:
        """user_id comes from trusted request context — LLM cannot influence it."""
        if top_k is None:
            top_k = settings.safety_max_rag_chunks
        
        # If force_rag is true and query is generic, we still need a valid vector.
        # But `rag_service.search_similar` will return the top K chunks for the doc anyway.
        chunks = self.retrieval_tool.invoke({
            "query": query, 
            "user_id": user_id, 
            "top_k": top_k,
            "document_id": document_id
        })
        return [
            EvidenceItem(
                source_type="document",
                title=chunk.metadata.get("filename", "unknown"),
                content=chunk.content,
                document_id=chunk.document_id,
                chunk_id=chunk.chunk_id,
                score=chunk.score
            )
            for chunk in chunks
        ]

    def _execute_web_search(self, query: str) -> list[EvidenceItem]:
        try:
            results = self.web_search_tool.invoke({"query": query})
            evidence = []
            for res in results:
                # BUG 4 FIX: validate URL before injecting into context
                url = (res.url or "").strip()
                if not url:
                    logger.debug(f"Web result skipped: missing URL for '{res.title}'")
                    continue
                if "localhost" in url or "127.0.0.1" in url or "0.0.0.0" in url:
                    logger.warning(f"Web result skipped: localhost URL filtered out: {url}")
                    continue
                if not url.startswith(("http://", "https://")):
                    logger.debug(f"Web result skipped: invalid URL scheme: {url}")
                    continue
                evidence.append(
                    EvidenceItem(
                        source_type="web",
                        title=res.title,
                        url=url,
                        content=res.snippet,
                        source_domain=res.source,
                        score=res.score,
                        published_date=res.published_date
                    )
                )
            return evidence
        except Exception as e:
            logger.error(f"Web search failed: {e}")
            return []

    def _execute_code_retrieval(self, query: str) -> list[EvidenceItem]:
        """
        Executes real Code Researcher retrieval.
        """
        try:
            logger.info(f"Executing code retrieval for query: {query}")
            result = self.code_retrieval_service.retrieve_relevant_code(query)
            
            if result["status"] == "error":
                logger.error(f"Code retrieval service returned error: {result['error']}")
                return []
                
            evidence_items = []
            for item in result["evidence"]:
                # item is a CodeSearchResult model
                # Use symbols and line numbers in the title
                symbol_str = f" [{item.symbol}]" if item.symbol else ""
                title = f"{item.file_path}:{item.line_range}{symbol_str}"
                
                content = (
                    f"Repository: {item.repository}\n"
                    f"File: {item.file_path}\n"
                    f"Symbol: {item.symbol or 'unknown'}\n"
                    f"Lines: {item.line_range}\n"
                    f"<code>\n{item.content}\n</code>"
                )
                
                evidence_items.append(
                    EvidenceItem(
                        source_type="code",
                        title=title,
                        content=content,
                        document_id=item.repository,
                        chunk_id=item.file_path,
                        score=item.score
                    )
                )
                
            return evidence_items
        except Exception as e:
            logger.error(f"Code retrieval failed: {e}")
            return []

    def _deduplicate_evidence(
        self,
        existing: list[EvidenceItem],
        new: list[EvidenceItem]
    ) -> list[EvidenceItem]:
        import hashlib
        seen_docs: set[str] = set()
        seen_urls: set[str] = set()
        seen_content_hashes: set[str] = set()
        deduped = []
        for ev in existing + new:
            content_hash = hashlib.md5(_normalize_query(ev.content).encode('utf-8')).hexdigest() if ev.content else ""
            if content_hash and content_hash in seen_content_hashes:
                continue
                
            if ev.source_type in ["document", "user_memory"]:
                doc_key = f"{ev.document_id}_{ev.chunk_id}"
                if doc_key not in seen_docs:
                    seen_docs.add(doc_key)
                    if content_hash:
                        seen_content_hashes.add(content_hash)
                    deduped.append(ev)
            elif ev.source_type == "web":
                url_key = ev.url or ""
                if url_key not in seen_urls:
                    seen_urls.add(url_key)
                    if content_hash:
                        seen_content_hashes.add(content_hash)
                    deduped.append(ev)
            else:
                deduped.append(ev)
        return deduped

    # -------------------------------------------------------------------------
    # Node: collect_initial_evidence
    # -------------------------------------------------------------------------

    def collect_initial_evidence(self, state: AgentState) -> AgentState:
        query = state["query"]
        state["search_queries"] = [query]

        new_evidence: list[EvidenceItem] = []
        metrics = state.get("execution_metrics") or {}
        metrics["retrieval_calls"] = 0
        
        # Determine which retrievers to run based on the Source Decision Layer
        futures = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            if state.get("needs_memory"):
                futures["memory"] = executor.submit(self._execute_memory_retrieval, query, state["user_id"])
            
            if state.get("needs_rag"):
                # Use conservative top_k if in analyze mode, otherwise default
                if state.get("needs_product_identity"):
                    top_k = 1
                    target_user_id = "SYSTEM"
                elif state.get("needs_analysis"):
                    top_k = 3
                    target_user_id = state["user_id"]
                else:
                    top_k = None
                    target_user_id = state["user_id"]
                futures["rag"] = executor.submit(
                    self._execute_retrieval, 
                    query, 
                    target_user_id, 
                    top_k, 
                    state.get("document_id")
                )
                
            if state.get("needs_web"):
                futures["web"] = executor.submit(self._execute_web_search, query)
                
            if state.get("needs_code_retrieval"):
                futures["code"] = executor.submit(self._execute_code_retrieval, query)

            # Wait and collect results
            for source, future in futures.items():
                try:
                    result = future.result()
                    new_evidence.extend(result)
                    
                    # Record statuses and metrics
                    status_key = f"{source}_retrieval_status"
                    # Maps to memory_retrieval_status, rag_retrieval_status (we map to document_retrieval_status), etc.
                    if source == "rag":
                        state["document_retrieval_status"] = "SUCCESS" if result else "NO_RESULTS"
                    else:
                        state[f"{source}_retrieval_status"] = "SUCCESS" if result else "NO_RESULTS"
                        
                    metrics["retrieval_calls"] += 1
                except Exception as e:
                    logger.error(f"Parallel retrieval failed for {source}: {e}")
                    if source == "rag":
                        state["document_retrieval_status"] = "FAILED"
                    else:
                        state[f"{source}_retrieval_status"] = "FAILED"

        # Record skipped statuses
        if not state.get("needs_memory"):
            state["memory_retrieval_status"] = "SKIPPED"
        if not state.get("needs_rag"):
            state["document_retrieval_status"] = "SKIPPED"
        if not state.get("needs_web"):
            state["web_retrieval_status"] = "SKIPPED"
        if not state.get("needs_code_retrieval"):
            state["code_retrieval_status"] = "SKIPPED"

        state["evidence"] = self._deduplicate_evidence(state.get("evidence", []), new_evidence)
        state["execution_metrics"] = metrics
        return state

    # -------------------------------------------------------------------------
    # Node: evaluate_evidence  (tiered — Tier 1 deterministic + Tier 2 LLM)
    # -------------------------------------------------------------------------

    def evaluate_evidence(self, state: AgentState) -> AgentState:
        """
        Tiered evaluation:
          Tier 1 — deterministic: empty / too short / all low-score → INSUFFICIENT
          Tier 2 — LLM via Spring Gateway: semantic sufficiency check
        """
        evidence = state.get("evidence", [])
        
        # If user explicitly attached a document (force_rag) and we found chunks for it,
        # bypass LLM evaluation. The query (e.g. "analyze this") might fail semantic check.
        if state.get("force_rag") and evidence:
            state["evaluation_status"] = "SUFFICIENT"
            state["evaluation_reason"] = "User explicitly attached a document."
            state["missing_information"] = []
            return state
            
        result = self.evaluator.evaluate(state["query"], evidence)

        state["evaluation_status"] = result.status.value
        state["evaluation_reason"] = result.reason
        state["missing_information"] = result.missing_information
        return state

    def route_evaluation(self, state: AgentState) -> str:
        status = state.get("evaluation_status")
        if status == "SUFFICIENT":
            return "analyze_evidence" if state.get("needs_analysis") else "generate_answer"
        elif status == "INSUFFICIENT_EVIDENCE":
            if state.get("needs_analysis"):
                # BUG 3 FIX: Analyze agent must NEVER hit insufficient_context.
                # The analyze_evidence node and system prompt are designed to handle
                # vague/no-evidence queries gracefully (request clarification or reason
                # from what's available). Always route to analyze_evidence.
                return "analyze_evidence"
            if state["iteration"] >= state["max_iterations"]:
                return "generate_answer"  # Best effort instead of giving up entirely
            return "refine_query"
        else:
            # Evaluator infrastructure failure — best-effort generate with available evidence
            logger.warning(f"Unexpected evaluation_status={status}, routing to generate_answer as best effort.")
            return "generate_answer"

    # -------------------------------------------------------------------------
    # Node: refine_query  (missing-information-aware)
    # -------------------------------------------------------------------------

    def refine_query(self, state: AgentState) -> AgentState:
        """
        Generate a targeted search query using the evaluator's missing_information list.
        Falls back to generic refinement if evaluator gave no structured hints.
        Uses normalized duplicate detection.
        """
        context_str = self.prompt_builder.build_context(state.get("evidence", []))
        missing = state.get("missing_information", [])

        prompt = self.prompt_builder.build_refinement_prompt(
            state["query"],
            context_str,
            missing_information=missing
        )

        ai_request = AiExecuteRequest(
            prompt=prompt,
            systemPrompt="You are a search query refinement AI. Output ONLY the new query.",
            temperature=0.2,
            maxTokens=50
        )

        try:
            response = self.llm_gateway.execute_prompt(ai_request)
            refined = response.content.strip()

            # Normalize for duplicate check
            normalized_refined = _normalize_query(refined)
            normalized_existing = [_normalize_query(q) for q in state["search_queries"]]

            if not refined or normalized_refined in normalized_existing:
                # Fallback: append the first missing item or generic suffix
                suffix = missing[0] if missing else "more details"
                refined = f"{state['query']} {suffix}"

            state["search_queries"].append(refined)

        except Exception:
            suffix = missing[0] if missing else "extra information"
            state["search_queries"].append(f"{state['query']} {suffix}")

        return state

    # -------------------------------------------------------------------------
    # Node: search_again
    # -------------------------------------------------------------------------

    def search_again(self, state: AgentState) -> AgentState:
        """Perform follow-up search using refined query, then re-evaluate."""
        refined_query = state["search_queries"][-1]

        new_evidence: list[EvidenceItem] = []
        if state["needs_web_search"] or not state["needs_retrieval"]:
            new_evidence.extend(self._execute_web_search(refined_query))
        if state["needs_retrieval"]:
            new_evidence.extend(self._execute_retrieval(refined_query, state["user_id"]))

        state["evidence"] = self._deduplicate_evidence(state.get("evidence", []), new_evidence)
        state["iteration"] += 1
        return state

    # -------------------------------------------------------------------------
    # Node: analyze_evidence
    # -------------------------------------------------------------------------

    def _sort_evidence_by_priority(self, evidence: list[EvidenceItem]) -> list[EvidenceItem]:
        """Sort evidence: user_memory first, then documents by score, then web by score."""
        priority = {"user_memory": 0, "document": 1, "web": 2}
        return sorted(
            evidence,
            key=lambda e: (priority.get(e.source_type, 3), -(e.score or 0.0))
        )

    def _select_analyze_evidence(self, query: str, candidates: list[EvidenceItem], state: AgentState) -> list[EvidenceItem]:
        """
        Deterministic evidence selection and ranking for analysis.
        Limits to 3-5 high value items and preserves contradictions.
        """
        if not candidates:
            state["analyze_candidate_count"] = 0
            state["analyze_selected_count"] = 0
            state["analyze_selection_reason"] = "No candidates retrieved"
            state["analyze_evidence_types"] = []
            return []

        deduped = self._deduplicate_evidence([], candidates)
        state["analyze_candidate_count"] = len(deduped)

        query_lower = query.lower()
        query_terms = set(re.findall(r'\b\w+\b', query_lower))

        scored_items = []
        for ev in deduped:
            base_score = ev.score or 0.0
            content_lower = (ev.content or "").lower()
            content_terms = set(re.findall(r'\b\w+\b', content_lower))
            
            overlap = len(query_terms.intersection(content_terms))
            relevance_score = base_score + min(overlap * 0.05, 0.4)
            
            if ev.source_type == "user_memory":
                # Strict memory filtering: drop personal memory if zero lexical overlap with analysis query
                if overlap == 0:
                    relevance_score = -1.0
                else:
                    relevance_score += 0.2
            elif ev.source_type == "web":
                if not getattr(ev, 'published_date', None):
                    relevance_score -= 0.1
                    
            scored_items.append({
                "item": ev,
                "score": relevance_score,
                "content_terms": content_terms
            })
            
        # Filter negative scores
        valid_items = [x for x in scored_items if x["score"] >= 0]
        
        # Identify contradiction candidates via Jaccard similarity
        for i, a in enumerate(valid_items):
            for j, b in enumerate(valid_items):
                if i != j:
                    intersection = len(a["content_terms"].intersection(b["content_terms"]))
                    union = len(a["content_terms"].union(b["content_terms"]))
                    if union > 0 and (intersection / union) > 0.4:
                        # High lexical overlap means they likely discuss the exact same topic,
                        # preserve both in case they offer materially conflicting perspectives.
                        a["score"] += 0.15
                        if "[CONTRADICTION_CANDIDATE]" not in a["item"].content:
                            a["item"].content = f"[CONTRADICTION_CANDIDATE] {a['item'].content}"
                        break
                        
        valid_items.sort(key=lambda x: x["score"], reverse=True)
        
        # Limit to 5 high-value items
        selected = [x["item"] for x in valid_items[:5]]
        
        state["analyze_selected_count"] = len(selected)
        state["analyze_selection_reason"] = f"Deterministic filtering: {len(deduped)} -> {len(selected)}"
        state["analyze_evidence_types"] = list(set(e.source_type for e in selected))
        
        return selected

    def analyze_evidence(self, state: AgentState) -> AgentState:
        """Deep comparative or structural reasoning using retrieved evidence."""
        from app.services.context_manager import ContextTooLargeException

        evidence = state.get("evidence", [])

        logger.info(
            f"ANALYZE node entered user_id={state['user_id']} "
            f"query={state['query'][:100]} "
            f"evidence_count={len(evidence)} "
            f"has_memory={any(e.source_type == 'user_memory' for e in evidence)} "
            f"has_web={any(e.source_type == 'web' for e in evidence)} "
            f"has_document={any(e.source_type == 'document' for e in evidence)}"
        )

        # 1. Deterministic evidence selection & ranking
        selected_evidence = self._select_analyze_evidence(state["query"], evidence, state)

        # 2. Sort selected by priority (memory > document > web) for consistent ContextManager presentation
        sorted_evidence = self._sort_evidence_by_priority(selected_evidence)

        system_prompt = self.prompt_builder.get_system_prompt_for_mode(state.get("mode"))

        # Inject memory directly into system prompt
        if state.get("user_memories"):
            memories_str = "\n".join([f"- {m}" for m in state["user_memories"]])
            system_prompt += f"\n\nHere are some personal facts you know about this user. Use them to personalize your response if relevant:\n{memories_str}"

        try:
            context_result = self.context_manager.build_context(
                system_prompt=system_prompt,
                user_request=state["query"],
                messages=state.get("messages", []),
                workflow_evidence=sorted_evidence
            )
        except ContextTooLargeException as e:
            logger.warning(f"ANALYZE context budget exceeded: {e}")
            state["answer"] = (
                "The evidence is too large to analyze within the current context budget. "
                "Try a more specific question."
            )
            state["mode"] = "error"
            return state

        logger.info(
            f"ANALYZE context built total_input_tokens={context_result.total_input_token_estimate} "
            f"evidence_tokens={context_result.evidence_token_estimate} "
            f"excluded_evidence={context_result.excluded_evidence_count}"
        )

        selected_evidence = context_result.selected_evidence

        context_str = self.prompt_builder.build_context(selected_evidence)
        messages_str = self.prompt_builder.build_messages_context(context_result.selected_messages)

        prompt = self.prompt_builder.build_analysis_prompt(
            context_result.user_request,
            context_str,
            messages_context=messages_str
        )

        ai_request = AiExecuteRequest(
            prompt=prompt,
            systemPrompt=system_prompt,
            temperature=0.3
        )

        state["final_request"] = ai_request.model_dump(exclude_none=True)
        state["final_request"] = ai_request.model_dump(exclude_none=True)
        state["mode"] = "analysis"
        return state

    # -------------------------------------------------------------------------
    # Node: generate_answer
    # -------------------------------------------------------------------------

    def generate_answer(self, state: AgentState) -> AgentState:
        """Synthesize final answer from all evidence. Signals mixed sources for conflict detection."""
        # Debug logging to see exactly what evidence is passed to the LLM
        logger.debug(f"GENERATE_ANSWER EVIDENCE DUMP: {state.get('evidence', [])}")

        evidence = state.get("evidence", [])
        system_prompt = self.prompt_builder.get_system_prompt_for_mode(state.get("mode"))
        
        # Inject memory directly into system prompt
        if state.get("user_memories"):
            memories_str = "\n".join([f"- {m}" for m in state["user_memories"]])
            system_prompt += f"\n\nHere are some personal facts you know about this user. Use them to personalize your response if relevant:\n{memories_str}"
        
        context_result = self.context_manager.build_context(
            system_prompt=system_prompt,
            user_request=state["query"],
            messages=state.get("messages", []),
            workflow_evidence=evidence
        )
        
        selected_evidence = context_result.selected_evidence
        
        has_doc = any(e.source_type == "document" for e in selected_evidence)
        has_web = any(e.source_type == "web" for e in selected_evidence)

        context_str = self.prompt_builder.build_context(selected_evidence)
        messages_str = self.prompt_builder.build_messages_context(context_result.selected_messages)
        
        prompt = self.prompt_builder.build_user_prompt(
            context_result.user_request,
            context_str,
            messages_context=messages_str,
            has_mixed_sources=(has_doc and has_web),
            has_web=has_web,
            needs_product_identity=state.get("needs_product_identity", False)
        )

        ai_request = AiExecuteRequest(
            prompt=prompt,
            systemPrompt=system_prompt,
            temperature=0.2 if (has_doc and has_web) else 0.4
        )
        
        # DEBUG: log the final prompt (without writing to hardcoded path)
        logger.debug("Final Prompt generated successfully.")

        # Signal if this node should call LLM directly (we defer this to API layer for streaming)
        # For graph execution, we just store the request to be executed by caller
        state["final_request"] = ai_request.model_dump(exclude_none=True)

        if has_doc and has_web:
            state["mode"] = "rag_web"
        elif has_doc:
            state["mode"] = "rag"
        elif has_web:
            state["mode"] = "web_search"
        elif state.get("mode") in [None, "", "unknown", "CHAT"]:
            # If we went through retrieval but no evidence, and we're CHAT
            state["mode"] = "direct"

        metrics = state.get("execution_metrics") or {}
        metrics["llm_calls"] = 1
        state["execution_metrics"] = metrics
        
        return state

    # -------------------------------------------------------------------------
    # Node: direct_answer
    # -------------------------------------------------------------------------

    def direct_answer(self, state: AgentState) -> AgentState:
        """Fast path for general questions that require no retrieval (uses memory if available)."""
        system_prompt = self.prompt_builder.get_system_prompt_for_mode(state.get("mode"))
        
        # Inject memory directly into system prompt
        if state.get("user_memories"):
            memories_str = "\n".join([f"- {m}" for m in state["user_memories"]])
            system_prompt += f"\n\nHere are some personal facts you know about this user. Use them to personalize your response if relevant:\n{memories_str}"

        context_result = self.context_manager.build_context(
            system_prompt=system_prompt,
            user_request=state["query"],
            messages=state.get("messages", []),
            workflow_evidence=state.get("evidence", [])
        )
        messages_str = self.prompt_builder.build_messages_context(context_result.selected_messages)
        
        # Build context from selected evidence (which contains user memory)
        context_str = self.prompt_builder.build_context(context_result.selected_evidence)
        
        prompt = self.prompt_builder.build_user_prompt(
            context_result.user_request,
            context_str,
            messages_context=messages_str
        )
        ai_request = AiExecuteRequest(
            prompt=prompt,
            systemPrompt=context_result.system_prompt,
            temperature=0.5
        )
        state["final_request"] = ai_request.model_dump(exclude_none=True)
        state["mode"] = "direct"
        return state

    # -------------------------------------------------------------------------
    # Node: insufficient_context
    # -------------------------------------------------------------------------

    def insufficient_context(self, state: AgentState) -> AgentState:
        """Safe fallback when max iterations exhausted without sufficient evidence."""
        reason = state.get("evaluation_reason") or "No relevant evidence found."
        state["answer"] = (
            f"I couldn't find enough reliable evidence to answer this confidently. "
            f"({reason})"
        )
        state["mode"] = "unsupported"
        return state

    def evaluator_failed(self, state: AgentState) -> AgentState:
        """
        Reached when evaluator infrastructure fails.
        """
        reason = state.get("evaluation_reason", "Unknown evaluator failure")
        status = state.get("evaluation_status", "UNKNOWN")
        

        state["answer"] = f"An infrastructure error occurred during evidence evaluation: {reason}"
        state["mode"] = "error"
        return state

    # -------------------------------------------------------------------------
    # Graph construction
    # -------------------------------------------------------------------------

    def build(self):
        builder = StateGraph(AgentState)

        builder.add_node("classify_question",       self.classify_question)
        builder.add_node("extract_user_memory",     self.extract_user_memory)
        builder.add_node("collect_initial_evidence", self.collect_initial_evidence)
        builder.add_node("evaluate_evidence",       self.evaluate_evidence)
        builder.add_node("refine_query",            self.refine_query)
        builder.add_node("search_again",            self.search_again)
        builder.add_node("analyze_evidence",        self.analyze_evidence)
        builder.add_node("generate_answer",         self.generate_answer)
        builder.add_node("direct_answer",           self.direct_answer)
        builder.add_node("insufficient_context",    self.insufficient_context)
        builder.add_node("evaluator_failed",        self.evaluator_failed)

        builder.set_entry_point("classify_question")

        builder.add_edge("classify_question", "extract_user_memory")

        builder.add_conditional_edges(
            "extract_user_memory",
            self.route_classification,
            {
                "collect_initial_evidence": "collect_initial_evidence",
                "direct_answer": "direct_answer",
            }
        )

        builder.add_edge("collect_initial_evidence", "evaluate_evidence")

        builder.add_conditional_edges(
            "evaluate_evidence",
            self.route_evaluation,
            {
                "analyze_evidence":      "analyze_evidence",
                "generate_answer":       "generate_answer",
                "insufficient_context":  "insufficient_context",
                "refine_query":          "refine_query",
                "evaluator_failed":      "evaluator_failed"
            }
        )

        builder.add_edge("refine_query",  "search_again")
        builder.add_edge("search_again",  "evaluate_evidence")

        builder.add_edge("analyze_evidence",     END)
        builder.add_edge("generate_answer",      END)
        builder.add_edge("direct_answer",        END)
        builder.add_edge("insufficient_context", END)
        builder.add_edge("evaluator_failed",     END)

        return builder.compile()
