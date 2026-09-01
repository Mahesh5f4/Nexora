import pytest
from unittest.mock import Mock, patch
from app.agent.search_provider import TavilyWebSearchProvider, SearchResult
from app.agent.tools import WebResearchTool
from app.agent.state import AgentState
from app.agent.graph import AgentGraph
from app.services.rag_service import RAGService

def test_tavily_provider_unconfigured():
    provider = TavilyWebSearchProvider(api_key=None)
    with pytest.raises(ValueError, match="missing configuration"):
        provider.search("test")

@patch('app.agent.search_provider.requests.post')
def test_tavily_provider_success(mock_post):
    mock_response = Mock()
    mock_response.json.return_value = {
        "results": [
            {"title": "Title1", "url": "https://example.com/1", "content": "Snippet1", "score": 0.9}
        ]
    }
    mock_post.return_value = mock_response
    
    provider = TavilyWebSearchProvider(api_key="fake-key")
    results = provider.search("test query", max_results=3)
    
    assert len(results) == 1
    assert results[0].title == "Title1"
    assert results[0].url == "https://example.com/1"
    assert results[0].snippet == "Snippet1"
    assert results[0].source == "example.com"
    
    mock_post.assert_called_once()
    args, kwargs = mock_post.call_args
    assert kwargs["json"]["api_key"] == "fake-key"
    assert kwargs["json"]["query"] == "test query"
    assert kwargs["json"]["max_results"] == 3

def test_web_research_tool_validation():
    mock_provider = Mock()
    tool = WebResearchTool(mock_provider, max_results=5).get_tool()
    
    # Test empty query
    res = tool.invoke({"query": "   "})
    assert res == []
    mock_provider.search.assert_not_called()
    
    # Test long query truncation
    long_query = "a" * 300
    tool.invoke({"query": long_query})
    mock_provider.search.assert_called_once_with("a" * 200, 5)

def test_agent_graph_routing_to_web_search():
    # Setup mock RAG service
    rag_service = Mock(spec=RAGService)
    rag_service.prompt_builder = Mock()
    rag_service.prompt_builder.get_system_prompt_for_mode.return_value = "sys"
    rag_service.llm_gateway = Mock()
    
    graph = AgentGraph(rag_service)
    
    state = {"query": "What is the latest news?", "user_id": "1",
             "evidence": [], "search_queries": [], "iteration": 1,
             "max_iterations": 3, "evidence_sufficient": False,
             "evaluation_reason": None, "missing_information": [],
             "answer": None, "needs_retrieval": False, "needs_web_search": False, "mode": ""}
    res = graph.classify_question(state)
    
    assert res["needs_web_search"] is True
    assert res["needs_retrieval"] is False
    assert graph.route_classification(res) == "collect_initial_evidence"
