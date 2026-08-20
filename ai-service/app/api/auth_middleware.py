from fastapi import HTTPException, Security
from fastapi.security.http import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

security = HTTPBearer()

def verify_internal_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    print(f"Received token: {credentials.credentials}")
    print(f"Expected token: {settings.ai_service_internal_token}")
    if credentials.credentials != settings.ai_service_internal_token:
        print("TOKEN MISMATCH!")
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing internal service token",
        )
    return True
