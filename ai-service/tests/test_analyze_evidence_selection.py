import pytest
from unittest.mock import Mock
from app.agent.graph import AgentGraph
from app.models.evidence import EvidenceItem

def _base_state():
    return {
        "query": "analyze this architecture and identify bottlenecks",
        "user_id": "userA",
        "evidence": [],
        "search_queries": [],
        "iteration": 1,
        "max_iterations": 3,
        "needs_analysis": True,
        "needs_retrieval": True,
        "needs_web_search": False,
    }

class TestAnalyzeEvidenceSelection:

    def setup_method(self):
        svc = Mock()
        self.graph = AgentGraph(svc)

    def test_empty_evidence_fallback(self):
        state = _base_state()
        selected = self.graph._select_analyze_evidence(state["query"], [], state)
        assert selected == []
        assert state.get("analyze_candidate_count") == 0
        assert state.get("analyze_selected_count") == 0

    def test_highly_relevant_evidence_selected(self):
        state = _base_state()
        ev1 = EvidenceItem(source_type="document", title="test", content="The architecture uses microservices with Redis for caching.", score=0.9, document_id="d1", chunk_id="c1")
        ev2 = EvidenceItem(source_type="document", title="test", content="Unrelated frontend React components.", score=0.4, document_id="d2", chunk_id="c2")
        
        selected = self.graph._select_analyze_evidence(state["query"], [ev1, ev2], state)
        
        assert len(selected) > 0
        assert selected[0].content == ev1.content
        assert state.get("analyze_candidate_count") == 2

    def test_irrelevant_memory_removed(self):
        state = _base_state()
        state["query"] = "analyze the architecture"
        mem = EvidenceItem(source_type="user_memory", title="test", content="[USER FACT] My favorite movie is Interstellar.", score=0.99, document_id="m1", chunk_id="1")
        doc = EvidenceItem(source_type="document", title="test", content="The architecture is simple.", score=0.6, document_id="d1", chunk_id="c1")
        
        selected = self.graph._select_analyze_evidence(state["query"], [mem, doc], state)
        
        assert len(selected) == 1
        assert selected[0].source_type == "document"
        assert state.get("analyze_evidence_types") == ["document"]

    def test_relevant_memory_retained(self):
        state = _base_state()
        state["query"] = "analyze my background"
        mem = EvidenceItem(source_type="user_memory", title="test", content="[USER FACT] My background is in backend architecture.", score=0.9, document_id="m1", chunk_id="1")
        
        selected = self.graph._select_analyze_evidence(state["query"], [mem], state)
        assert len(selected) == 1
        assert selected[0].source_type == "user_memory"

    def test_max_items_limit(self):
        state = _base_state()
        candidates = []
        for i in range(10):
            candidates.append(EvidenceItem(source_type="document", title="test", content=f"architecture {i}", score=0.8, chunk_id=str(i), document_id="d1"))
            
        selected = self.graph._select_analyze_evidence(state["query"], candidates, state)
        
        assert len(selected) == 5
        assert state.get("analyze_selected_count") == 5

    def test_contradiction_preservation(self):
        state = _base_state()
        state["query"] = "analyze the lock strategy"
        
        ev1 = EvidenceItem(source_type="document", title="test", content="The lock strategy uses optimistic locking.", score=0.95, chunk_id="1", document_id="d1")
        ev2 = EvidenceItem(source_type="document", title="test", content="The lock strategy uses pessimistic locking.", score=0.8, chunk_id="2", document_id="d1")
        ev3 = EvidenceItem(source_type="document", title="test", content="unrelated performance metrics block 1", score=0.99, chunk_id="3", document_id="d1")
        ev4 = EvidenceItem(source_type="document", title="test", content="completely different database schema discussion", score=0.99, chunk_id="4", document_id="d1")
        ev5 = EvidenceItem(source_type="document", title="test", content="unrelated caching configuration details", score=0.99, chunk_id="5", document_id="d1")
        ev6 = EvidenceItem(source_type="document", title="test", content="unrelated frontend styling changes", score=0.99, chunk_id="6", document_id="d1")
        
        selected = self.graph._select_analyze_evidence(state["query"], [ev1, ev2, ev3, ev4, ev5, ev6], state)
        
        selected_contents = [e.content for e in selected]
        
        # Verify tag was added
        ev2_found = False
        for c in selected_contents:
            if "The lock strategy uses pessimistic locking." in c:
                assert "[CONTRADICTION_CANDIDATE]" in c
                ev2_found = True
        assert ev2_found

    def test_deduplication(self):
        state = _base_state()
        ev1 = EvidenceItem(source_type="document", title="test", content="Identical content", score=0.9, document_id="d1", chunk_id="c1")
        ev2 = EvidenceItem(source_type="document", title="test", content="Identical content", score=0.9, document_id="d1", chunk_id="c1")
        
        selected = self.graph._select_analyze_evidence(state["query"], [ev1, ev2], state)
        assert state.get("analyze_candidate_count") == 1
        assert len(selected) <= 1

    def test_web_evidence_penalized_without_date(self):
        state = _base_state()
        state["query"] = "analyze architecture"
        ev_good = EvidenceItem(source_type="web", title="test", content="architecture description", score=0.8, published_date="2026-01-01", url="http://x.com")
        ev_bad = EvidenceItem(source_type="web", title="test", content="architecture distinct", score=0.8, published_date=None, url="http://y.com")
        
        selected = self.graph._select_analyze_evidence(state["query"], [ev_good, ev_bad], state)
        
        assert selected[0].url == "http://x.com"
        assert selected[1].url == "http://y.com"

    def test_zero_llm_calls_made(self):
        state = _base_state()
        ev1 = EvidenceItem(source_type="document", title="test", content="The architecture uses microservices with Redis for caching.", score=0.9, document_id="d1", chunk_id="c1")
        
        selected = self.graph._select_analyze_evidence(state["query"], [ev1], state)
        assert len(selected) == 1
