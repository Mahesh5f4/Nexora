from typing import List
from app.services.vector_store import RetrievedChunk

class RagPromptBuilder:
    def __init__(self):
        self.system_prompt = (
            "You are answering questions using retrieved document context.\n"
            "Use the supplied context as the primary source of truth.\n"
            "Do not invent facts that are not supported by the retrieved context.\n"
            "If the retrieved context does not contain enough information to answer the question, explicitly say that the available documents do not contain enough information.\n"
            "Do not pretend to have searched the internet.\n"
            "Do not claim to have accessed documents that were not retrieved.\n"
            "Distinguish clearly between information supported by the documents and reasonable inference."
        )
    
    def build_context(self, chunks: List[RetrievedChunk]) -> str:
        if not chunks:
            return ""
            
        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            filename = chunk.metadata.get("filename", "unknown")
            context_parts.append(
                f"--- DOCUMENT {i} ---\n"
                f"Filename: {filename}\n"
                f"Content:\n{chunk.content}\n"
            )
            
        return "\n".join(context_parts)
    
    def build_user_prompt(self, query: str, context: str) -> str:
        return f"Context:\n{context}\n\nQuestion:\n{query}"
