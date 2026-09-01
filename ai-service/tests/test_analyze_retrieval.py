import pytest
from unittest.mock import Mock, patch
from app.agent.graph import AgentGraph
from app.models.evidence import EvidenceItem
from app.agent.state import AgentState

def _mock_rag_service():
    rag_service = Mock()
    rag_service.search_user_memory.return_value = []
    
    prompt_builder = Mock()
    prompt_builder.get_system_prompt_for_mode.return_value = "sys"
    prompt_builder.build_context.return_value = "Mocked Context"
    rag_service.prompt_builder = prompt_builder
    
    return rag_service

def _base_state(query, **overrides):
    q_lower = query.lower()
    state = {
        "query": query,
        "user_id": "userA",
        "evidence": [],
        "search_queries": [],
        "iteration": 1,
        "max_iterations": 3,
        "mode": "ANALYZE",
        "needs_analysis": True,
        "needs_retrieval": bool("document" in q_lower or "pdf" in q_lower or "this" in q_lower or overrides.get("needs_retrieval")),
        "needs_web_search": bool("web" in q_lower or "latest" in q_lower or overrides.get("needs_web_search")),
        "needs_rag": bool("document" in q_lower or "pdf" in q_lower or "this" in q_lower or overrides.get("needs_rag", overrides.get("needs_retrieval", False))),
        "needs_web": bool("web" in q_lower or "latest" in q_lower or overrides.get("needs_web", overrides.get("needs_web_search", False))),
        "needs_memory": bool("my" in q_lower or "me" in q_lower or "prefer" in q_lower or overrides.get("needs_memory", False)),
        "needs_code_retrieval": False
    }
    state.update(overrides)
    return state

class TestAnalyzeRetrievalPolicy:

    def test_analyze_memory_only_when_personal(self):
        # "my architecture" should trigger memory fetch
        svc = _mock_rag_service()
        svc.search_user_memory.return_value = [Mock(content="User likes Java", chunk_id="1", score=0.9)]
        graph = AgentGraph(svc)
        
        state = _base_state("analyze my architecture")
        # Ensure it skips the unconditional fetch
        state = graph.extract_user_memory(state)
        # Verify no memory added yet (since needs_analysis=True)
        assert len(state.get("evidence", [])) == 0
        
        # Verify memory is added in collect_initial_evidence
        state = graph.collect_initial_evidence(state)
        assert state["memory_retrieval_status"] == "SUCCESS"
        assert len(state["evidence"]) == 1
        assert state["evidence"][0].source_type == "user_memory"
        svc.search_user_memory.assert_called_once_with("analyze my architecture", "userA")

    def test_analyze_skips_memory_for_generic_questions(self):
        # "analyze this architecture" has no personal pronouns
        svc = _mock_rag_service()
        graph = AgentGraph(svc)
        
        state = _base_state("analyze this architecture")
        state = graph.extract_user_memory(state)
        state = graph.collect_initial_evidence(state)
        
        assert state["memory_retrieval_status"] == "SKIPPED"
        svc.search_user_memory.assert_not_called()

    def test_analyze_fetches_documents(self):
        # "analyze this document" should fetch documents
        svc = _mock_rag_service()
        graph = AgentGraph(svc)
        
        mock_chunk = EvidenceItem(content="doc content", source_type="document", document_id="d1", chunk_id="c1", score=0.9, title="test.pdf")
        
        state = _base_state("analyze this document")
        
        graph._execute_retrieval = Mock(return_value=[mock_chunk])
        state = graph.collect_initial_evidence(state)
        
        assert state["document_retrieval_status"] == "SUCCESS"
        assert any(e.source_type == "document" for e in state["evidence"])
        graph._execute_retrieval.assert_called_once_with("analyze this document", "userA", 3, None)

    def test_analyze_skips_documents_if_no_references(self):
        svc = _mock_rag_service()
        graph = AgentGraph(svc)
        
        # No "document", "this", "pdf", etc.
        state = _base_state("evaluate the pros and cons")
        
        graph._execute_retrieval = Mock()
        state = graph.collect_initial_evidence(state)
        
        assert state["document_retrieval_status"] == "SKIPPED"
        graph._execute_retrieval.assert_not_called()

    def test_analyze_web_search_only_when_explicit(self):
        svc = _mock_rag_service()
        graph = AgentGraph(svc)
        
        mock_web_res = EvidenceItem(source_type="web", title="Web", url="http://x.com", content="web content", source_domain="x.com", score=0.9, published_date="2026")
        
        graph._execute_web_search = Mock(return_value=[mock_web_res])
        # needs_web_search = False
        state = _base_state("analyze this architecture")
        state = graph.collect_initial_evidence(state)
        assert state["web_retrieval_status"] == "SKIPPED"
        graph._execute_web_search.assert_not_called()
        
        # needs_web_search = True
        state = _base_state("analyze this architecture", needs_web_search=True)
        state = graph.collect_initial_evidence(state)
        assert state["web_retrieval_status"] == "SUCCESS"
        assert any(e.source_type == "web" for e in state["evidence"])

    def test_error_handling_resilience(self):
        svc = _mock_rag_service()
        graph = AgentGraph(svc)
        
        # Force exceptions
        svc.search_user_memory.side_effect = Exception("Qdrant down")
        
        graph._execute_retrieval = Mock(side_effect=Exception("Qdrant down"))
        state = _base_state("analyze my document")
        state = graph.collect_initial_evidence(state)
        
        assert state["memory_retrieval_status"] == "NO_RESULTS"  # _execute_memory catches and returns empty list
        assert state["document_retrieval_status"] == "FAILED"
        assert len(state["evidence"]) == 0  # Should not crash

    def test_user_isolation(self):
        # User A cannot retrieve User B's memory/documents
        svc = _mock_rag_service()
        graph = AgentGraph(svc)
        
        graph._execute_retrieval = Mock(return_value=[])
        state = _base_state("analyze my document", user_id="userA")
        graph.collect_initial_evidence(state)
        
        svc.search_user_memory.assert_called_once_with("analyze my document", "userA")

    def test_evidence_combination_and_deduplication(self):
        # All three sources combined
        svc = _mock_rag_service()
        svc.search_user_memory.return_value = [Mock(content="duplicate info", chunk_id="m1", score=0.9)]
        
        graph = AgentGraph(svc)
        
        mock_chunk = EvidenceItem(content="duplicate info", source_type="document", document_id="d1", chunk_id="c1", score=0.9, title="test.pdf")
        
        mock_web_res = EvidenceItem(source_type="web", title="Web", url="http://x.com", content="duplicate info", source_domain="x.com", score=0.9, published_date="2026")
        
        graph._execute_retrieval = Mock(return_value=[mock_chunk])
        graph._execute_web_search = Mock(return_value=[mock_web_res])
        state = _base_state("analyze my document", needs_web_search=True)
        state = graph.collect_initial_evidence(state)
        
        assert len(state["evidence"]) == 2  # Deduplicated: doc & web merge into 1, plus 1 memory (which has [USER FACT] prefix)
        
    def test_provenance_preservation(self):
        svc = _mock_rag_service()
        svc.search_user_memory.return_value = [Mock(content="mem content", chunk_id="m1", score=0.9)]
        
        graph = AgentGraph(svc)
        
        mock_chunk = EvidenceItem(content="doc content", source_type="document", document_id="d1", chunk_id="c1", score=0.9, title="test.pdf")
        
        mock_web_res = EvidenceItem(source_type="web", title="Web", url="http://x.com", content="web content", source_domain="x.com", score=0.9, published_date="2026")
        
        graph._execute_retrieval = Mock(return_value=[mock_chunk])
        graph._execute_web_search = Mock(return_value=[mock_web_res])
        state = _base_state("analyze my document", needs_web_search=True)
        state = graph.collect_initial_evidence(state)
        
        assert len(state["evidence"]) == 3
        
        ev_mem = next(e for e in state["evidence"] if e.source_type == "user_memory")
        assert ev_mem.document_id == "user_profile_memory"
        
        ev_doc = next(e for e in state["evidence"] if e.source_type == "document")
        assert ev_doc.title == "test.pdf"
        assert ev_doc.document_id == "d1"
        
        ev_web = next(e for e in state["evidence"] if e.source_type == "web")
        assert ev_web.url == "http://x.com"
        assert ev_web.published_date == "2026"
