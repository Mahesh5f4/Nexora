import pytest
from unittest.mock import Mock, patch
from app.agent.state import AgentState
from app.agent.graph import AgentGraph
from app.services.rag_service import RAGService
from app.services.rag_prompt_builder import RagPromptBuilder
from app.models.evidence import EvidenceItem

@pytest.fixture
def mock_rag_service():
    service = Mock(spec=RAGService)
    service.prompt_builder = RagPromptBuilder()
    service.spring_gateway_client = Mock()
    return service

@pytest.fixture
def agent_graph(mock_rag_service):
    # Mock settings.tavily_api_key in search_provider via patch?
    # Actually, we can just patch TavilyWebSearchProvider in AgentGraph initialization.
    with patch('app.agent.graph.TavilyWebSearchProvider'):
        return AgentGraph(mock_rag_service)

def _base_state() -> AgentState:
    return {
        "user_id": "test_user",
        "query": "",
        "search_queries": [],
        "evidence": [],
        "iteration": 0,
        "max_iterations": 3,
        "mode": "unknown",
        "answer": ""
    }

class TestAnalyzeGeneration:
    def test_analyze_generation_flow(self, agent_graph):
        """Test that analyze generation produces exactly one correct LLM request with specific maxTokens."""
        state = _base_state()
        state["query"] = "analyze the architecture"
        state["needs_analysis"] = True
        
        # Give it some evidence
        ev = EvidenceItem(
            source_type="document",
            title="Arch Doc",
            content="The architecture is microservices based.",
            score=0.9,
            chunk_id="1",
            document_id="doc1"
        )
        state["evidence"] = [ev]
        
        # Run analyze_evidence
        new_state = agent_graph.analyze_evidence(state)
        
        # Verify mode is analysis
        assert new_state["mode"] == "analysis"
        
        # Verify final_request exists
        assert "final_request" in new_state
        req = new_state["final_request"]
        
        # Verify parameters
        assert "maxTokens" not in req, "Analyze should not have an arbitrary final-answer cap"
        assert req["temperature"] == 0.3
        
        # Verify system prompt
        assert agent_graph.prompt_builder.ANALYSIS_SYSTEM_PROMPT in req["systemPrompt"]
        
        # Verify user prompt structure
        assert "--- ANALYSIS REQUEST ---" in req["prompt"]
        assert "analyze the architecture" in req["prompt"]
        assert "REASONING WORKFLOW" in req["prompt"]
        assert "OUTPUT STRUCTURE" in req["prompt"]
        assert "The architecture is microservices based." in req["prompt"]

    def test_empty_evidence_handling(self, agent_graph):
        """Test safe fallback behavior when no evidence is found."""
        state = _base_state()
        state["query"] = "analyze the architecture"
        state["needs_analysis"] = True
        state["evidence"] = []  # Empty
        
        new_state = agent_graph.analyze_evidence(state)
        req = new_state["final_request"]
        
        # Must include the insufficient evidence hint
        assert "No evidence was provided." in req["prompt"]
        assert "Mark all claims as [UNCERTAINTY]." in req["prompt"]

    def test_contradiction_candidate_passed_through(self, agent_graph):
        """Test that contradiction candidate tag is not stripped and is passed to the LLM."""
        state = _base_state()
        state["query"] = "analyze the lock strategy"
        state["needs_analysis"] = True
        
        ev1 = EvidenceItem(
            source_type="document",
            title="doc 1",
            content="[CONTRADICTION_CANDIDATE] uses optimistic locking",
            score=0.95,
            chunk_id="1",
            document_id="doc1"
        )
        state["evidence"] = [ev1]
        
        new_state = agent_graph.analyze_evidence(state)
        req = new_state["final_request"]
        
        assert "[CONTRADICTION_CANDIDATE]" in req["prompt"]
        
    def test_analyze_no_llm_or_retrieval_calls_during_generation(self, agent_graph):
        """Analyze generation itself should strictly only format the prompt and NOT call retrieval or LLM."""
        state = _base_state()
        state["query"] = "analyze the architecture"
        state["needs_analysis"] = True
        
        with patch.object(agent_graph.spring_gateway_client, 'execute_prompt') as mock_llm:
            with patch.object(agent_graph, '_execute_retrieval') as mock_retrieval:
                with patch.object(agent_graph, '_execute_web_search') as mock_web:
                    agent_graph.analyze_evidence(state)
                    
                    # Should not call LLM inside this node (it creates final_request instead)
                    assert not mock_llm.called
                    
                    # Should not perform any extra retrieval
                    assert not mock_retrieval.called
                    assert not mock_web.called
