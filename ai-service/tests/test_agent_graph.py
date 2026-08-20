import pytest
from unittest.mock import Mock, MagicMock, patch
from app.agent.state import AgentState
from app.agent.graph import AgentGraph
from app.services.rag_service import RAGService
from app.services.vector_store import RetrievedChunk
from app.models.ai_execute import AiExecuteResponse


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


@pytest.fixture
def mock_rag_service():
    rag_service = Mock(spec=RAGService)
    rag_service.prompt_builder = Mock()
    rag_service.prompt_builder.get_system_prompt_for_mode.return_value = "Mock system"
    rag_service.prompt_builder.build_context.return_value = "Mock context"
    rag_service.prompt_builder.build_user_prompt.return_value = "Mock prompt"
    rag_service.prompt_builder.build_analysis_prompt.return_value = "Mock analysis prompt"
    rag_service.prompt_builder.build_refinement_prompt.return_value = "Mock refinement prompt"
    rag_service.prompt_builder.system_prompt = "Mock system"
    rag_service.prompt_builder.ANALYSIS_SYSTEM_PROMPT = "Mock analysis system"

    rag_service.spring_gateway_client = Mock()
    mock_response = Mock()
    mock_response.content = "Mock answer"
    mock_response.provider = "mock"
    rag_service.spring_gateway_client.execute_prompt.return_value = mock_response

    # Mock search_similar for tool — return a single high-quality chunk with sufficient content
    rag_service.search_similar.return_value = [
        RetrievedChunk(document_id="d1", chunk_id="c1",
                       content="chunk content with enough data to pass tier one deterministic evaluation minimum " * 3,
                       score=0.9, metadata={})
    ]
    return rag_service


def test_classify_question_rag(mock_rag_service):
    graph = AgentGraph(mock_rag_service)
    state = _base_state(query="What does my document say?")
    res = graph.classify_question(state)
    assert res["needs_retrieval"] is True

def test_classify_question_direct(mock_rag_service):
    graph = AgentGraph(mock_rag_service)
    state = _base_state(query="Hello world")
    res = graph.classify_question(state)
    assert res["needs_retrieval"] is False
    assert res["needs_web_search"] is False
    assert res.get("needs_analysis", False) is False


def test_classify_question_analyze(mock_rag_service):
    graph = AgentGraph(mock_rag_service)
    state = _base_state(query="analyze my document")
    res = graph.classify_question(state)
    assert res["needs_retrieval"] is True
    assert res["needs_analysis"] is True


def test_graph_analysis_flow(mock_rag_service):
    import json
    eval_resp = Mock(content=json.dumps({"sufficient": True, "reason": "ok", "missing_information": []}), provider="mock")
    answer_resp = Mock(content="Mock analysis", provider="mock")
    mock_rag_service.spring_gateway_client.execute_prompt.side_effect = [eval_resp, answer_resp]

    compiled = AgentGraph(mock_rag_service).build()
    state = _base_state(query="analyze my uploaded document in detail", user_id="user123")
    final_state = compiled.invoke(state)

    assert final_state["needs_analysis"] is True
    assert final_state["mode"] == "analysis"
    assert "final_request" in final_state


def test_graph_retrieval_flow(mock_rag_service):
    # RAGService.search_similar returns one chunk with score 0.9
    import json
    mem_resp = Mock(content="NONE", provider="mock")
    eval_resp = Mock(content=json.dumps({"sufficient": True, "reason": "ok", "missing_information": []}), provider="mock")
    mock_rag_service.spring_gateway_client.execute_prompt.side_effect = [mem_resp, eval_resp]

    compiled = AgentGraph(mock_rag_service).build()
    state = _base_state(query="Summarize my uploaded document.", user_id="user123")
    final_state = compiled.invoke(state)

    assert final_state["needs_retrieval"] is True
    assert len(final_state["evidence"]) == 1
    assert "final_request" in final_state
    assert final_state["mode"] == "rag"
    from app.core.config import settings
    mock_rag_service.search_similar.assert_called_once_with("Summarize my uploaded document.", "user123", settings.safety_max_rag_chunks)


def test_graph_direct_flow(mock_rag_service):
    mem_resp = Mock(content="NONE", provider="mock")
    mock_rag_service.spring_gateway_client.execute_prompt.side_effect = [mem_resp]

    compiled = AgentGraph(mock_rag_service).build()
    state = _base_state(query="What is the capital of France?", user_id="user123")
    final_state = compiled.invoke(state)

    assert final_state["needs_retrieval"] is False
    assert len(final_state["evidence"]) == 0
    assert "final_request" in final_state
    assert final_state["mode"] == "direct"
    mock_rag_service.search_similar.assert_not_called()


def test_graph_insufficient_context(mock_rag_service):
    mock_rag_service.search_similar.return_value = []
    # Evaluator returns insufficient
    mem_resp = Mock(content="NONE", provider="mock")
    eval_resp = Mock(
        content='{"sufficient": false, "reason": "No relevant content.", "missing_information": []}',
        provider="mock"
    )
    mock_rag_service.spring_gateway_client.execute_prompt.side_effect = [mem_resp, eval_resp]
    compiled = AgentGraph(mock_rag_service).build()

    state = _base_state(query="What does my document say?", user_id="user123", iteration=3)
    final_state = compiled.invoke(state)

    assert final_state["needs_retrieval"] is True
    assert len(final_state["evidence"]) == 0
    # Because of best-effort, it should route to generate_answer if it hits max iterations
    assert "final_request" in final_state
    assert final_state["mode"] == "unknown"


def test_concurrency_isolation(mock_rag_service):
    mem_resp = Mock(content="NONE", provider="mock")
    eval_resp = Mock(
        content='{"sufficient": true, "reason": "ok", "missing_information": []}',
        provider="mock"
    )
    # 2 invocations means 2 mem_resp, 2 eval_resp
    mock_rag_service.spring_gateway_client.execute_prompt.side_effect = [mem_resp, eval_resp, mem_resp, eval_resp]
    
    compiled = AgentGraph(mock_rag_service).build()

    state_a = _base_state(query="my document A", user_id="userA")
    state_b = _base_state(query="my document B", user_id="userB")

    res_a = compiled.invoke(state_a)
    res_b = compiled.invoke(state_b)

    assert res_a["user_id"] == "userA"
    assert res_b["user_id"] == "userB"


def test_analyze_evidence_priority_sorting(mock_rag_service):
    """Verify evidence is sorted: user_memory > document (by score) > web (by score)."""
    from app.models.evidence import EvidenceItem

    graph = AgentGraph(mock_rag_service)

    evidence = [
        EvidenceItem(source_type="web", title="Web Low", content="w1", score=0.5),
        EvidenceItem(source_type="document", title="Doc Low", content="d1", document_id="d1", chunk_id="c1", score=0.6),
        EvidenceItem(source_type="user_memory", title="Memory", content="mem", document_id="mem1", chunk_id="m1", score=0.3),
        EvidenceItem(source_type="document", title="Doc High", content="d2", document_id="d2", chunk_id="c2", score=0.95),
        EvidenceItem(source_type="web", title="Web High", content="w2", score=0.85),
    ]

    sorted_ev = graph._sort_evidence_by_priority(evidence)

    assert sorted_ev[0].source_type == "user_memory", "Memory should be first"
    assert sorted_ev[1].source_type == "document" and sorted_ev[1].score == 0.95, "High-score doc second"
    assert sorted_ev[2].source_type == "document" and sorted_ev[2].score == 0.6, "Low-score doc third"
    assert sorted_ev[3].source_type == "web" and sorted_ev[3].score == 0.85, "High-score web fourth"
    assert sorted_ev[4].source_type == "web" and sorted_ev[4].score == 0.5, "Low-score web fifth"


def test_analyze_context_too_large(mock_rag_service):
    """Verify graceful error when ContextTooLargeException is raised."""
    from app.services.context_manager import ContextTooLargeException
    from app.models.evidence import EvidenceItem

    graph = AgentGraph(mock_rag_service)

    # Make the context manager raise ContextTooLargeException
    graph.context_manager.build_context = Mock(side_effect=ContextTooLargeException("Budget exceeded"))

    state = _base_state(
        query="analyze my uploaded document",
        user_id="user123",
        needs_analysis=True,
        evidence=[
            EvidenceItem(source_type="document", title="Big Doc", content="x" * 50000, document_id="d1", chunk_id="c1", score=0.9)
        ]
    )

    result = graph.analyze_evidence(state)

    assert result["mode"] == "error"
    assert "too large" in result["answer"]
    assert result.get("final_request") is None

