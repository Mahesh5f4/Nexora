import pytest
from unittest.mock import Mock
from app.agent.tools import DocumentRetrievalTool
from app.services.rag_service import RAGService
from app.services.vector_store import RetrievedChunk

def test_document_retrieval_tool():
    rag_service = Mock(spec=RAGService)
    rag_service.search_similar.return_value = [
        RetrievedChunk(document_id="d1", chunk_id="c1", content="chunk content", score=0.9, metadata={})
    ]
    
    tool = DocumentRetrievalTool(rag_service).get_tool()
    
    result = tool.invoke({"query": "test query", "user_id": "test_user_1", "top_k": 3})
    
    rag_service.search_similar.assert_called_once_with("test query", "test_user_1", 3)
    assert len(result) == 1
    assert result[0].document_id == "d1"
