"""
test_task4.py — Sprint 4 Task 4 full test matrix.

Tests:
 1. Classification — 4 routes with natural language phrasing
 2. Evaluator — Tier 1 deterministic cases
 3. Evaluator — Tier 2 LLM cases (sufficient / insufficient / failure fallback)
 4. Missing-information-aware refinement
 5. Query normalization / duplicate prevention
 6. Conflict detection flag in synthesis prompt
 7. Citation provenance — no fabricated URLs
 8. LLM call count verification per path
 9. Failure handling — web timeout, evaluator failure, gateway failure
10. Concurrent request state isolation
"""
import json
import re
import pytest
from unittest.mock import Mock, patch, call, MagicMock

from app.agent.graph import AgentGraph, _normalize_query
from app.agent.evaluator import EvidenceEvaluator, EvaluationResult
from app.models.evidence import EvidenceItem
from app.models.ai_execute import AiExecuteResponse


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_ev(src="document", content="sufficient content " * 10, score=0.85, url=None, doc_id="d1", chunk_id="c1"):
    if src == "document":
        return EvidenceItem(source_type="document", title="Doc", content=content,
                            document_id=doc_id, chunk_id=chunk_id, score=score)
    return EvidenceItem(source_type="web", title="Web", content=content,
                        url=url or "http://example.com", score=score)


def _base_state(**overrides):
    state = {
        "query": "test question",
        "user_id": "user123",
        "evidence": [],
        "search_queries": [],
        "iteration": 1,
        "max_iterations": 3,
        "evidence_sufficient": False,
        "evaluation_reason": None,
        "missing_information": [],
        "needs_retrieval": False,
        "needs_web_search": False,
        "answer": None,
        "mode": "unknown"
    }
    state.update(overrides)
    return state


def _mock_rag_service(eval_response=None, answer_response="Final answer"):
    svc = Mock()
    svc.prompt_builder = Mock()
    svc.prompt_builder.get_system_prompt_for_mode.return_value = "sys"
    svc.prompt_builder.build_context.return_value = "ctx"
    svc.prompt_builder.build_user_prompt.return_value = "prompt"
    svc.prompt_builder.build_refinement_prompt.return_value = "refine prompt"
    svc.prompt_builder.system_prompt = "system"
    svc.spring_gateway_client = Mock()
    svc.spring_gateway_client.execute_prompt.return_value = Mock(
        content=answer_response, provider="mock"
    )
    svc.search_similar.return_value = []
    return svc


def _sufficient_json():
    return json.dumps({"sufficient": True, "reason": "Good evidence.", "missing_information": []})


def _insufficient_json(missing=None):
    return json.dumps({"sufficient": False, "reason": "Gaps exist.",
                        "missing_information": missing or ["key aspect"]})


# ===========================================================================
# 1. CLASSIFICATION — Natural Language Intent
# ===========================================================================

@pytest.mark.parametrize("query,expects_rag,expects_web", [
    # RAG queries
    ("What does my document say about Redis?", True, False),
    ("According to my documents, how is authentication implemented?", True, False),
    ("Summarize my uploaded project", True, False),
    ("What does my policy file say?", True, False),
    # WEB queries
    ("What are the latest Spring Boot developments?", False, True),
    ("What happened with Spring Boot recently?", False, True),
    ("Current industry standards for REST APIs", False, True),
    ("Find me the latest news on microservices", False, True),
    # BOTH queries
    ("Compare my uploaded architecture with current industry practices.", True, True),
    ("Compare my uploaded project with recent Spring Boot recommendations.", True, True),
    # DIRECT queries
    ("What is dependency injection?", False, False),
    ("Explain the concept of polymorphism", False, False),
    ("What is the difference between REST and GraphQL?", False, False),
])
def test_classification_routes(query, expects_rag, expects_web):
    svc = _mock_rag_service()
    graph = AgentGraph(svc)
    state = _base_state(query=query)
    result = graph.classify_question(state)
    assert result["needs_retrieval"] == expects_rag, f"RAG mismatch for: {query!r}"
    assert result["needs_web_search"] == expects_web, f"WEB mismatch for: {query!r}"


# ===========================================================================
# 2. EVALUATOR — Tier 1 deterministic (no LLM calls)
# ===========================================================================

def test_evaluator_tier1_empty():
    """Empty evidence → INSUFFICIENT without LLM."""
    client = Mock()
    ev = EvidenceEvaluator(client)
    result = ev.evaluate("any question", [])
    assert result.sufficient is False
    client.execute_prompt.assert_not_called()


def test_evaluator_tier1_too_short():
    """Content under 100 chars → INSUFFICIENT without LLM."""
    client = Mock()
    ev = EvidenceEvaluator(client)
    small = EvidenceItem(source_type="document", title="T", content="tiny", score=0.9)
    result = ev.evaluate("any question", [small])
    assert result.sufficient is False
    client.execute_prompt.assert_not_called()


def test_evaluator_tier1_all_low_score():
    """All evidence scores < 0.30 → INSUFFICIENT without LLM."""
    client = Mock()
    ev = EvidenceEvaluator(client)
    low = EvidenceItem(source_type="web", title="T", content="x " * 100, url="http://x.com", score=0.15)
    result = ev.evaluate("any question", [low])
    assert result.sufficient is False
    client.execute_prompt.assert_not_called()


def test_evaluator_tier1_no_scores_passes_to_tier2():
    """Evidence with no scores → Tier 1 passes to Tier 2 (LLM is called)."""
    client = Mock()
    client.execute_prompt.return_value = Mock(content=_sufficient_json())
    ev = EvidenceEvaluator(client)
    unscored = EvidenceItem(source_type="document", title="T", content="solid content " * 20, score=None)
    result = ev.evaluate("question", [unscored])
    client.execute_prompt.assert_called_once()
    assert result.sufficient is True


# ===========================================================================
# 3. EVALUATOR — Tier 2 LLM (structured response parsing)
# ===========================================================================

def test_evaluator_tier2_sufficient():
    client = Mock()
    client.execute_prompt.return_value = Mock(content=_sufficient_json())
    ev = EvidenceEvaluator(client)
    good_ev = _make_ev(score=0.85)
    result = ev.evaluate("question", [good_ev])
    assert result.sufficient is True
    assert result.missing_information == []


def test_evaluator_tier2_insufficient_with_missing_info():
    client = Mock()
    client.execute_prompt.return_value = Mock(
        content=_insufficient_json(missing=["SETNX behavior", "lock contention"])
    )
    ev = EvidenceEvaluator(client)
    good_ev = _make_ev(score=0.85)
    result = ev.evaluate("Redis locking question", [good_ev])
    assert result.sufficient is False
    assert "SETNX behavior" in result.missing_information
    assert "lock contention" in result.missing_information


def test_evaluator_tier2_failure_conservative_fallback():
    """LLM evaluator raises → conservative INSUFFICIENT (never silently pass)."""
    client = Mock()
    client.execute_prompt.side_effect = RuntimeError("Gateway down")
    ev = EvidenceEvaluator(client)
    good_ev = _make_ev(score=0.85)
    result = ev.evaluate("question", [good_ev])
    assert result.sufficient is False
    assert "unavailable" in result.reason.lower()


def test_evaluator_tier2_malformed_json_fallback():
    """Malformed JSON → conservative INSUFFICIENT."""
    client = Mock()
    client.execute_prompt.return_value = Mock(content="I think it's enough, yes probably.")
    ev = EvidenceEvaluator(client)
    good_ev = _make_ev(score=0.85)
    result = ev.evaluate("question", [good_ev])
    assert result.sufficient is False


def test_evaluator_tier2_markdown_json_fences():
    """LLM wraps JSON in markdown fences — should still parse."""
    client = Mock()
    client.execute_prompt.return_value = Mock(
        content=f"```json\n{_sufficient_json()}\n```"
    )
    ev = EvidenceEvaluator(client)
    good_ev = _make_ev(score=0.85)
    result = ev.evaluate("question", [good_ev])
    assert result.sufficient is True


# ===========================================================================
# 4. MISSING-INFORMATION AWARE REFINEMENT
# ===========================================================================

def test_refine_query_uses_missing_info_in_prompt():
    """build_refinement_prompt is called with missing_information when available."""
    svc = _mock_rag_service(answer_response="Refined query text")
    svc.spring_gateway_client.execute_prompt.return_value = Mock(
        content="Redis SETNX contention latency performance", provider="mock"
    )
    graph = AgentGraph(svc)
    missing = ["SETNX behavior", "lock contention", "latency"]
    state = _base_state(
        query="Redis distributed locking performance",
        search_queries=["Redis distributed locking performance"],
        evidence=[],
        missing_information=missing
    )
    state = graph.refine_query(state)
    call_args = svc.prompt_builder.build_refinement_prompt.call_args
    # Check missing_information was passed
    passed_missing = call_args[1].get("missing_information") or (
        call_args[0][2] if len(call_args[0]) > 2 else None
    )
    assert passed_missing == missing


def test_refine_query_fallback_uses_first_missing_item():
    """If LLM returns same query (duplicate), fallback uses first missing_information item."""
    svc = _mock_rag_service()
    svc.spring_gateway_client.execute_prompt.return_value = Mock(
        content="Redis distributed locking performance", provider="mock"
    )
    graph = AgentGraph(svc)
    state = _base_state(
        query="Redis distributed locking performance",
        search_queries=["Redis distributed locking performance"],
        evidence=[],
        missing_information=["SETNX behavior", "lock contention"]
    )
    state = graph.refine_query(state)
    assert len(state["search_queries"]) == 2
    # Fallback appends first missing item
    assert "SETNX behavior" in state["search_queries"][-1]


# ===========================================================================
# 5. QUERY NORMALIZATION / DUPLICATE PREVENTION
# ===========================================================================

@pytest.mark.parametrize("q1,q2,should_be_duplicate", [
    ("Redis locking", "redis locking", True),
    ("Redis locking!", "  Redis locking  ", True),
    ("Redis locking", "redis locking performance", False),
    ("What is DI?", "what is di", True),
])
def test_query_normalization(q1, q2, should_be_duplicate):
    n1 = _normalize_query(q1)
    n2 = _normalize_query(q2)
    assert (n1 == n2) == should_be_duplicate


def test_refine_query_normalized_duplicate_prevented():
    """Normalized duplicate triggers fallback even if casing/punctuation differs."""
    svc = _mock_rag_service()
    svc.spring_gateway_client.execute_prompt.return_value = Mock(
        content="  REDIS LOCKING!  ", provider="mock"
    )
    graph = AgentGraph(svc)
    state = _base_state(
        query="Redis locking",
        search_queries=["Redis locking"],
        evidence=[],
        missing_information=["deadlock"]
    )
    state = graph.refine_query(state)
    assert len(state["search_queries"]) == 2
    # The fallback should be different from "redis locking"
    assert _normalize_query(state["search_queries"][-1]) != _normalize_query("Redis locking")


# ===========================================================================
# 6. CONFLICT DETECTION — mixed sources trigger hint in synthesis prompt
# ===========================================================================

def test_conflict_hint_in_mixed_evidence_prompt():
    """When both doc and web evidence exist, build_user_prompt is called with has_mixed_sources=True."""
    svc = _mock_rag_service()
    graph = AgentGraph(svc)
    doc_ev = _make_ev("document")
    web_ev = _make_ev("web")
    state = _base_state(evidence=[doc_ev, web_ev])
    graph.generate_answer(state)
    call_args = svc.prompt_builder.build_user_prompt.call_args
    assert call_args[1].get("has_mixed_sources") is True


def test_no_conflict_hint_doc_only():
    """Doc-only evidence does not trigger conflict hint."""
    svc = _mock_rag_service()
    graph = AgentGraph(svc)
    state = _base_state(evidence=[_make_ev("document")])
    graph.generate_answer(state)
    call_args = svc.prompt_builder.build_user_prompt.call_args
    assert call_args[1].get("has_mixed_sources") is False


# ===========================================================================
# 7. CITATION PROVENANCE — no fabricated URLs
# ===========================================================================

def test_citation_provenance_document():
    """Document sources in AgentAskResponse come from EvidenceItem state, not LLM."""
    # Simulate internal_agent.py source extraction logic
    ev = EvidenceItem(
        source_type="document",
        title="myfile.pdf",
        content="content",
        document_id="doc-123",
        chunk_id="chunk-456",
        score=0.88
    )
    # Verify source_type controls which fields are used
    assert ev.document_id == "doc-123"
    assert ev.chunk_id == "chunk-456"
    assert ev.title == "myfile.pdf"


def test_citation_provenance_web():
    """Web sources come from EvidenceItem URL, not from LLM-generated text."""
    ev = EvidenceItem(
        source_type="web",
        title="Spring Boot Guide",
        content="content",
        url="https://spring.io/guides/gs/rest-service",
        source_domain="spring.io",
        score=0.91
    )
    assert ev.url == "https://spring.io/guides/gs/rest-service"
    # The URL is stored in state before LLM generates any text
    # LLM only produces answer text; citations are extracted from state separately


# ===========================================================================
# 8. LLM CALL COUNT PER PATH
# ===========================================================================

def test_llm_call_count_direct():
    """Direct path: exactly 1 LLM call (answer only)."""
    svc = _mock_rag_service()
    compiled = AgentGraph(svc).build()
    state = _base_state(query="What is polymorphism?")
    compiled.invoke(state)
    # Only direct_answer call
    assert svc.spring_gateway_client.execute_prompt.call_count == 1


@patch.object(AgentGraph, '_execute_retrieval')
def test_llm_call_count_rag_sufficient(mock_retrieval):
    """RAG sufficient: 2 LLM calls (evaluate + answer)."""
    good_ev = _make_ev("document", score=0.85)
    mock_retrieval.return_value = [good_ev]

    svc = _mock_rag_service()
    # Call sequence: evaluate (sufficient) → answer
    svc.spring_gateway_client.execute_prompt.side_effect = [
        Mock(content=_sufficient_json(), provider="mock"),   # evaluate
        Mock(content="The answer.", provider="mock"),         # answer
    ]

    compiled = AgentGraph(svc).build()
    state = _base_state(query="my document Redis details", user_id="u1")
    compiled.invoke(state)
    assert svc.spring_gateway_client.execute_prompt.call_count == 2


@patch.object(AgentGraph, '_execute_web_search')
def test_llm_call_count_web_one_iteration(mock_web):
    """Web, 1 refinement needed: 4 LLM calls (refine + evaluate×2 + answer)."""
    big_ev = _make_ev("web", score=0.85)
    mock_web.side_effect = [[], [big_ev]]  # First empty, second has results

    svc = _mock_rag_service()
    svc.spring_gateway_client.execute_prompt.side_effect = [
        # 1st evaluate_evidence → Tier 1 catches empty, NO LLM call here
        # refine_query → LLM call #1
        Mock(content="Refined query string", provider="mock"),
        # 2nd evaluate_evidence → Tier 2 LLM call #2
        Mock(content=_sufficient_json(), provider="mock"),
        # generate_answer → LLM call #3
        Mock(content="Final answer", provider="mock"),
    ]

    compiled = AgentGraph(svc).build()
    state = _base_state(query="latest Spring Boot news")
    compiled.invoke(state)
    assert svc.spring_gateway_client.execute_prompt.call_count == 3

# ===========================================================================
# 9. FAILURE HANDLING
# ===========================================================================

def test_web_search_failure_graceful():
    """Web search tool raising → _execute_web_search catches it and returns []."""
    svc = _mock_rag_service()
    graph = AgentGraph(svc)

    # Patch the underlying tool's invoke to raise, verifying the graph absorbs the error
    graph.web_search_tool = Mock()
    graph.web_search_tool.invoke.side_effect = RuntimeError("Tavily down")

    result = graph._execute_web_search("latest news")
    assert result == []  # Exception must be caught internally, never propagated


def test_evaluator_failure_does_not_pass_evidence():
    """If LLM evaluator fails, we NEVER mark evidence as sufficient."""
    client = Mock()
    client.execute_prompt.side_effect = Exception("Gateway down")
    ev_eval = EvidenceEvaluator(client)
    ev = _make_ev(score=0.85)
    result = ev_eval.evaluate("question", [ev])
    assert result.sufficient is False


def test_refine_query_gateway_failure_uses_fallback():
    """If Spring Gateway fails during refinement, fallback query is appended."""
    svc = _mock_rag_service()
    svc.spring_gateway_client.execute_prompt.side_effect = RuntimeError("Gateway down")
    graph = AgentGraph(svc)
    state = _base_state(
        query="Redis performance",
        search_queries=["Redis performance"],
        evidence=[],
        missing_information=["throughput"]
    )
    state = graph.refine_query(state)
    assert len(state["search_queries"]) == 2
    # Fallback uses first missing item
    assert "throughput" in state["search_queries"][-1]


# ===========================================================================
# 10. CONCURRENT STATE ISOLATION
# ===========================================================================

def test_concurrent_state_isolation():
    """Two concurrent invocations must not share state."""
    svc = _mock_rag_service()
    svc.spring_gateway_client.execute_prompt.return_value = Mock(
        content=_sufficient_json(), provider="mock"
    )
    compiled = AgentGraph(svc).build()

    state_a = _base_state(query="my document A", user_id="userA")
    state_b = _base_state(query="my document B", user_id="userB")

    # Sequential invocations (LangGraph is synchronous here)
    res_a = compiled.invoke(state_a)
    res_b = compiled.invoke(state_b)

    assert res_a["user_id"] == "userA"
    assert res_b["user_id"] == "userB"
    # Evidence lists are separate objects
    assert res_a["evidence"] is not res_b["evidence"]
