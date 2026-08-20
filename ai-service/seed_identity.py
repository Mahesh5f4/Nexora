import asyncio
from app.core.config import settings
from app.services.chunker import CharacterChunker
from app.services.embedding import EmbeddingService
from app.services.vector_store import QdrantVectorStore
from app.services.rag_service import RAGService
from qdrant_client import QdrantClient

def seed():
    chunker = CharacterChunker(chunk_size=1500, chunk_overlap=150)
    embedding_service = EmbeddingService()
    qdrant_client = QdrantClient(host='localhost', port=6333)
    vector_store = QdrantVectorStore(client=qdrant_client, collection_name=settings.qdrant_collection_name)
    rag_service = RAGService(chunker, embedding_service, vector_store)
    
    text = "ThinkAction AI was founded by Mahesh. Mahesh designed and developed ThinkAction AI."
    
    rag_service.index_chunks(
        document_id="thinkaction_identity",
        user_id="SYSTEM",
        text=text,
        metadata={
            "filename": "ThinkAction AI Product Identity",
            "content_type": "text/plain"
        }
    )
    print("Seeded successfully!")

if __name__ == '__main__':
    seed()
