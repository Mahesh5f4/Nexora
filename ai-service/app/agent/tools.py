from langchain_core.tools import tool
from typing import List, Any
from app.services.rag_service import RAGService
from app.services.vector_store import RetrievedChunk
from app.agent.search_provider import WebSearchProvider, SearchResult

class DocumentRetrievalTool:
    def __init__(self, rag_service: RAGService):
        self.rag_service = rag_service
        
    def get_tool(self):
        @tool("search_documents")
        def search_documents(query: str, user_id: str, top_k: int = 5, document_id: str = None) -> List[RetrievedChunk]:
            """Search for relevant documents in the vector store."""
            if document_id is not None:
                return self.rag_service.search_similar(query, user_id, top_k, document_id=document_id)
            return self.rag_service.search_similar(query, user_id, top_k)
            
        return search_documents

class WebResearchTool:
    def __init__(self, search_provider: WebSearchProvider, max_results: int = 5):
        self.search_provider = search_provider
        self.max_results = max_results
        
    def get_tool(self):
        @tool("web_search")
        def web_search(query: str) -> List[SearchResult]:
            """Search the web for current events, news, or external information."""
            # Query validation
            clean_query = query.strip()
            if not clean_query:
                return []
            
            # Enforce max query length
            if len(clean_query) > 200:
                clean_query = clean_query[:200]
                
            return self.search_provider.search(clean_query, self.max_results)
            
        return web_search

class SaveUserMemoryTool:
    def __init__(self, rag_service: RAGService):
        self.rag_service = rag_service
        
    def get_tool(self):
        @tool("save_user_memory")
        def save_user_memory(fact: str, user_id: str) -> str:
            """Save an important fact or preference about the user into long-term memory."""
            if not fact:
                return "Failed to save memory: Fact was empty."
                
            self.rag_service.add_user_memory(user_id=user_id, fact=fact)
            return f"Successfully saved memory: {fact}"
            
        return save_user_memory
