from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from app.core.config import settings
from app.api import internal_rag, internal_agent
from app.dependencies import get_embedding_service, get_semantic_cache, get_rag_service, get_compiled_graph

# Configure logging to see info messages in container logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("⚡ Pre-warming AI service singletons and embedding models at startup...")
    try:
        get_embedding_service()
        get_semantic_cache()
        get_rag_service()
        get_compiled_graph()
        logger.info("✅ All AI models and LangGraph singletons pre-warmed successfully!")
    except Exception as e:
        logger.error(f"⚠️ Error during startup pre-warming: {e}")
    yield
    logger.info("Shutting down AI Service.")

app = FastAPI(title="Nexora AI Service", version="1.0.0", lifespan=lifespan)

app.include_router(internal_rag.router)
app.include_router(internal_agent.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
