import os
import sys
import json
from qdrant_client import QdrantClient

# Add ai-service to path
sys.path.append(os.path.abspath('ai-service'))

try:
    from app.services.rag_service import RAGService
except ImportError as e:
    print(f"Failed to import RAGService: {e}")
    sys.exit(1)

# Connect to Qdrant directly for dataset generation
qdrant_url = os.getenv("QDRANT_URL", "http://nexora-qdrant:6333")
client = QdrantClient(url=qdrant_url)

collection_name = "nexora_documents"

try:
    # Get a sample of 20 points from the collection to use as our "ground truth"
    response = client.scroll(
        collection_name=collection_name,
        limit=20,
        with_payload=True,
        with_vectors=False
    )
    points = response[0]
except Exception as e:
    print(f"Failed to fetch points from Qdrant: {e}. Ensure documents have been uploaded.")
    points = []

from app.dependencies import _shared_rag_service as rag_service

results = {
    "total": len(points),
    "recall_at_1": 0,
    "recall_at_3": 0,
    "recall_at_5": 0,
    "mrr": 0.0
}

dataset = []

if points:
    print(f"Evaluating {len(points)} chunks...")
    for point in points:
        chunk_content = point.payload.get("content", "")
        if not chunk_content:
            print(f"Skipping point {point.id}, payload keys: {point.payload.keys()}")
            continue
            
        # We use a substring of the chunk as the query to simulate a user asking about it
        query = chunk_content[:100] + "..." if len(chunk_content) > 100 else chunk_content
        
        dataset.append({
            "query": query,
            "expected_chunk_id": point.id
        })
        
        user_id = point.payload.get("user_id", "")
        # Search using the actual RAG service
        chunks = rag_service.search_similar(query, user_id=user_id, top_k=5)
        
        retrieved_contents = [chunk.content for chunk in chunks]
        
        found_rank = -1
        for i, content in enumerate(retrieved_contents):
            if chunk_content == content:
                found_rank = i + 1
                break
                
        if found_rank > 0:
            if found_rank == 1:
                results["recall_at_1"] += 1
            if found_rank <= 3:
                results["recall_at_3"] += 1
            if found_rank <= 5:
                results["recall_at_5"] += 1
            results["mrr"] += 1.0 / found_rank

    if results["total"] > 0:
        results["recall_at_1"] = (results["recall_at_1"] / results["total"]) * 100
        results["recall_at_3"] = (results["recall_at_3"] / results["total"]) * 100
        results["recall_at_5"] = (results["recall_at_5"] / results["total"]) * 100
        results["mrr"] = results["mrr"] / results["total"]

with open("rag_results.json", "w") as f:
    json.dump(results, f, indent=2)

with open("rag_dataset.json", "w") as f:
    json.dump(dataset, f, indent=2)
    
print(f"RAG Evaluation Complete. Recall@1: {results.get('recall_at_1', 0)}%")
