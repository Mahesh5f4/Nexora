import pytest
from unittest.mock import MagicMock
from app.agent.graph import AgentGraph
from app.agent.state import AgentState
from app.models.ai_execute import AiExecuteResponse

@pytest.fixture
def agent_graph():
    rag_service = MagicMock()
    llm_gateway = MagicMock()
    rag_service.llm_gateway = llm_gateway
    
    graph = AgentGraph(rag_service)
    return graph, rag_service, llm_gateway

def test_deterministic_framework(agent_graph):
    graph, rag, gateway = agent_graph
    state = AgentState(query="My favorite framework is Spring Boot.", user_id="u1")
    
    new_state = graph.extract_user_memory(state)
    
    assert new_state["memory_status"] == "SAVED"
    rag.add_user_memory.assert_called_once_with("u1", "User's favorite framework is Spring Boot.")
    gateway.execute_prompt.assert_not_called()

def test_deterministic_language(agent_graph):
    graph, rag, gateway = agent_graph
    state = AgentState(query="My favorite programming language is Java.", user_id="u1")
    
    new_state = graph.extract_user_memory(state)
    
    assert new_state["memory_status"] == "SAVED"
    rag.add_user_memory.assert_called_once_with("u1", "User's favorite programming language is Java.")
    gateway.execute_prompt.assert_not_called()

def test_deterministic_database(agent_graph):
    graph, rag, gateway = agent_graph
    state = AgentState(query="My preferred database is PostgreSQL.", user_id="u1")
    
    new_state = graph.extract_user_memory(state)
    
    assert new_state["memory_status"] == "SAVED"
    rag.add_user_memory.assert_called_once_with("u1", "User's favorite database is PostgreSQL.")
    gateway.execute_prompt.assert_not_called()

def test_deterministic_prefer(agent_graph):
    graph, rag, gateway = agent_graph
    state = AgentState(query="I prefer Spring Boot.", user_id="u1")
    
    new_state = graph.extract_user_memory(state)
    
    assert new_state["memory_status"] == "SAVED"
    rag.add_user_memory.assert_called_once_with("u1", "User explicitly stated: I prefer Spring Boot")
    gateway.execute_prompt.assert_not_called()

def test_no_inference(agent_graph):
    graph, rag, gateway = agent_graph
    state = AgentState(query="Spring Boot is a Java framework.", user_id="u1")
    
    new_state = graph.extract_user_memory(state)
    
    assert new_state["memory_status"] == "SKIPPED"
    rag.add_user_memory.assert_not_called()
    gateway.execute_prompt.assert_not_called()

def test_no_memory_creation_question(agent_graph):
    graph, rag, gateway = agent_graph
    state = AgentState(query="What framework should I learn?", user_id="u1")
    
    gateway.execute_prompt.return_value = AiExecuteResponse(content="NONE", provider="test", model="test")
    new_state = graph.extract_user_memory(state)
    
    assert new_state["memory_status"] == "SKIPPED"
    rag.add_user_memory.assert_not_called()
    gateway.execute_prompt.assert_called_once()

def test_unrelated_message(agent_graph):
    graph, rag, gateway = agent_graph
    state = AgentState(query="This is a test message.", user_id="u1")
    
    new_state = graph.extract_user_memory(state)
    
    assert new_state["memory_status"] == "SKIPPED"
    rag.add_user_memory.assert_not_called()
    gateway.execute_prompt.assert_not_called()

def test_ambiguous_fact(agent_graph):
    graph, rag, gateway = agent_graph
    state = AgentState(query="I just visited Paris.", user_id="u1")
    
    gateway.execute_prompt.return_value = AiExecuteResponse(content="User visited Paris", provider="test", model="test")
    new_state = graph.extract_user_memory(state)
    
    assert new_state["memory_status"] == "SAVED"
    rag.add_user_memory.assert_called_once_with("u1", "User visited Paris")
    gateway.execute_prompt.assert_called_once()

def test_llm_429_handling(agent_graph):
    graph, rag, gateway = agent_graph
    state = AgentState(query="I just visited Paris.", user_id="u1")
    
    gateway.execute_prompt.side_effect = Exception("HTTP 429 Too Many Requests")
    new_state = graph.extract_user_memory(state)
    
    assert new_state["memory_status"] == "LLM_UNAVAILABLE"
    rag.add_user_memory.assert_not_called()

def test_llm_503_handling(agent_graph):
    graph, rag, gateway = agent_graph
    state = AgentState(query="I just visited Paris.", user_id="u1")
    
    gateway.execute_prompt.side_effect = Exception("503 Service Unavailable")
    new_state = graph.extract_user_memory(state)
    
    assert new_state["memory_status"] == "LLM_UNAVAILABLE"
    rag.add_user_memory.assert_not_called()

def test_qdrant_failure(agent_graph):
    graph, rag, gateway = agent_graph
    state = AgentState(query="My favorite framework is Spring Boot.", user_id="u1")
    
    rag.add_user_memory.side_effect = Exception("Connection refused")
    new_state = graph.extract_user_memory(state)
    
    assert new_state["memory_status"] == "FAILED"
    gateway.execute_prompt.assert_not_called()
