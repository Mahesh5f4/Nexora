from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

import numpy as np

app = FastAPI(title="EventHub ML Recommendation Service")

class Event(BaseModel):
    id: int
    title: str
    description: str
    location: str
    price: float
    rating: float

class RecommendationRequest(BaseModel):
    target_event_id: int
    all_events: List[Event]

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/recommend")
def recommend_events(request: RecommendationRequest):
    if not request.all_events:
        return []

    events = [e.dict() for e in request.all_events]
    df = pd.DataFrame(events)
    
    if request.target_event_id not in df['id'].values:
        raise HTTPException(status_code=404, detail="Target event not found in the provided list")

    target_idx = df[df['id'] == request.target_event_id].index[0]
    target_event = events[target_idx]

    # Combined text features
    event_texts = [f"{e['title']} {e['description']} {e['location']}" for e in events]
    
    tfidf = TfidfVectorizer(stop_words='english')
    tfidf_matrix = tfidf.fit_transform(event_texts)
    
    # Calculate text similarity
    cosine_sim = cosine_similarity(tfidf_matrix[target_idx], tfidf_matrix).flatten()
    
    # Add boosts for price proximity and location match
    target_price = target_event['price']
    target_loc = target_event['location'].lower()
    
    final_scores = []
    for i, event in enumerate(events):
        if i == target_idx:
            final_scores.append(-1.0)
            continue
            
        score = cosine_sim[i]
        
        # Location boost (20% boost if same location)
        if event['location'].lower() == target_loc:
            score += 0.2
        
        # Price proximity boost (up to 10% boost if prices are similar)
        price_diff = abs(event['price'] - target_price)
        if target_price > 0:
            price_ratio = 1.0 - min(price_diff / target_price, 1.0)
            score += (price_ratio * 0.1)
            
        # Rating boost (up to 30% boost for high-rated events)
        rating_val = event.get('rating', 0.0)
        rating_boost = (rating_val / 5.0) * 0.3
        score += rating_boost
            
        final_scores.append(score)
    
    # Get top 4 indices
    top_indices = np.argsort(final_scores)[-4:][::-1]
    
    # Return event IDs
    recommended_ids = [int(events[i]['id']) for i in top_indices]
    
    return {"recommended_event_ids": recommended_ids}

import os
import requests
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

# Global variables for RAG
vector_store = None
llm = None

class ChatRequest(BaseModel):
    query: str
    
class ChatResponse(BaseModel):
    answer: str
    sources: List[str] = []

def init_rag():
    global vector_store, llm
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Warning: GEMINI_API_KEY not found. RAG Chatbot will not work.")
        return
        
    try:
        llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=api_key)
        embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=api_key)
        
        # Fetch events from event-service with a short timeout to prevent circular startup deadlock
        event_service_url = os.environ.get("EVENT_SERVICE_URL", "http://event-service:8082")
        resp = requests.get(f"{event_service_url}/api/events", timeout=3)
        if resp.status_code == 200:
            # Handle standard API response format which wraps in 'data'
            json_resp = resp.json()
            events_data = json_resp.get('data', []) if isinstance(json_resp, dict) and 'data' in json_resp else json_resp
            
            docs = []
            for e in events_data:
                if not isinstance(e, dict): continue
                content = f"Title: {e.get('title')}\nDescription: {e.get('description')}\nLocation: {e.get('location')}\nPrice: ₹{e.get('price')}\nDate: {e.get('startTime')}\nAvailable Seats: {e.get('availableSeats')}"
                docs.append(Document(page_content=content, metadata={"id": e.get("id"), "title": e.get("title")}))
                
            if docs:
                vector_store = FAISS.from_documents(docs, embeddings)
                print(f"Initialized FAISS vector store with {len(docs)} events.")
        else:
            print("Failed to fetch events for RAG.")
    except Exception as e:
        print(f"Failed to initialize RAG: {e}")

def refresh_vector_store():
    global vector_store
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Warning: GEMINI_API_KEY not found. Cannot refresh vector store.")
        return
    try:
        embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=api_key)
        event_service_url = os.environ.get("EVENT_SERVICE_URL", "http://event-service:8082")
        resp = requests.get(f"{event_service_url}/api/events", timeout=5)
        if resp.status_code == 200:
            json_resp = resp.json()
            events_data = json_resp.get('data', []) if isinstance(json_resp, dict) and 'data' in json_resp else json_resp
            docs = []
            for e in events_data:
                if not isinstance(e, dict): continue
                content = f"Title: {e.get('title')}\nDescription: {e.get('description')}\nLocation: {e.get('location')}\nPrice: ₹{e.get('price')}\nDate: {e.get('startTime')}\nAvailable Seats: {e.get('availableSeats')}"
                docs.append(Document(page_content=content, metadata={"id": e.get("id"), "title": e.get("title")}))
            if docs:
                vector_store = FAISS.from_documents(docs, embeddings)
                print(f"Successfully refreshed FAISS vector store with {len(docs)} events.")
        else:
            print("Failed to fetch events for RAG refresh.")
    except Exception as e:
        print(f"Failed to refresh RAG vector store: {e}")

@app.on_event("startup")
def startup_event():
    init_rag()

@app.post("/chat", response_model=ChatResponse)
def chat_with_bot(req: ChatRequest):
    global vector_store, llm
    if not llm:
        api_key = os.environ.get("GEMINI_API_KEY")
        if api_key:
            try:
                llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=api_key)
            except Exception as e:
                print(f"Failed to initialize LLM on-demand: {e}")
                
    if not llm:
        raise HTTPException(status_code=503, detail="RAG Chatbot LLM is not initialized. Check GEMINI_API_KEY.")
        
    if not vector_store:
        refresh_vector_store()
        
    if not vector_store:
        raise HTTPException(status_code=503, detail="RAG Chatbot vector store is not initialized. Event service may be offline.")
        
    try:
        # Retrieve top relevant events
        docs = vector_store.similarity_search(req.query, k=4)
        context = "\n\n".join([d.page_content for d in docs])
        sources = list(set([d.metadata.get("title") for d in docs if d.metadata.get("title")]))
        
        prompt = f"""You are a Retrieval-Augmented Generation (RAG) assistant for EventHub.
Based strictly on the retrieved context from our database, answer the user's question. 
If the answer is not in the context, politely say that you don't know based on the provided events. Keep your answer friendly and concise.

Context:
{context}

Question:
{req.query}

Answer:"""
        
        response = llm.invoke(prompt)
        return ChatResponse(answer=response.content, sources=sources)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
