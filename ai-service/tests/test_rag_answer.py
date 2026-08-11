import pytest
from unittest.mock import Mock, MagicMock
from app.services.rag_service import RAGService
from app.services.vector_store import RetrievedChunk
from app.models.ai_execute import AiExecuteResponse
from app.models.rag_answer import RagAnswerResponse

def test_retrieve_and_answer_success():
    chunker = Mock()
    embedding_service = Mock()
    vector_store = Mock()
    spring_gateway_client = Mock()
    
    rag_service = RAGService(
        chunker=chunker,
        embedding_service=embedding_service,
        vector_store=vector_store,
        spring_gateway_client=spring_gateway_client
    )
    
    # Mock retrieval
    rag_service.search_similar = MagicMock(return_value=[
        RetrievedChunk(document_id="doc1", chunk_id="chunk1", content="Spring Boot is used for the backend.", score=0.9, metadata={"filename": "tech.txt"})
    ])
    
    # Mock LLM call
    spring_gateway_client.execute_prompt = MagicMock(return_value=AiExecuteResponse(
        content="The backend uses Spring Boot.",
        provider="gemini",
        model="gemini-1.5-pro"
    ))
    
    response = rag_service.retrieve_and_answer("What is the backend?", "user1", top_k=5)
    
    assert isinstance(response, RagAnswerResponse)
    assert response.answer == "The backend uses Spring Boot."
    assert len(response.sources) == 1
    assert response.sources[0].documentId == "doc1"
    assert response.sources[0].filename == "tech.txt"
    
    # Verify the prompt sent to Spring Gateway
    call_args = spring_gateway_client.execute_prompt.call_args[0][0]
    assert "Spring Boot is used for the backend." in call_args.prompt
    assert "What is the backend?" in call_args.prompt
    assert call_args.temperature == 0.2

def test_retrieve_and_answer_empty_retrieval():
    chunker = Mock()
    embedding_service = Mock()
    vector_store = Mock()
    spring_gateway_client = Mock()
    
    rag_service = RAGService(
        chunker=chunker,
        embedding_service=embedding_service,
        vector_store=vector_store,
        spring_gateway_client=spring_gateway_client
    )
    
    # Mock empty retrieval
    rag_service.search_similar = MagicMock(return_value=[])
    
    response = rag_service.retrieve_and_answer("What is the backend?", "user1", top_k=5)
    
    # LLM should not be called
    spring_gateway_client.execute_prompt.assert_not_called()
    
    assert response.answer == "I couldn't find relevant information in your documents to answer this question."
    assert len(response.sources) == 0
