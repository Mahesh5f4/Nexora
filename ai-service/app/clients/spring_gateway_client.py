import requests
from requests.exceptions import RequestException, Timeout
from app.core.config import settings
from app.models.ai_execute import AiExecuteRequest, AiExecuteResponse
from fastapi import HTTPException

class SpringAiGatewayClient:
    def __init__(self):
        self.base_url = settings.spring_ai_gateway_url.rstrip("/")
        self.token = settings.ai_service_internal_token
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

    def execute_prompt(self, request_data: AiExecuteRequest) -> AiExecuteResponse:
        url = f"{self.base_url}/internal/ai/execute"
        try:
            response = requests.post(
                url, 
                json=request_data.model_dump(exclude_none=True), 
                headers=self.headers,
                timeout=30.0
            )
            response.raise_for_status()
            
            data = response.json()
            return AiExecuteResponse(**data)
            
        except Timeout:
            raise HTTPException(status_code=504, detail="Timeout communicating with Spring AI Gateway")
        except RequestException as e:
            if e.response is not None:
                if e.response.status_code in (401, 403):
                    raise HTTPException(status_code=401, detail="Unauthorized to call Spring AI Gateway")
                raise HTTPException(status_code=e.response.status_code, detail=f"Spring AI Gateway error: {e.response.text}")
            raise HTTPException(status_code=500, detail=f"Network error calling Spring AI Gateway: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected error communicating with Spring AI Gateway: {str(e)}")
