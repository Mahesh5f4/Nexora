from fastapi import FastAPI
from app.core.config import settings
from app.api import internal_rag, internal_agent

app = FastAPI(title="Nexora AI Service", version="1.0.0")

app.include_router(internal_rag.router)
app.include_router(internal_agent.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
