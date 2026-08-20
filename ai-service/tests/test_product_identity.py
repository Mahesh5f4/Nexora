import pytest
from unittest.mock import MagicMock
from app.agent.graph import AgentGraph

def test_classify_question_product_identity_positive():
    rag_service = MagicMock()
    graph = AgentGraph(rag_service)
    
    queries = [
        "who created you?",
        "who built you",
        "who developed you",
        "Who is your founder?",
        "who created ThinkAction?",
        "who built thinkaction AI",
        "who developed thinkaction?"
    ]
    
    for query in queries:
        state = {"query": query, "user_id": "test", "mode": "CHAT"}
        result = graph.classify_question(state)
        
        assert result["needs_product_identity"] is True, f"Failed on: {query}"
        assert result["needs_rag"] is True
        assert result["needs_web"] is False
        assert result["needs_memory"] is False
        assert result["needs_code_retrieval"] is False
        assert result["needs_multi_source"] is False

def test_classify_question_product_identity_negative():
    rag_service = MagicMock()
    graph = AgentGraph(rag_service)
    
    queries = [
        "What is dependency injection?",
        "Tell me a joke.",
        "What is Redis?",
        "Who created React?",
        "What is ThinkAction AI?",
        "Who are you?",
        "How were you built?"
    ]
    
    for query in queries:
        state = {"query": query, "user_id": "test", "mode": "CHAT"}
        result = graph.classify_question(state)
        
        assert result.get("needs_product_identity") is False, f"Failed on: {query}"

@pytest.mark.asyncio
async def test_product_identity_retrieval_limits():
    rag_service = MagicMock()
    graph = AgentGraph(rag_service)
    graph._execute_retrieval = MagicMock(return_value=[])
    graph._execute_memory_retrieval = MagicMock()
    graph._execute_web_search = MagicMock()
    graph._execute_code_retrieval = MagicMock()

    state = {
        "query": "who created you?", 
        "user_id": "test",
        "needs_product_identity": True,
        "needs_rag": True,
        "needs_web": False,
        "needs_memory": False,
        "needs_code_retrieval": False
    }
    
    result = graph.collect_initial_evidence(state)
    
    graph._execute_retrieval.assert_called_once_with("who created you?", "test", 1)
    graph._execute_memory_retrieval.assert_not_called()
    graph._execute_web_search.assert_not_called()
    graph._execute_code_retrieval.assert_not_called()
