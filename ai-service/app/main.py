from fastapi import FastAPI
from app.core.config import settings
from app.api.internal_rag import router as internal_rag_router

app = FastAPI(title="Nexora AI Service", version="1.0.0")

app.include_router(internal_rag_router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
