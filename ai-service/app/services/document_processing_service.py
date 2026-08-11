from typing import List
from .document_processor import DocumentProcessor, PlainTextProcessor

class DocumentProcessingService:
    def __init__(self):
        self.processors: List[DocumentProcessor] = [
            PlainTextProcessor()
            # Future processors (PDF, Docx) can be added here
        ]

    def extract_text(self, filename: str, content_type: str, content: bytes) -> str:
        # Validate empty file
        if not content:
            raise ValueError("File content is empty")

        # Select processor
        selected_processor = None
        for processor in self.processors:
            if processor.can_process(content_type, filename):
                selected_processor = processor
                break

        if not selected_processor:
            raise ValueError(f"Unsupported file type: {content_type}")

        # Extract text
        text = selected_processor.extract_text(content)
        
        # Normalize text
        text = text.replace("\r\n", "\n").strip()
        if not text:
            raise ValueError("No text could be extracted from the file")

        return text
