"""
test_agent_performance.py — Sprint 4 Task 4 latency measurements.

Environment: LOCAL / MOCKED (no real LLM calls, no real Qdrant, no real Tavily)

These tests measure Python-side graph execution overhead: state transitions,
classification, deduplication, and prompt building. LLM calls are mocked to
return instantly, so numbers represent graph overhead ONLY.

Do NOT use these numbers as production benchmarks.
Label: LOCAL / MOCKED
"""
import time
import json
import statistics
import pytest
from unittest.mock import Mock, patch
from app.agent.graph import AgentGraph
from app.models.evidence import EvidenceItem

ITERATIONS = 20  # How many times to repeat each scenario


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_ev(src="document", content="evidence content " * 20, score=0.85, url="http://ex.com"):
    if src == "document":
        return EvidenceItem(source_type="document", title="Doc", content=content,
                            document_id="d1", chunk_id="c1", score=score)
    return EvidenceItem(source_type="web", title="Web", content=content, url=url, score=score)


def _sufficient_json():
    return json.dumps({"sufficient": True, "reason": "ok", "missing_information": []})


def _insufficient_json():
    return json.dumps({"sufficient": False, "reason": "Gaps", "missing_information": ["detail"]})


def _base_state(**overrides):
    state = {
        "query": "test question",
        "user_id": "user1",
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


def _make_svc(call_sequence=None, default_response=None):
    svc = Mock()
    svc.prompt_builder = Mock()
    svc.prompt_builder.get_system_prompt_for_mode.return_value = "sys"
    svc.prompt_builder.build_context.return_value = "ctx"
    svc.prompt_builder.build_user_prompt.return_value = "prompt"
    svc.prompt_builder.build_refinement_prompt.return_value = "refine"
    svc.prompt_builder.system_prompt = "sys"
    svc.llm_gateway = Mock()

    if call_sequence:
        from itertools import cycle
        svc.llm_gateway.execute_prompt.side_effect = cycle(call_sequence)
    else:
        resp = default_response or Mock(content="Answer", provider="mock")
        svc.llm_gateway.execute_prompt.return_value = resp

    svc.search_similar.return_value = []
    return svc


def _measure(fn, n=ITERATIONS):
    """Run fn n times and return (p50_ms, p95_ms, samples_ms)."""
    samples = []
    for _ in range(n):
        t0 = time.perf_counter()
        fn()
        samples.append((time.perf_counter() - t0) * 1000)
    samples.sort()
    p50 = statistics.median(samples)
    idx_95 = max(0, int(len(samples) * 0.95) - 1)
    p95 = samples[idx_95]
    return p50, p95, samples


# ---------------------------------------------------------------------------
# Scenario 1 — DIRECT (no retrieval, no evaluation)
# ---------------------------------------------------------------------------

def test_perf_direct():
    svc = _make_svc(default_response=Mock(content="Direct answer", provider="mock"))
    compiled = AgentGraph(svc).build()

    def run():
        state = _base_state(query="What is polymorphism?")
        compiled.invoke(state)

    p50, p95, samples = _measure(run)
    print(f"\n[MOCKED] Direct — P50: {p50:.1f}ms  P95: {p95:.1f}ms  (n={ITERATIONS})")
    # Structural assertion: graph overhead should be negligible for mocked calls
    assert p50 < 200, f"Direct P50 too high: {p50:.1f}ms"
    assert p95 < 500, f"Direct P95 too high: {p95:.1f}ms"


# ---------------------------------------------------------------------------
# Scenario 2 — RAG ONLY (retrieval + evaluate sufficient + answer)
# ---------------------------------------------------------------------------

@patch.object(AgentGraph, '_execute_retrieval')
def test_perf_rag_sufficient(mock_retrieval):
    good_ev = _make_ev("document")
    mock_retrieval.return_value = [good_ev]

    svc = _make_svc(call_sequence=[
        Mock(content=_sufficient_json(), provider="mock"),   # evaluate
        Mock(content="RAG answer", provider="mock"),          # answer
    ])
    compiled = AgentGraph(svc).build()

    def run():
        state = _base_state(query="my document Redis details", user_id="u1")
        compiled.invoke(state)

    p50, p95, samples = _measure(run)
    print(f"\n[MOCKED] RAG sufficient — P50: {p50:.1f}ms  P95: {p95:.1f}ms  (n={ITERATIONS})")
    assert p50 < 500
    assert p95 < 1000


# ---------------------------------------------------------------------------
# Scenario 3 — WEB ONLY (web search + evaluate sufficient + answer)
# ---------------------------------------------------------------------------

@patch.object(AgentGraph, '_execute_web_search')
def test_perf_web_sufficient(mock_web):
    good_ev = _make_ev("web")
    mock_web.return_value = [good_ev]

    svc = _make_svc(call_sequence=[
        Mock(content=_sufficient_json(), provider="mock"),
        Mock(content="Web answer", provider="mock"),
    ])
    compiled = AgentGraph(svc).build()

    def run():
        state = _base_state(query="latest Spring Boot news")
        compiled.invoke(state)

    p50, p95, samples = _measure(run)
    print(f"\n[MOCKED] Web sufficient — P50: {p50:.1f}ms  P95: {p95:.1f}ms  (n={ITERATIONS})")
    assert p50 < 500


# ---------------------------------------------------------------------------
# Scenario 4 — RAG + WEB (both sources, evaluate sufficient + answer)
# ---------------------------------------------------------------------------

@patch.object(AgentGraph, '_execute_web_search')
@patch.object(AgentGraph, '_execute_retrieval')
def test_perf_rag_and_web(mock_retrieval, mock_web):
    mock_retrieval.return_value = [_make_ev("document")]
    mock_web.return_value = [_make_ev("web")]

    svc = _make_svc(call_sequence=[
        Mock(content=_sufficient_json(), provider="mock"),
        Mock(content="Combined answer", provider="mock"),
    ])
    compiled = AgentGraph(svc).build()

    def run():
        state = _base_state(query="Compare my uploaded document with current industry practices")
        compiled.invoke(state)

    p50, p95, samples = _measure(run)
    print(f"\n[MOCKED] RAG+Web sufficient — P50: {p50:.1f}ms  P95: {p95:.1f}ms  (n={ITERATIONS})")
    assert p50 < 1000


# ---------------------------------------------------------------------------
# Scenario 5 — TWO ITERATIONS (1 refinement cycle)
# ---------------------------------------------------------------------------

@patch.object(AgentGraph, '_execute_web_search')
def test_perf_two_iterations(mock_web):
    big_ev = _make_ev("web")
    mock_web.side_effect = lambda q: [] if mock_web.call_count <= 1 else [big_ev]

    svc = _make_svc(call_sequence=[
        # 1st evaluate (Tier 1 catches empty — no LLM)
        # refine_query → LLM
        Mock(content="Refined query", provider="mock"),
        # 2nd evaluate → LLM
        Mock(content=_sufficient_json(), provider="mock"),
        # answer → LLM
        Mock(content="Two-iter answer", provider="mock"),
    ])
    compiled = AgentGraph(svc).build()

    def run():
        svc.llm_gateway.execute_prompt.reset_mock(side_effect=True)
        from itertools import cycle
        svc.llm_gateway.execute_prompt.side_effect = cycle([
            Mock(content="Refined query", provider="mock"),
            Mock(content=_sufficient_json(), provider="mock"),
            Mock(content="Two-iter answer", provider="mock"),
        ])
        mock_web.reset_mock()
        mock_web.side_effect = None
        mock_web.side_effect = [[], [big_ev]]
        state = _base_state(query="latest news", iteration=1)
        compiled.invoke(state)

    # Measure just 10 times for multi-iteration (heavier)
    p50, p95, samples = _measure(run, n=10)
    print(f"\n[MOCKED] 2 iterations — P50: {p50:.1f}ms  P95: {p95:.1f}ms  (n=10)")
    assert p50 < 2000


# ---------------------------------------------------------------------------
# Scenario 6 — THREE ITERATIONS (max iterations, then fallback)
# ---------------------------------------------------------------------------

@patch.object(AgentGraph, '_execute_web_search')
def test_perf_three_iterations(mock_web):
    mock_web.return_value = []  # Always empty → always refine

    svc = _make_svc()
    # Tier 1 catches empty every time — no evaluate LLM call
    # refine_query LLM calls × 2 (iterations 1 and 2), then insufficient_context (no LLM)
    from itertools import cycle
    svc.spring_gateway_client.execute_prompt.side_effect = cycle([
        Mock(content="Refined query 1", provider="mock"),
        Mock(content="Refined query 2", provider="mock"),
    ])
    compiled = AgentGraph(svc).build()

    def run():
        svc.llm_gateway.execute_prompt.reset_mock(side_effect=True)
        svc.llm_gateway.execute_prompt.side_effect = cycle([
            Mock(content="Refined query 1", provider="mock"),
            Mock(content="Refined query 2", provider="mock"),
        ])
        mock_web.reset_mock()
        mock_web.return_value = []
        state = _base_state(query="latest news", iteration=1)
        compiled.invoke(state)

    p50, p95, samples = _measure(run, n=10)
    print(f"\n[MOCKED] 3 iterations (max) — P50: {p50:.1f}ms  P95: {p95:.1f}ms  (n=10)")
    assert p50 < 3000
