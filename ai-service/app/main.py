from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Nexora AI Service", version="1.0.0")

class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None

class DocumentIngestRequest(BaseModel):
    document_id: str
    text_content: str

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/ai/chat")
def chat(request: ChatRequest):
    # Stub for future LangGraph/LLM implementation
    return {"reply": f"Echo (Stubbed AI response): {request.message}"}

@app.post("/ai/ingest")
def ingest_document(request: DocumentIngestRequest):
    # Stub for future Qdrant document embedding
    return {"status": "success", "message": f"Document {request.document_id} queued for ingestion"}

@app.post("/ai/research")
def research(topic: str):
    # Stub for Web Search Agent
    return {"status": "success", "results": [f"Research stub result for {topic}"]}

@app.post("/ai/generate")
def generate(prompt: str):
    # Stub for Generation Agent
    return {"status": "success", "content": f"Generated stub content for {prompt}"}

@app.post("/ai/plan")
def plan(goal: str):
    # Stub for Planning Agent
    return {"status": "success", "steps": ["Step 1 stub", "Step 2 stub"]}
