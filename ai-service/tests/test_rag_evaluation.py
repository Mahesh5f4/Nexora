import pytest
from unittest.mock import Mock, MagicMock
from qdrant_client import QdrantClient
from app.services.chunker import CharacterChunker
from app.services.embedding import EmbeddingService, SentenceTransformerEmbeddingProvider
from app.services.vector_store import QdrantVectorStore
from app.services.rag_service import RAGService
from app.models.ai_execute import AiExecuteResponse

@pytest.fixture
def rag_service():
    qdrant_client = QdrantClient(location=":memory:")
    vector_store = QdrantVectorStore(client=qdrant_client)
    chunker = CharacterChunker(chunk_size=200, chunk_overlap=20)
    provider = SentenceTransformerEmbeddingProvider()
    embedding_service = EmbeddingService(provider=provider)
    spring_gateway_client = Mock()
    
    service = RAGService(
        chunker=chunker,
        embedding_service=embedding_service,
        vector_store=vector_store,
        spring_gateway_client=spring_gateway_client
    )
    
    from qdrant_client.models import VectorParams, Distance
    qdrant_client.create_collection(
        collection_name=service.vector_store._collection_name,
        vectors_config=VectorParams(size=384, distance=Distance.COSINE)
    )
    return service

def test_retrieval_relevance(rag_service):
    """Evaluate Recall@1, Recall@3, Recall@5"""
    user_id = "eval_user"
    
    docs = {
        "docA": "Our payment service uses Redis for distributed locking.",
        "docB": "The notification service uses RabbitMQ for asynchronous processing.",
        "docC": "The application uses MySQL as its primary relational database."
    }
    
    for doc_id, text in docs.items():
        rag_service.index_chunks(doc_id, user_id, text, metadata={"filename": f"{doc_id}.txt"})
        
    queries = [
        ("What technology is used for distributed locking?", "docA"),
        ("What message broker is used?", "docB"),
        ("Which database is used?", "docC"),
    ]
    
    recalls = {1: 0, 3: 0, 5: 0}
    
    for query, expected_doc in queries:
        chunks = rag_service.search_similar(query, user_id, top_k=5)
        retrieved_docs = [chunk.document_id for chunk in chunks]
        
        if expected_doc in retrieved_docs[:1]: recalls[1] += 1
        if expected_doc in retrieved_docs[:3]: recalls[3] += 1
        if expected_doc in retrieved_docs[:5]: recalls[5] += 1
        
    total = len(queries)
    print(f"\nRecall@1: {recalls[1]/total}")
    print(f"Recall@3: {recalls[3]/total}")
    print(f"Recall@5: {recalls[5]/total}")
    
    assert recalls[1] == total # We expect perfect recall on this tiny dataset

def test_answer_grounding(rag_service):
    user_id = "grounding_user"
    rag_service.index_chunks("doc1", user_id, "The backend uses Spring Boot.", metadata={"filename": "tech.txt"})
    
    # Supported Question
    rag_service.spring_gateway_client.execute_prompt = MagicMock(return_value=AiExecuteResponse(
        content="The backend uses Spring Boot.", provider="gemini", model="gemini-1.5-pro"
    ))
    
    res1 = rag_service.retrieve_and_answer("What framework is used?", user_id)
    assert res1.answer == "The backend uses Spring Boot."
    assert len(res1.sources) == 1
    
    # Verify exact prompt built
    prompt = rag_service.spring_gateway_client.execute_prompt.call_args[0][0].prompt
    assert "The backend uses Spring Boot." in prompt
    assert "What framework is used?" in prompt
    assert "--- DOCUMENT EVIDENCE 1 ---" in prompt

def test_unsupported_question(rag_service):
    user_id = "unsupported_user"
    rag_service.index_chunks("doc1", user_id, "The backend uses Spring Boot.", metadata={"filename": "tech.txt"})
    
    rag_service.spring_gateway_client.execute_prompt = MagicMock(return_value=AiExecuteResponse(
        content="The available documents do not contain enough information.", provider="gemini", model="gemini-1.5-pro"
    ))
    
    res = rag_service.retrieve_and_answer("What programming language does the company use?", user_id)
    assert "do not contain enough information" in res.answer

def test_empty_retrieval(rag_service):
    user_id = "empty_user"
    # Do not index anything
    
    res = rag_service.retrieve_and_answer("What is the CEO's name?", user_id)
    assert "I couldn't find relevant information" in res.answer
    assert len(res.sources) == 0
    rag_service.spring_gateway_client.execute_prompt.assert_not_called()

def test_source_consistency(rag_service):
    user_id = "source_user"
    rag_service.index_chunks("doc1", user_id, "Test content.", metadata={"filename": "test.txt"})
    
    rag_service.spring_gateway_client.execute_prompt = MagicMock(return_value=AiExecuteResponse(
        content="Test content.", provider="gemini", model="gemini-1.5-pro"
    ))
    
    res = rag_service.retrieve_and_answer("What is this?", user_id)
    assert len(res.sources) == 1
    assert res.sources[0].filename == "test.txt"
    assert res.sources[0].documentId == "doc1"
    
def test_duplicate_context_handling(rag_service):
    user_id = "dup_user"
    # Index same text twice
    rag_service.index_chunks("doc1", user_id, "Identical content.", metadata={"filename": "test1.txt"})
    rag_service.index_chunks("doc2", user_id, "Identical content.", metadata={"filename": "test2.txt"})
    
    # RAG Service needs to deduplicate based on content
    chunks = rag_service.search_similar("Identical content.", user_id, top_k=5)
    
    # We will implement deduplication logic in rag_service, so chunks should be filtered
    # Wait, currently it returns both. Let's assert that only 1 chunk makes it into the prompt if we deduplicate.
    # We will fix rag_service.py to make this pass.
    # Let's write the assertion assuming it's deduplicated.
    # Wait, if we deduplicate, `retrieve_and_answer` should build a context with only 1 instance.
    rag_service.spring_gateway_client.execute_prompt = MagicMock(return_value=AiExecuteResponse(content="ans", provider="1", model="1"))
    rag_service.retrieve_and_answer("Identical content.", user_id)
    
    prompt = rag_service.spring_gateway_client.execute_prompt.call_args[0][0].prompt
    assert prompt.count("Identical content.") == 2 # 1 in context, 1 in question
