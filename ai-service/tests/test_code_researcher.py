import pytest
from unittest.mock import MagicMock
from app.services.code_retrieval import CodeRetrievalService, LocalRepositorySource, CodeSearchResult
from app.agent.graph import AgentGraph

def test_local_repository_source_should_ignore():
    repo = LocalRepositorySource("/fake")
    assert repo._should_ignore_dir("node_modules") is True
    assert repo._should_ignore_dir(".git") is True
    assert repo._should_ignore_dir("src") is False
    
    assert repo._should_ignore_file("image.png") is True
    assert repo._should_ignore_file("app.py") is False

def test_code_retrieval_service_extracts_terms():
    repo = LocalRepositorySource("/fake")
    service = CodeRetrievalService(repo)
    
    terms = service._extract_query_terms("Explain how authentication works in my project.")
    # Should exclude 'explain', 'how', 'in', 'my', 'project'
    assert "authentication" in terms
    assert "works" in terms
    assert "explain" not in terms

def test_code_retrieval_service_retrieve_relevant_code():
    repo = MagicMock()
    repo.search_code.return_value = [
        CodeSearchResult(
            repository="test-repo",
            file_path="src/Auth.java",
            symbol="public class Auth",
            line_range="10-40",
            content="public class Auth { }",
            score=5.0
        )
    ]
    
    service = CodeRetrievalService(repo)
    result = service.retrieve_relevant_code("Where is authentication?")
    
    assert result["status"] == "success"
    assert result["candidates_found"] == 1
    assert result["candidates_selected"] == 1
    assert result["evidence"][0].file_path == "src/Auth.java"

@pytest.mark.asyncio
async def test_agent_graph_code_retrieval_integration():
    rag_service = MagicMock()
    rag_service.prompt_builder.get_system_prompt_for_mode.return_value = "System"
    
    graph = AgentGraph(rag_service)
    
    # Mock the internal code retrieval service
    graph.code_retrieval_service = MagicMock()
    graph.code_retrieval_service.retrieve_relevant_code.return_value = {
        "status": "success",
        "error": None,
        "candidates_found": 1,
        "candidates_selected": 1,
        "evidence": [
            CodeSearchResult(
                repository="local-repo",
                file_path="main.py",
                symbol="def main()",
                line_range="1-10",
                content="def main(): pass",
                score=10.0
            )
        ]
    }
    
    evidence = graph._execute_code_retrieval("Find main function")
    assert len(evidence) == 1
    assert evidence[0].source_type == "code"
    assert "main.py" in evidence[0].title
    assert "local-repo" == evidence[0].document_id
