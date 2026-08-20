import pytest
from unittest.mock import Mock, patch
from fastapi import HTTPException
import json
from app.agent.graph import AgentGraph
from app.api.internal_agent import ask_agent, ask_agent_stream
from app.models.agent import AgentAskRequest
from app.models.ai_execute import AiExecuteResponse
from app.models.evidence import EvidenceItem

# Helper functions
def _mock_rag_service():
    svc = Mock()
    svc.spring_gateway_client = Mock()
    return svc

def _base_state(**kwargs):
    s = {
        "query": "test query",
        "user_id": "test_user",
        "messages": [],
        "evidence": [],
        "search_queries": [],
        "iteration": 1,
        "max_iterations": 3,
        "needs_analysis": True,
        "needs_retrieval": True,
        "needs_web_search": False
    }
    s.update(kwargs)
    return s

def _make_ev(source_type="document", score=0.9, content="data"):
    return EvidenceItem(source_type=source_type, title="doc1", content=content, document_id="d1", chunk_id="c1", score=score)


class TestAnalyzeErrorHandling:

    @patch.object(AgentGraph, '_execute_memory_retrieval')
    @patch.object(AgentGraph, '_execute_retrieval')
    def test_memory_fails_doc_succeeds(self, mock_doc, mock_mem):
        """Memory retrieval fails but document retrieval succeeds \u2192 continue with document evidence."""
        mock_mem.side_effect = Exception("Memory DB down")
        mock_doc.return_value = [_make_ev("document")]
        
        svc = _mock_rag_service()
        graph = AgentGraph(svc)
        state = _base_state(query="analyze my document")
        state = graph.collect_initial_evidence(state)
        
        assert state["memory_retrieval_status"] == "FAILED" # 'my' in query triggers memory, which is mocked to fail
        assert len(state["evidence"]) == 1
        assert state["evidence"][0].source_type == "document"


    @patch.object(AgentGraph, '_execute_memory_retrieval')
    @patch.object(AgentGraph, '_execute_retrieval')
    def test_doc_fails_memory_succeeds(self, mock_doc, mock_mem):
        """Document retrieval fails but memory succeeds \u2192 continue with memory evidence."""
        mock_doc.side_effect = Exception("Vector DB down")
        mock_mem.return_value = [_make_ev("user_memory")]
        
        svc = _mock_rag_service()
        graph = AgentGraph(svc)
        state = _base_state(query="analyze my document") # 'my' triggers memory, 'document' triggers doc
        state = graph.collect_initial_evidence(state)
        
        assert state["document_retrieval_status"] == "FAILED"
        assert len(state["evidence"]) == 1
        assert state["evidence"][0].source_type == "user_memory"


    @patch.object(AgentGraph, '_execute_web_search')
    @patch.object(AgentGraph, '_execute_retrieval')
    def test_web_fails_rag_succeeds(self, mock_doc, mock_web):
        """Web retrieval fails but RAG succeeds \u2192 continue with RAG."""
        mock_web.side_effect = Exception("Search API down")
        mock_doc.return_value = [_make_ev("document")]
        
        svc = _mock_rag_service()
        graph = AgentGraph(svc)
        state = _base_state(query="analyze this architecture", needs_web_search=True)
        state = graph.collect_initial_evidence(state)
        
        assert state["web_retrieval_status"] == "FAILED"
        assert len(state["evidence"]) == 1
        assert state["evidence"][0].source_type == "document"


    @patch.object(AgentGraph, '_execute_memory_retrieval')
    @patch.object(AgentGraph, '_execute_retrieval')
    @patch.object(AgentGraph, '_execute_web_search')
    def test_all_retrieval_fails(self, mock_web, mock_doc, mock_mem):
        """All retrieval fails \u2192 state has empty evidence."""
        mock_web.side_effect = Exception("Fail")
        mock_doc.side_effect = Exception("Fail")
        mock_mem.side_effect = Exception("Fail")
        
        svc = _mock_rag_service()
        graph = AgentGraph(svc)
        state = _base_state(query="analyze my architecture with web", needs_web_search=True)
        state = graph.collect_initial_evidence(state)
        
        assert len(state["evidence"]) == 0
        
        # Test routing fallback when no conversation history
        state["evaluation_status"] = "INSUFFICIENT_EVIDENCE"
        next_node = graph.route_evaluation(state)
        assert next_node == "insufficient_context"


    def test_no_evidence_with_context(self):
        """No evidence but sufficient conversation context \u2192 allows generation."""
        svc = _mock_rag_service()
        graph = AgentGraph(svc)
        state = _base_state(
            query="analyze this", 
            evidence=[], 
            evaluation_status="INSUFFICIENT_EVIDENCE",
            messages=[{"role": "user", "content": "Here is a very long architectural description..." * 10}]
        )
        next_node = graph.route_evaluation(state)
        assert next_node == "analyze_evidence"


    @patch("app.api.internal_agent.AgentGraph")
    @pytest.mark.asyncio
    async def test_provider_429_propagates_non_stream(self, mock_graph_cls):
        """Provider 429 is propagated safely in non-streaming."""
        svc = _mock_rag_service()
        svc.spring_gateway_client.execute_prompt.side_effect = HTTPException(status_code=429, detail="Rate limit")
        
        mock_graph = Mock()
        mock_graph_cls.return_value.build.return_value = mock_graph
        mock_graph.invoke.return_value = {
            "mode": "analysis",
            "evidence": [_make_ev("document")],
            "final_request": {"prompt": "test", "systemPrompt": "sys", "temperature": 0.1}
        }
        
        req = AgentAskRequest(query="analyze this", userId="u1")
        with pytest.raises(HTTPException) as exc:
            await ask_agent(req, svc)
        assert exc.value.status_code == 429
        assert "Rate limit" in exc.value.detail


    @patch("app.api.internal_agent.AgentGraph")
    @pytest.mark.asyncio
    async def test_provider_503_propagates_non_stream(self, mock_graph_cls):
        """Provider 503 is propagated safely in non-streaming."""
        svc = _mock_rag_service()
        svc.spring_gateway_client.execute_prompt.side_effect = HTTPException(status_code=503, detail="Unavailable")
        
        mock_graph = Mock()
        mock_graph_cls.return_value.build.return_value = mock_graph
        mock_graph.invoke.return_value = {
            "mode": "analysis",
            "evidence": [_make_ev("document")],
            "final_request": {"prompt": "test", "systemPrompt": "sys", "temperature": 0.1}
        }
        
        req = AgentAskRequest(query="analyze this", userId="u1")
        with pytest.raises(HTTPException) as exc:
            await ask_agent(req, svc)
        assert exc.value.status_code == 503


    @patch("app.api.internal_agent.AgentGraph")
    @pytest.mark.asyncio
    async def test_unexpected_exception_mapped_to_500_non_stream(self, mock_graph_cls):
        """Unexpected internal exception is mapped to 500."""
        svc = _mock_rag_service()
        svc.spring_gateway_client.execute_prompt.side_effect = ValueError("Some weird bug")
        
        mock_graph = Mock()
        mock_graph_cls.return_value.build.return_value = mock_graph
        mock_graph.invoke.return_value = {
            "mode": "analysis",
            "evidence": [_make_ev("document")],
            "final_request": {"prompt": "test", "systemPrompt": "sys", "temperature": 0.1}
        }
        
        req = AgentAskRequest(query="analyze this", userId="u1")
        with pytest.raises(HTTPException) as exc:
            await ask_agent(req, svc)
        assert exc.value.status_code == 500


    @patch("app.api.internal_agent.AgentGraph")
    @pytest.mark.asyncio
    async def test_validation_failure_safe_degradation(self, mock_graph_cls):
        """Validation failure returns safe message, not empty/hallucinated."""
        svc = _mock_rag_service()
        
        # Setup mock graph to return analysis mode
        mock_graph = Mock()
        mock_graph_cls.return_value.build.return_value = mock_graph
        mock_graph.invoke.return_value = {
            "mode": "analysis",
            "evidence": [_make_ev("document")],
            "final_request": {"prompt": "test"}
        }
        
        # LLM returns a hallucinated URL
        svc.spring_gateway_client.execute_prompt.return_value = AiExecuteResponse(content="See https://fake.com", provider="mock", model="mock")
        
        req = AgentAskRequest(query="analyze this", userId="u1")
        resp = await ask_agent(req, svc)
        
        assert "could not be reliably validated" in resp.answer
        assert "https://fake.com" not in resp.answer
        assert svc.spring_gateway_client.execute_prompt.call_count == 1 # NO retries


    @patch("app.api.internal_agent.AgentGraph")
    @pytest.mark.asyncio
    async def test_empty_response_degradation(self, mock_graph_cls):
        """Empty LLM response returns safe message."""
        svc = _mock_rag_service()
        mock_graph = Mock()
        mock_graph_cls.return_value.build.return_value = mock_graph
        mock_graph.invoke.return_value = {
            "mode": "analysis",
            "evidence": [_make_ev("document")],
            "final_request": {"prompt": "test"}
        }
        
        # LLM returns empty
        svc.spring_gateway_client.execute_prompt.return_value = AiExecuteResponse(content="   \n", provider="mock", model="mock")
        
        req = AgentAskRequest(query="analyze this", userId="u1")
        resp = await ask_agent(req, svc)
        
        assert "could not be reliably validated" in resp.answer


    @patch("app.api.internal_agent.AgentGraph")
    @pytest.mark.asyncio
    async def test_streaming_failure_429(self, mock_graph_cls):
        """Streaming endpoint yields error event with 429 status."""
        svc = _mock_rag_service()
        mock_graph = Mock()
        mock_graph_cls.return_value.build.return_value = mock_graph
        mock_graph.stream.return_value = [] # skip internal graph steps
        
        # Mock final state
        initial_state = _base_state()
        initial_state["mode"] = "direct"
        initial_state["final_request"] = {"prompt": "test"}
        mock_graph.stream.return_value = [{"direct_answer": initial_state}]
        
        # LLM streaming raises 429
        def mock_stream(*args, **kwargs):
            raise HTTPException(status_code=429, detail="Exhausted")
            yield "" # to make it a generator
            
        svc.spring_gateway_client.execute_prompt_stream = mock_stream
        
        req = AgentAskRequest(query="test", userId="u1")
        resp = await ask_agent_stream(req, svc)
        
        events = []
        async for chunk in resp.body_iterator:
            events.append(chunk)
            
        # Should have an error event with status 429
        error_events = [e for e in events if "event: error" in e]
        assert len(error_events) == 1
        assert "429" in error_events[0]
        assert "Exhausted" in error_events[0]
