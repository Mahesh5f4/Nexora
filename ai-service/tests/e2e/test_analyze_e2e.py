import pytest
import json
import httpx
from unittest.mock import patch, Mock
from fastapi import HTTPException
from app.main import app
from app.models.ai_execute import AiExecuteResponse
from app.services.vector_store import RetrievedChunk
from app.api.auth_middleware import verify_internal_token
from app.agent.search_provider import SearchResult

app.dependency_overrides[verify_internal_token] = lambda: None

def mock_llm_response(content: str):
    return AiExecuteResponse(content=content, provider="mock", model="mock")

def mock_exec_side_effect(analysis_text="Analysis:\n\nOK\n\n# Recommendations\nOK"):
    def side_effect(ai_request, *args, **kwargs):
        if "evaluator" in ai_request.systemPrompt.lower():
            return mock_llm_response('{"sufficient": true, "reason": "OK", "missing_information": []}')
        return mock_llm_response(analysis_text)
    return side_effect

def mock_search_similar_side_effect(doc_content="Valid data", doc_filename="doc"):
    def side_effect(query, user_id, top_k=5, document_id=None):
        if document_id == "user_profile_memory":
            return []
        return [mock_doc_chunk(doc_content, doc_filename)]
    return side_effect

import uuid

def mock_doc_chunk(content: str, title: str = "doc"):
    padded_content = content + (" padding " * 20)
    return RetrievedChunk(document_id=f"d1_{uuid.uuid4()}", chunk_id=f"c1_{uuid.uuid4()}", content=padded_content, score=0.9, metadata={"filename": title})

def mock_mem_chunk(content: str):
    return RetrievedChunk(document_id="m1", chunk_id="c1", content=content, score=1.0, metadata={"filename": "Memory"})

def mock_web_result(content: str):
    padded_content = content + (" padding " * 20)
    return SearchResult(title="Web", url="http://web.com", snippet=padded_content, source="web", score=0.9, published_date="2026-08-15")

@pytest.mark.asyncio
async def test_01_basic_analysis():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        with patch("app.clients.spring_gateway_client.SpringAiGatewayClient.execute_prompt") as mock_exec:
            mock_exec.side_effect = mock_exec_side_effect("Analysis:\n\n1. Lock contention.\n\n# Recommendations\nFix it.")
            payload = {"query": "Analyze the root cause of this problem: Redis seat locking sometimes returns HTTP 409 during concurrent bookings.", "userId": "test_e2e_user"}
            response = await client.post("/internal/agent/ask", json=payload)
            assert response.status_code == 200
            data = response.json()
            assert "Analysis:" in data["answer"]
            assert data["mode"] == "analysis"

@pytest.mark.asyncio
async def test_02_document_analysis():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        with patch("app.clients.spring_gateway_client.SpringAiGatewayClient.execute_prompt") as mock_exec:
            with patch("app.services.rag_service.RAGService.search_similar") as mock_search:
                mock_search.side_effect = mock_search_similar_side_effect("Architecture is slow.", "arch.pdf")
                mock_exec.side_effect = mock_exec_side_effect("Analysis:\n\n1. The architecture is slow.\n\n# Recommendations\nSpeed it up.")
                payload = {"query": "Analyze the architecture described in this document and identify the three biggest bottlenecks.", "userId": "test_e2e_user"}
                response = await client.post("/internal/agent/ask", json=payload)
                assert response.status_code == 200
                data = response.json()
                assert data["mode"] == "analysis"
                assert len(data.get("sources", [])) > 0
                assert data["sources"][0]["filename"] == "arch.pdf"

@pytest.mark.asyncio
async def test_03_memory_assisted_analysis():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        with patch("app.clients.spring_gateway_client.SpringAiGatewayClient.execute_prompt") as mock_exec:
            with patch("app.services.rag_service.RAGService.search_user_memory") as mock_mem:
                mock_mem.return_value = [mock_mem_chunk("My preferred backend framework is Spring Boot.")]
                mock_exec.side_effect = mock_exec_side_effect("Analysis:\n\nBased on your preference for Spring Boot, use Java.\n\n# Recommendations\nUse Java.")
                payload = {"query": "Analyze which backend technology would best fit my preferences.", "userId": "test_e2e_user"}
                response = await client.post("/internal/agent/ask", json=payload)
                assert response.status_code == 200
                data = response.json()
                assert data["mode"] == "analysis"
                assert any(e["filename"] == "User Profile Memory" for e in data.get("sources", []))

@pytest.mark.asyncio
async def test_04_user_isolation():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        with patch("app.clients.spring_gateway_client.SpringAiGatewayClient.execute_prompt") as mock_exec:
            with patch("app.services.rag_service.RAGService.search_user_memory") as mock_mem:
                def mock_search_mem(query, user_id, **kwargs):
                    if user_id == "UserA":
                        return [mock_mem_chunk("My preferred backend framework is Spring Boot.")]
                    elif user_id == "UserB":
                        return [mock_mem_chunk("My preferred backend framework is Django.")]
                    return []
                mock_mem.side_effect = mock_search_mem
                mock_exec.side_effect = mock_exec_side_effect("Analysis:\n\nValid.\n\n# Recommendations\nValid.")
                res_a = await client.post("/internal/agent/ask", json={"query": "Analyze my backend preference.", "userId": "UserA"})
                res_b = await client.post("/internal/agent/ask", json={"query": "Analyze my backend preference.", "userId": "UserB"})
                assert "Valid" in res_a.json().get("answer", "")
                assert any(e["filename"] == "User Profile Memory" for e in res_a.json().get("sources", []))

@pytest.mark.asyncio
async def test_05_web_assisted_analysis():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        with patch("app.clients.spring_gateway_client.SpringAiGatewayClient.execute_prompt") as mock_exec:
            with patch("app.agent.search_provider.TavilyWebSearchProvider.search") as mock_web:
                mock_web.return_value = [mock_web_result("AI Agents 2026")]
                mock_exec.side_effect = mock_exec_side_effect("Analysis:\n\nAI agents are great.\n\n# Recommendations\nUse them.")
                payload = {"query": "Analyze the latest developments in AI agents", "userId": "u1", "forceWebSearch": True}
                response = await client.post("/internal/agent/ask", json=payload)
                assert response.status_code == 200
                assert any(e.get("chunkId") == "web" for e in response.json().get("sources", []))

@pytest.mark.asyncio
async def test_06_no_evidence():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        with patch("app.services.rag_service.RAGService.search_similar", return_value=[]):
            with patch("app.services.rag_service.RAGService.search_user_memory", return_value=[]):
                with patch("app.clients.spring_gateway_client.SpringAiGatewayClient.execute_prompt") as mock_exec:
                    mock_exec.side_effect = mock_exec_side_effect("Analysis:\n\nOK\n\n# Recommendations\nOK")
                    payload = {"query": "Analyze the proprietary architecture of Company XYZ's internal system.", "userId": "fresh_user"}
                    response = await client.post("/internal/agent/ask", json=payload)
                    assert response.status_code == 200
                    data = response.json()
                    assert data["mode"] == "unsupported"
                    assert "couldn't find enough reliable evidence" in data["answer"]

@pytest.mark.asyncio
async def test_07_irrelevant_evidence():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        with patch("app.services.rag_service.RAGService.search_similar") as mock_search:
            def side_effect(query, user_id, top_k=5, document_id=None):
                if document_id == "user_profile_memory": return []
                return [RetrievedChunk(document_id="d1", chunk_id="c1", content="Spring Boot.", score=0.1, metadata={"filename": "Spring"})]
            mock_search.side_effect = side_effect
            payload = {"query": "Analyze the authentication security model.", "userId": "u1"}
            response = await client.post("/internal/agent/ask", json=payload)
            assert response.json()["mode"] == "unsupported"

@pytest.mark.asyncio
async def test_08_contradictory_evidence():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        with patch("app.clients.spring_gateway_client.SpringAiGatewayClient.execute_prompt") as mock_exec:
            with patch("app.services.rag_service.RAGService.search_similar") as mock_search:
                def side_effect(query, user_id, top_k=5, document_id=None):
                    if document_id == "user_profile_memory": return []
                    return [
                        mock_doc_chunk("The booking service uses optimistic locking.", "A"),
                        mock_doc_chunk("The booking service uses pessimistic locking.", "B")
                    ]
                mock_search.side_effect = side_effect
                mock_exec.side_effect = mock_exec_side_effect("Analysis:\n\nThere is a conflict regarding locking.\n\n# Recommendations\nCheck.")
                payload = {"query": "Analyze the locking strategy in this document.", "userId": "u1"}
                response = await client.post("/internal/agent/ask", json=payload)
                assert response.status_code == 200
                data = response.json()
                assert len(data.get("sources", [])) >= 2
                assert data["mode"] == "analysis"

@pytest.mark.asyncio
async def test_09_fabricated_url():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        with patch("app.clients.spring_gateway_client.SpringAiGatewayClient.execute_prompt") as mock_exec:
            with patch("app.services.rag_service.RAGService.search_similar") as mock_search:
                mock_search.side_effect = mock_search_similar_side_effect("Valid data")
                mock_exec.side_effect = mock_exec_side_effect("Analysis:\n\nSee https://fake-example.com/not-in-evidence\n\n# Recommendations\nYes.")
                payload = {"query": "Analyze this in the document.", "userId": "u1"}
                response = await client.post("/internal/agent/ask", json=payload)
                assert response.status_code == 200
                assert "could not be reliably validated" in response.json()["answer"]
                assert "fake-example.com" not in response.json()["answer"]

@pytest.mark.asyncio
async def test_10_fabricated_date():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        with patch("app.clients.spring_gateway_client.SpringAiGatewayClient.execute_prompt") as mock_exec:
            with patch("app.services.rag_service.RAGService.search_similar") as mock_search:
                mock_search.side_effect = mock_search_similar_side_effect("Valid data")
                mock_exec.side_effect = mock_exec_side_effect("Analysis:\n\nPublished on August 15, 2026.\n\n# Recommendations\nYes.")
                payload = {"query": "Analyze this in the document.", "userId": "u1"}
                response = await client.post("/internal/agent/ask", json=payload)
                assert "could not be reliably validated" in response.json()["answer"]

@pytest.mark.asyncio
async def test_12_provider_503():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        with patch("app.clients.spring_gateway_client.SpringAiGatewayClient.execute_prompt") as mock_exec:
            def side_effect(ai_request, *args, **kwargs):
                if "evaluator" in ai_request.systemPrompt.lower():
                    return mock_llm_response('{"sufficient": true, "reason": "OK", "missing_information": []}')
                raise HTTPException(status_code=503, detail="Unavailable")
            mock_exec.side_effect = side_effect
            with patch("app.services.rag_service.RAGService.search_similar") as mock_search:
                mock_search.side_effect = mock_search_similar_side_effect("Valid data")
                payload = {"query": "Analyze this in the document.", "userId": "u1"}
                response = await client.post("/internal/agent/ask", json=payload)
                assert response.status_code == 503

@pytest.mark.asyncio
async def test_13_qdrant_failure():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        with patch("app.services.rag_service.RAGService.search_similar") as mock_doc:
            mock_doc.side_effect = Exception("Qdrant down")
            with patch("app.services.rag_service.RAGService.search_user_memory") as mock_mem:
                mock_mem.return_value = [mock_mem_chunk("My valid data")]
                with patch("app.clients.spring_gateway_client.SpringAiGatewayClient.execute_prompt") as mock_exec:
                    mock_exec.side_effect = mock_exec_side_effect("Analysis:\n\nOK\n\n# Recommendations\nOK")
                    payload = {"query": "Analyze my test.", "userId": "u1"}
                    response = await client.post("/internal/agent/ask", json=payload)
                    assert response.status_code == 200
                    assert response.json()["mode"] == "analysis"

@pytest.mark.asyncio
async def test_14_web_failure():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        with patch("app.agent.search_provider.TavilyWebSearchProvider.search") as mock_web:
            mock_web.side_effect = Exception("Tavily down")
            with patch("app.services.rag_service.RAGService.search_similar") as mock_doc:
                mock_doc.side_effect = mock_search_similar_side_effect("Valid data")
                with patch("app.clients.spring_gateway_client.SpringAiGatewayClient.execute_prompt") as mock_exec:
                    mock_exec.side_effect = mock_exec_side_effect("Analysis:\n\nOK\n\n# Recommendations\nOK")
                    payload = {"query": "Analyze the performance in the document.", "userId": "u1", "forceWebSearch": True}
                    response = await client.post("/internal/agent/ask", json=payload)
                    assert response.status_code == 200
                    assert response.json()["mode"] == "analysis"

@pytest.mark.asyncio
async def test_15_memory_failure():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        with patch("app.services.rag_service.RAGService.search_user_memory") as mock_mem:
            mock_mem.side_effect = Exception("Redis down")
            with patch("app.services.rag_service.RAGService.search_similar") as mock_doc:
                mock_doc.side_effect = mock_search_similar_side_effect("Valid data")
                with patch("app.clients.spring_gateway_client.SpringAiGatewayClient.execute_prompt") as mock_exec:
                    mock_exec.side_effect = mock_exec_side_effect("Analysis:\n\nOK\n\n# Recommendations\nOK")
                    payload = {"query": "Analyze my performance in the document.", "userId": "u1"}
                    response = await client.post("/internal/agent/ask", json=payload)
                    assert response.status_code == 200
                    assert response.json()["mode"] == "analysis"

@pytest.mark.asyncio
async def test_16_empty_llm_response():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        with patch("app.clients.spring_gateway_client.SpringAiGatewayClient.execute_prompt") as mock_exec:
            mock_exec.side_effect = mock_exec_side_effect("   \n")
            with patch("app.services.rag_service.RAGService.search_similar") as mock_search:
                mock_search.return_value = [mock_doc_chunk("Valid data")]
                payload = {"query": "Analyze this.", "userId": "u1"}
                response = await client.post("/internal/agent/ask", json=payload)
                assert response.status_code == 200
                assert "could not be reliably validated" in response.json()["answer"]

@pytest.mark.asyncio
async def test_17_long_conversation():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        with patch("app.clients.spring_gateway_client.SpringAiGatewayClient.execute_prompt") as mock_exec:
            mock_exec.side_effect = mock_exec_side_effect("Analysis:\n\nOK\n\n# Recommendations\nOK")
            with patch("app.services.rag_service.RAGService.search_similar") as mock_search:
                mock_search.return_value = [mock_doc_chunk("Valid data")]
                payload = {
                    "query": "Analyze this context.", 
                    "userId": "u1",
                    "messages": [{"role": "user", "content": "long text " * 1000, "id": str(i)} for i in range(10)]
                }
                response = await client.post("/internal/agent/ask", json=payload)
                assert response.status_code == 200
                assert response.json()["mode"] == "analysis"

@pytest.mark.asyncio
async def test_18_streaming():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        with patch("app.clients.spring_gateway_client.SpringAiGatewayClient.execute_prompt") as mock_exec:
            mock_exec.return_value = mock_llm_response('{"sufficient": true, "reason": "OK", "missing_information": []}')
            with patch("app.clients.spring_gateway_client.SpringAiGatewayClient.execute_prompt_stream") as mock_stream:
                def fake_stream(*args, **kwargs):
                    yield "Analysis:\n\n"
                    yield "OK\n\n"
                    yield "# Recommendations\nOK"
                mock_stream.side_effect = fake_stream
                with patch("app.services.rag_service.RAGService.search_similar") as mock_search:
                    mock_search.return_value = [mock_doc_chunk("Valid data")]
                    payload = {"query": "Analyze this.", "userId": "u1"}
                    async with client.stream("POST", "/internal/agent/stream", json=payload) as response:
                        assert response.status_code == 200
                        events = []
                        async for line in response.aiter_lines():
                            if line: events.append(line)
                        assert any("Analysis:" in e for e in events)
                        assert any("event: done" in e for e in events)

@pytest.mark.asyncio
async def test_19_normal_chat_regression():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        with patch("app.clients.spring_gateway_client.SpringAiGatewayClient.execute_prompt") as mock_exec:
            mock_exec.side_effect = mock_exec_side_effect("DI is passing dependencies.")
            payload = {"query": "What is dependency injection in Spring Boot?", "userId": "u1"}
            response = await client.post("/internal/agent/ask", json=payload)
            assert response.json()["mode"] == "direct"

@pytest.mark.asyncio
async def test_20_research_regression():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        with patch("app.clients.spring_gateway_client.SpringAiGatewayClient.execute_prompt") as mock_exec:
            mock_exec.side_effect = mock_exec_side_effect("Research complete.")
            payload = {"query": "What are the latest AI developments this week?", "userId": "u1"}
            response = await client.post("/internal/agent/ask", json=payload)
            assert response.json()["mode"] in ["web_search", "direct"]

@pytest.mark.asyncio
async def test_21_plan_regression():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        with patch("app.clients.spring_gateway_client.SpringAiGatewayClient.execute_prompt") as mock_exec:
            mock_exec.side_effect = mock_exec_side_effect("Plan complete.")
            payload = {"query": "Create a plan to implement authentication.", "userId": "u1"}
            response = await client.post("/internal/agent/ask", json=payload)
            assert response.json()["mode"] in ["plan", "direct"]

@pytest.mark.asyncio
async def test_22_code_researcher_regression():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        with patch("app.clients.spring_gateway_client.SpringAiGatewayClient.execute_prompt") as mock_exec:
            mock_exec.side_effect = mock_exec_side_effect("Code trace.")
            payload = {"query": "Trace this API request through the repository.", "userId": "u1"}
            response = await client.post("/internal/agent/ask", json=payload)
            assert response.json()["mode"] in ["code_research", "direct", "web_search"]
