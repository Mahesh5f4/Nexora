import pytest
import json
import asyncio
from unittest.mock import Mock, patch
from fastapi import HTTPException

from app.agent.graph import AgentGraph
from app.api.internal_agent import ask_agent_stream
from app.models.agent import AgentAskRequest
from app.models.ai_execute import AiExecuteRequest

def _mock_rag_service():
    svc = Mock()
    svc.llm_gateway = Mock()
    return svc

def _base_state():
    return {
        "query": "test query",
        "user_id": "test_user",
        "messages": [],
        "evidence": [],
        "search_queries": [],
        "iteration": 1,
        "max_iterations": 3,
        "needs_analysis": True,
        "needs_retrieval": False,
        "needs_web_search": False,
        "mode": "analysis",
        "final_request": {"prompt": "test"}
    }

@patch("app.api.internal_agent.AgentGraph")
@pytest.mark.asyncio
async def test_streaming_progressive_delivery(mock_graph_cls):
    """Provider emits chunks -> all reach client in order without buffering."""
    svc = _mock_rag_service()
    
    # Mock the internal graph to immediately yield analysis mode
    mock_graph = Mock()
    mock_graph_cls.return_value.build.return_value = mock_graph
    mock_graph.stream.return_value = []
    
    mock_graph.stream.return_value = [{"analyze_evidence": _base_state()}]
    
    # Mock synchronous generator for streaming
    def mock_stream(*args, **kwargs):
        yield "Chunk 1 "
        yield "Chunk 2 "
        yield "Chunk 3"
        
    svc.llm_gateway.execute_prompt_stream = mock_stream
    
    req = AgentAskRequest(query="test", userId="u1")
    resp = await ask_agent_stream(req, svc)
    
    events = []
    async for chunk in resp.body_iterator:
        events.append(chunk)
        
    token_events = [e for e in events if "event: token" in e]
    
    assert len(token_events) == 3
    assert "Chunk 1" in token_events[0]
    assert "Chunk 2" in token_events[1]
    assert "Chunk 3" in token_events[2]

@patch("app.api.internal_agent.AgentGraph")
@pytest.mark.asyncio
async def test_streaming_metadata_after_completion(mock_graph_cls):
    """Validation metadata is emitted after stream completion."""
    svc = _mock_rag_service()
    mock_graph = Mock()
    mock_graph_cls.return_value.build.return_value = mock_graph
    mock_graph.stream.return_value = [{"analyze_evidence": _base_state()}]
    
    def mock_stream(*args, **kwargs):
        yield "Final answer"
        
    svc.llm_gateway.execute_prompt_stream = mock_stream
    
    req = AgentAskRequest(query="test", userId="u1")
    resp = await ask_agent_stream(req, svc)
    
    events = []
    async for chunk in resp.body_iterator:
        events.append(chunk)
        
    # Metadata should be emitted after tokens
    token_idx = -1
    metadata_idx = -1
    for i, e in enumerate(events):
        if "event: token" in e:
            token_idx = i
        if "event: metadata" in e:
            metadata_idx = i
            
    assert metadata_idx > token_idx, "Metadata must come after all tokens"
    
    # Check that metadata contains expected fields
    metadata_json = json.loads(events[metadata_idx].split("data: ")[1].strip())
    assert "validationStatus" in metadata_json
    assert "warnings" in metadata_json
    assert "structureScore" in metadata_json

@patch("app.api.internal_agent.AgentGraph")
@pytest.mark.asyncio
async def test_streaming_safe_validation_abort(mock_graph_cls):
    """Stream-safe validation aborts stream immediately if a fabricated URL is found."""
    svc = _mock_rag_service()
    mock_graph = Mock()
    mock_graph_cls.return_value.build.return_value = mock_graph
    
    state = _base_state()
    # Evidence has NO URLs
    state["evidence"] = []
    
    mock_graph.stream.return_value = [{"analyze_evidence": state}]
    
    def mock_stream(*args, **kwargs):
        yield "Here is the answer. "
        yield "Check this out: "
        yield "https://fabricated-url.com"
        yield " This chunk should NOT be reached."
        
    svc.llm_gateway.execute_prompt_stream = mock_stream
    
    req = AgentAskRequest(query="test", userId="u1")
    resp = await ask_agent_stream(req, svc)
    
    events = []
    async for chunk in resp.body_iterator:
        events.append(chunk)
        
    # Token 1 and 2 are fine, Token 3 triggers validation failure
    token_events = [e for e in events if "event: token" in e]
    assert len(token_events) == 2
    
    error_events = [e for e in events if "event: error" in e]
    assert len(error_events) == 1
    assert "Fabricated source URL" in error_events[0]
