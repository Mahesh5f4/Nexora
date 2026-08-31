from typing import List, Dict, Any, Optional
import time
import logging
from app.services.chunker import CharacterChunker
from app.services.embedding import EmbeddingService
from app.services.vector_store import BaseVectorStore, RetrievedChunk
from app.services.llm_gateway import LLMGateway
from app.services.rag_prompt_builder import RagPromptBuilder
from app.models.ai_execute import AiExecuteRequest
from app.models.rag_answer import RagAnswerResponse, RagSourceModel
from app.models.evidence import EvidenceItem

logger = logging.getLogger(__name__)

class RAGService:
    def __init__(self, chunker: CharacterChunker, embedding_service: EmbeddingService, vector_store: BaseVectorStore, llm_gateway: LLMGateway = None):
        self.chunker = chunker
        self.embedding_service = embedding_service
        self.vector_store = vector_store
        self.llm_gateway = llm_gateway
        self.prompt_builder = RagPromptBuilder()

    def index_chunks(self, document_id: str, user_id: str, text: str, metadata: Optional[Dict[str, Any]] = None):
        """
        Takes raw text, chunks it, generates embeddings, and upserts them into the vector store.
        """
        if not text:
            return
            
        chunks = self.chunker.split_text(text)
        if not chunks:
            return
            
        vectors = self.embedding_service.embed_chunks(chunks)
        
        self.vector_store.upsert(
            user_id=user_id,
            document_id=document_id,
            chunks=chunks,
            vectors=vectors,
            metadata=metadata
        )

    def search_similar(self, query: str, user_id: str, top_k: int = 5, document_id: Optional[str] = None) -> List[RetrievedChunk]:
        """
        Embeds the query and performs a similarity search, restricted to the user's data.
        """
        if not query:
            return []
            
        start_time = time.perf_counter()
        query_vectors = self.embedding_service.embed_chunks([query])
        if not query_vectors:
            return []
            
        query_vector = query_vectors[0]
        chunks = self.vector_store.search(user_id=user_id, query_vector=query_vector, top_k=top_k, document_id=document_id)
        retrieval_ms = int((time.perf_counter() - start_time) * 1000)
        
        # Lightweight observability
        logger.info(f"RAG Retrieval user_id={user_id} document_id={document_id} chunks={len(chunks)} retrieval_ms={retrieval_ms}")
        return chunks

    def search_user_memory(self, query: str, user_id: str, top_k: int = 3) -> List[RetrievedChunk]:
        """Searches specifically in the user_profile_memory document."""
        chunks = self.search_similar(query, user_id, top_k, document_id="user_profile_memory")
        return chunks

    def add_user_memory(self, user_id: str, fact: str):
        """Adds a fact to the user's long term memory in the vector store with deduplication."""
        if not fact or not fact.strip():
            return
            
        fact_clean = fact.strip()
        
        # Check if identical fact already exists
        try:
            existing = self.list_user_memory(user_id)
            if any(m.get("content", "").strip().lower() == fact_clean.lower() for m in existing):
                logger.info(f"Memory fact already exists for user {user_id}, skipping duplicate: {fact_clean}")
                return
        except Exception as e:
            logger.warning(f"Could not check existing memories for deduplication: {e}")
            
        vectors = self.embedding_service.embed_chunks([fact_clean])
        if not vectors:
            return
            
        import uuid
        unique_id = str(uuid.uuid4())
        
        from qdrant_client.models import PointStruct
        payload = {
            "user_id": user_id,
            "document_id": "user_profile_memory",
            "chunk_id": unique_id,
            "content": fact_clean,
            "filename": "User Profile Memory",
            "is_memory": True
        }
        
        point = PointStruct(
            id=unique_id,
            vector=vectors[0],
            payload=payload
        )
        
        self.vector_store._client.upsert(
            collection_name=self.vector_store._collection_name,
            points=[point]
        )

    def list_user_memory(self, user_id: str) -> List[Dict[str, Any]]:
        """Lists all memory facts for a user without searching."""
        from qdrant_client import models
        # We can use scroll to get all memories for this user
        results, _ = self.vector_store._client.scroll(
            collection_name=self.vector_store._collection_name,
            scroll_filter=models.Filter(
                must=[
                    models.FieldCondition(key="user_id", match=models.MatchValue(value=user_id)),
                    models.FieldCondition(key="document_id", match=models.MatchValue(value="user_profile_memory"))
                ]
            ),
            limit=100
        )
        memories = []
        for p in results:
            memories.append({
                "id": p.id,
                "content": p.payload.get("content", ""),
                "created_at": p.payload.get("created_at", "")
            })
        return memories

    def delete_user_memory(self, user_id: str, memory_id: str):
        """Deletes a specific memory fact by its unique ID."""
        from qdrant_client import models
        # Confirm it belongs to the user
        self.vector_store._client.delete(
            collection_name=self.vector_store._collection_name,
            points_selector=models.Filter(
                must=[
                    models.FieldCondition(key="user_id", match=models.MatchValue(value=user_id)),
                    models.FieldCondition(key="chunk_id", match=models.MatchValue(value=memory_id))
                ]
            )
        )

    def delete_document(self, user_id: str, document_id: str):
        """
        Deletes all vector store entries for a given document.
        """
        self.vector_store.delete_document(user_id=user_id, document_id=document_id)

    def retrieve_and_answer(self, query: str, user_id: str, top_k: int = 3, document_id: str = None) -> RagAnswerResponse:
        total_start = time.perf_counter()
        raw_chunks = self.search_similar(query, user_id, top_k, document_id=document_id)
        
        if not raw_chunks:
            return RagAnswerResponse(
                answer="I couldn't find relevant information in your documents to answer this question.",
                sources=[]
            )
            
        # Context deduplication to avoid identical adjacent chunks wasting LLM tokens
        seen_content = set()
        chunks = []
        for chunk in raw_chunks:
            if chunk.content not in seen_content:
                chunks.append(chunk)
                seen_content.add(chunk.content)
                
        # Convert to EvidenceItem
        evidence = []
        for chunk in chunks:
            evidence.append(EvidenceItem(
                source_type="document",
                title=chunk.metadata.get("filename", "unknown"),
                content=chunk.content,
                document_id=chunk.document_id,
                chunk_id=chunk.chunk_id,
                score=chunk.score
            ))
            
        context = self.prompt_builder.build_context(evidence)
        prompt = self.prompt_builder.build_user_prompt(query, context)
        
        ai_request = AiExecuteRequest(
            prompt=prompt,
            systemPrompt=self.prompt_builder.system_prompt,
            temperature=0.2,
            maxTokens=1000
        )
        
        llm_start = time.perf_counter()
        response = self.llm_gateway.execute_prompt(ai_request)
        generation_ms = int((time.perf_counter() - llm_start) * 1000)
        
        total_ms = int((time.perf_counter() - total_start) * 1000)
        
        logger.info(
            f"RAG Request completed user_id={user_id} chunks_sent={len(chunks)} "
            f"generation_ms={generation_ms} total_ms={total_ms} provider={response.provider}"
        )
        
        sources = [
            RagSourceModel(
                documentId=chunk.document_id,
                filename=chunk.metadata.get("filename", "unknown"),
                chunkId=chunk.chunk_id,
                score=chunk.score,
                publishedDate=chunk.metadata.get("published_date")
            )
            for chunk in chunks
        ]
        
        return RagAnswerResponse(answer=response.content, sources=sources)
