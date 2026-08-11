from fastapi import HTTPException, Security
from fastapi.security.http import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

security = HTTPBearer()

def verify_internal_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    if credentials.credentials != settings.ai_service_internal_token:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing internal service token",
        )
    return True
