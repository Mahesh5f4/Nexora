"""
test_research_loop.py — Existing research loop tests updated for Task 4 state shape.

Key changes:
- AgentState now has evaluation_reason and missing_information fields.
- evaluate_evidence now uses EvidenceEvaluator (mocked through spring_gateway_client).
- evaluate_evidence with non-empty evidence calls the LLM evaluator (Tier 2),
  so mock_rag_service.spring_gateway_client.execute_prompt must return valid JSON.
"""
import pytest
from unittest.mock import Mock, patch
from app.agent.state import AgentState
from app.agent.graph import AgentGraph
from app.models.evidence import EvidenceItem
from app.models.ai_execute import AiExecuteResponse


def _sufficient_eval_response():
    return Mock(
        content='{"sufficient": true, "reason": "Evidence is complete.", "missing_information": []}',
        provider="mock", model="mock"
    )

def _insufficient_eval_response(reason="Insufficient", missing=None):
    missing = missing or []
    import json
    return Mock(
        content=json.dumps({"sufficient": False, "reason": reason, "missing_information": missing}),
        provider="mock", model="mock"
    )

def _answer_response(text="Mocked Answer"):
    return Mock(content=text, provider="mock", model="mock")


@pytest.fixture
def mock_rag_service():
    rag_service = Mock()

    prompt_builder = Mock()
    prompt_builder.get_system_prompt_for_mode.return_value = "sys"
    prompt_builder.build_context.return_value = "Mocked Context"
    prompt_builder.build_user_prompt.return_value = "Mocked Prompt"
    prompt_builder.build_refinement_prompt.return_value = "Mocked Refinement Prompt"
    prompt_builder.system_prompt = "Mocked System Prompt"
    rag_service.prompt_builder = prompt_builder

    client = Mock()
    client.execute_prompt.return_value = _answer_response()
    rag_service.spring_gateway_client = client

    return rag_service


def _base_state(**overrides):
    state = {
        "query": "test query",
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


def test_classify_direct(mock_rag_service):
    graph = AgentGraph(mock_rag_service)
    state = _base_state(query="What is dependency injection?")
    state = graph.classify_question(state)
    assert not state["needs_retrieval"]
    assert not state["needs_web_search"]
    assert graph.route_classification(state) == "direct_answer"


def test_classify_rag_web_combined(mock_rag_service):
    graph = AgentGraph(mock_rag_service)
    state = _base_state(query="Compare my uploaded document with the latest news")
    state = graph.classify_question(state)
    assert state["needs_retrieval"]
    assert state["needs_web_search"]
    assert graph.route_classification(state) == "collect_initial_evidence"


def test_evaluate_evidence_sufficient(mock_rag_service):
    """Evidence that passes Tier 1 and Tier 2 (LLM says sufficient)."""
    mock_rag_service.spring_gateway_client.execute_prompt.return_value = _sufficient_eval_response()
    graph = AgentGraph(mock_rag_service)
    ev = EvidenceItem(source_type="document", title="T", content="C " * 60, score=0.9)
    state = _base_state(evidence=[ev])
    state = graph.evaluate_evidence(state)
    assert state["evaluation_status"] == "SUFFICIENT"
    assert graph.route_evaluation(state) == "generate_answer"


def test_evaluate_evidence_insufficient_empty(mock_rag_service):
    """Empty evidence — Tier 1 catches it, no LLM call needed."""
    graph = AgentGraph(mock_rag_service)
    state = _base_state(evidence=[], iteration=1)
    state = graph.evaluate_evidence(state)
    assert state["evaluation_status"] == "INSUFFICIENT_EVIDENCE"
    assert graph.route_evaluation(state) == "refine_query"
    # LLM evaluator must NOT have been called (Tier 1 handled it)
    mock_rag_service.spring_gateway_client.execute_prompt.assert_not_called()


def test_evaluate_evidence_low_score_tier1(mock_rag_service):
    """All scores below threshold — Tier 1 catches it without LLM."""
    graph = AgentGraph(mock_rag_service)
    ev = EvidenceItem(source_type="web", title="T", content="x " * 60, url="http://x.com", score=0.10)
    state = _base_state(evidence=[ev], iteration=1)
    state = graph.evaluate_evidence(state)
    assert state["evidence_sufficient"] is False
    mock_rag_service.spring_gateway_client.execute_prompt.assert_not_called()


def test_evaluate_evidence_insufficient_loop(mock_rag_service):
    """LLM says insufficient, iteration below max → refine_query."""
    mock_rag_service.spring_gateway_client.execute_prompt.return_value = _insufficient_eval_response()
    graph = AgentGraph(mock_rag_service)
    ev = EvidenceItem(source_type="web", title="T", content="x " * 60, url="http://x.com", score=0.8)
    state = _base_state(evidence=[ev], iteration=1)
    state = graph.evaluate_evidence(state)
    assert state["evidence_sufficient"] is False
    assert graph.route_evaluation(state) == "refine_query"


def test_evaluate_evidence_insufficient_max(mock_rag_service):
    """LLM says insufficient, iteration == max → insufficient_context."""
    mock_rag_service.spring_gateway_client.execute_prompt.return_value = _insufficient_eval_response()
    graph = AgentGraph(mock_rag_service)
    ev = EvidenceItem(source_type="web", title="T", content="x " * 60, url="http://x.com", score=0.8)
    state = _base_state(evidence=[ev], iteration=3)
    state = graph.evaluate_evidence(state)
    assert state["evidence_sufficient"] is False
    assert graph.route_evaluation(state) == "insufficient_context"


def test_deduplicate_evidence(mock_rag_service):
    graph = AgentGraph(mock_rag_service)
    ev1 = EvidenceItem(source_type="document", title="A", content="A", document_id="1", chunk_id="1")
    ev2 = EvidenceItem(source_type="document", title="B", content="A", document_id="1", chunk_id="1")  # Duplicate
    ev3 = EvidenceItem(source_type="web", title="C", content="C", url="http://x.com")
    ev4 = EvidenceItem(source_type="web", title="D", content="D", url="http://x.com")  # Duplicate URL

    deduped = graph._deduplicate_evidence([ev1, ev3], [ev2, ev4])
    assert len(deduped) == 2


def test_refine_query_prevents_duplicates(mock_rag_service):
    """If LLM returns the same normalized query, fallback appends a suffix."""
    mock_rag_service.spring_gateway_client.execute_prompt.return_value = Mock(
        content="original query", provider="mock", model="mock"
    )
    graph = AgentGraph(mock_rag_service)
    state = _base_state(
        query="original query",
        search_queries=["original query"],
        evidence=[],
        missing_information=[]
    )
    state = graph.refine_query(state)
    assert len(state["search_queries"]) == 2
    assert state["search_queries"][-1] != "original query"


def test_refine_query_uses_missing_information(mock_rag_service):
    """Refined query should incorporate missing_information when provided."""
    mock_rag_service.spring_gateway_client.execute_prompt.return_value = Mock(
        content="Redis SETNX contention latency", provider="mock", model="mock"
    )
    graph = AgentGraph(mock_rag_service)
    state = _base_state(
        query="Redis distributed locking performance",
        search_queries=["Redis distributed locking performance"],
        evidence=[],
        missing_information=["SETNX behavior", "lock contention", "latency"]
    )
    state = graph.refine_query(state)
    # build_refinement_prompt should have been called with missing_information
    mock_rag_service.prompt_builder.build_refinement_prompt.assert_called_once()
    call_kwargs = mock_rag_service.prompt_builder.build_refinement_prompt.call_args
    assert call_kwargs[1].get("missing_information") or call_kwargs[0][2]


def test_graph_compiles_and_runs_direct(mock_rag_service):
    graph = AgentGraph(mock_rag_service).build()
    state = _base_state(query="What is DI?", user_id="user1")
    final_state = graph.invoke(state)
    assert final_state["mode"] == "direct"
    assert final_state["answer"] == "Mocked Answer"


@patch.object(AgentGraph, '_execute_retrieval')
@patch.object(AgentGraph, '_execute_web_search')
def test_graph_loop_execution(mock_web, mock_retrieval, mock_rag_service):
    """
    Scenario B: Web search → empty → LLM says insufficient → refine → web again → sufficient → answer.
    The evaluate LLM call returns insufficient first, then sufficient.
    The answer LLM call returns the final answer.
    """
    mock_retrieval.return_value = []

    good_ev = EvidenceItem(source_type="web", title="Res", content="Content " * 20, url="http://res.com", score=0.85)
    mock_web.side_effect = [
        [],
        [good_ev]
    ]

    # LLM call sequence:
    # 1. evaluate_evidence (first pass, empty after web returns []) — Tier 1 catches empty, no LLM
    # 2. refine_query → LLM returns refined query string
    # 3. evaluate_evidence (second pass) → LLM returns sufficient=true
    # 4. generate_answer → LLM returns final answer
    import json
    call_sequence = [
        Mock(content="Refined Search Query", provider="mock"),              # refine_query
        Mock(content=json.dumps({"sufficient": True, "reason": "ok",       # evaluate (2nd pass)
                                 "missing_information": []}), provider="mock"),
        Mock(content="Final Answer", provider="mock"),                      # generate_answer
    ]
    mock_rag_service.spring_gateway_client.execute_prompt.side_effect = call_sequence

    graph = AgentGraph(mock_rag_service).build()
    state = _base_state(query="latest news", user_id="user1")
    final_state = graph.invoke(state)

    assert final_state["iteration"] == 2
    assert final_state["evaluation_status"] == "SUFFICIENT"
    assert final_state["mode"] == "web_search"
    assert len(final_state["evidence"]) == 1
    assert len(final_state["search_queries"]) == 2
