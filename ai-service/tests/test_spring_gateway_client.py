import pytest
import requests_mock
from fastapi import HTTPException
from app.clients.spring_gateway_client import SpringAiGatewayClient
from app.models.ai_execute import AiExecuteRequest, AiExecuteResponse
from requests.exceptions import Timeout

def test_spring_gateway_client_success():
    client = SpringAiGatewayClient()
    request = AiExecuteRequest(prompt="Test prompt", maxTokens=100)
    
    with requests_mock.Mocker() as m:
        m.post(
            f"{client.base_url}/internal/ai/execute",
            json={"content": "Response content", "provider": "mock", "model": "mock-model"}
        )
        
        response = client.execute_prompt(request)
        
        assert response.content == "Response content"
        assert response.provider == "mock"
        assert response.model == "mock-model"
        assert m.last_request.headers["Authorization"] == f"Bearer {client.token}"

def test_spring_gateway_client_unauthorized():
    client = SpringAiGatewayClient()
    request = AiExecuteRequest(prompt="Test prompt")
    
    with requests_mock.Mocker() as m:
        m.post(f"{client.base_url}/internal/ai/execute", status_code=401)
        
        with pytest.raises(HTTPException) as excinfo:
            client.execute_prompt(request)
        
        assert excinfo.value.status_code == 401
        assert "Unauthorized" in excinfo.value.detail

def test_spring_gateway_client_timeout():
    client = SpringAiGatewayClient()
    request = AiExecuteRequest(prompt="Test prompt")
    
    with requests_mock.Mocker() as m:
        m.post(f"{client.base_url}/internal/ai/execute", exc=Timeout)
        
        with pytest.raises(HTTPException) as excinfo:
            client.execute_prompt(request)
        
        assert excinfo.value.status_code == 504
        assert "Timeout" in excinfo.value.detail

def test_spring_gateway_client_500_error():
    client = SpringAiGatewayClient()
    request = AiExecuteRequest(prompt="Test prompt")
    
    with requests_mock.Mocker() as m:
        m.post(f"{client.base_url}/internal/ai/execute", status_code=500, text="Internal Server Error")
        
        with pytest.raises(HTTPException) as excinfo:
            client.execute_prompt(request)
        
        assert excinfo.value.status_code == 500
        assert "Internal Server Error" in excinfo.value.detail
