import re

class CharacterChunker:
    """
    A simple deterministic text chunker that splits text into chunks of maximum `chunk_size` characters,
    with an overlap of `chunk_overlap` characters. 
    It attempts to split gracefully on newlines or spaces if possible.
    """
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        if chunk_size <= 0:
            raise ValueError("chunk_size must be greater than 0")
        if chunk_overlap >= chunk_size:
            raise ValueError("chunk_overlap must be less than chunk_size")
            
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def split_text(self, text: str) -> list[str]:
        if not text:
            return []
            
        text = text.strip()
        if not text:
            return []
            
        chunks = []
        start = 0
        
        while start < len(text):
            end = min(start + self.chunk_size, len(text))
            
            # If we're not at the end of the text, try to find a nice boundary
            if end < len(text):
                # Try to find a double newline
                boundary = text.rfind('\n\n', start, end)
                if boundary == -1 or boundary <= start + self.chunk_overlap:
                    # Try single newline
                    boundary = text.rfind('\n', start, end)
                    if boundary == -1 or boundary <= start + self.chunk_overlap:
                        # Try space
                        boundary = text.rfind(' ', start, end)
                
                # If we found a valid boundary, adjust the end
                if boundary != -1 and boundary > start + self.chunk_overlap:
                    end = boundary
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
                
            # If we reached the end, stop
            if end >= len(text):
                break
                
            # Calculate next start with overlap
            # Ensure we always advance at least 1 character to avoid infinite loops
            next_start = end - self.chunk_overlap
            start = max(next_start, start + 1)
            
        return chunks
