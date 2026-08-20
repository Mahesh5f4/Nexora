import uuid
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.core.config import settings

class RetrievedChunk(BaseModel):
    document_id: str
    chunk_id: str
    content: str
    score: float
    metadata: Dict[str, Any]


class BaseVectorStore(ABC):
    @abstractmethod
    def upsert(self, user_id: str, document_id: str, chunks: List[str], vectors: List[List[float]], metadata: Optional[Dict[str, Any]] = None):
        """Upserts a list of chunks and their vectors for a given user and document."""
        pass
        
    @abstractmethod
    def search(self, user_id: str, query_vector: List[float], top_k: int = 5) -> List[RetrievedChunk]:
        """Searches for similar vectors for a specific user."""
        pass
        
    @abstractmethod
    def delete_document(self, user_id: str, document_id: str):
        """Deletes all chunks associated with a given document and user."""
        pass
        

class QdrantVectorStore(BaseVectorStore):
    def __init__(self, client, collection_name: str = None):
        self._client = client
        self._collection_name = collection_name or settings.qdrant_collection_name
        
    def upsert(self, user_id: str, document_id: str, chunks: List[str], vectors: List[List[float]], metadata: Optional[Dict[str, Any]] = None):
        from qdrant_client.models import PointStruct
        
        if not chunks or not vectors:
            return
            
        if len(chunks) != len(vectors):
            raise ValueError("Number of chunks must match number of vectors")
            
        points = []
        # Create a deterministic namespace for uuid5 based on document_id
        doc_namespace = uuid.uuid5(uuid.NAMESPACE_OID, f"{user_id}:{document_id}")
        
        for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
            chunk_id = str(uuid.uuid5(doc_namespace, str(i)))
            payload = {
                "user_id": user_id,
                "document_id": document_id,
                "chunk_id": chunk_id,
                "content": chunk,
            }
            if metadata:
                payload.update(metadata)
                
            points.append(PointStruct(
                id=chunk_id,
                vector=vector,
                payload=payload
            ))
            
        self._client.upsert(
            collection_name=self._collection_name,
            points=points
        )
        
    def search(self, user_id: str, query_vector: List[float], top_k: int = 5, document_id: Optional[str] = None) -> List[RetrievedChunk]:
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        
        # Critical: Multi-tenant data isolation
        must_conditions = [
            FieldCondition(
                key="user_id",
                match=MatchValue(value=user_id)
            )
        ]
        
        if document_id:
            must_conditions.append(
                FieldCondition(
                    key="document_id",
                    match=MatchValue(value=document_id)
                )
            )
            
        user_filter = Filter(must=must_conditions)
        
        search_result = self._client.search(
            collection_name=self._collection_name,
            query_vector=query_vector,
            query_filter=user_filter,
            limit=top_k
        )
        
        retrieved_chunks = []
        for scored_point in search_result:
            payload = scored_point.payload or {}
            retrieved_chunks.append(RetrievedChunk(
                document_id=payload.get("document_id", ""),
                chunk_id=payload.get("chunk_id", ""),
                content=payload.get("content", ""),
                score=scored_point.score,
                metadata=payload
            ))
            
        return retrieved_chunks

    def delete_document(self, user_id: str, document_id: str):
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        
        doc_filter = Filter(
            must=[
                FieldCondition(
                    key="user_id",
                    match=MatchValue(value=user_id)
                ),
                FieldCondition(
                    key="document_id",
                    match=MatchValue(value=document_id)
                )
            ]
        )
        
        self._client.delete(
            collection_name=self._collection_name,
            points_selector=doc_filter
        )

