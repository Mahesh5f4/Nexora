import abc

class DocumentProcessor(abc.ABC):
    @abc.abstractmethod
    def can_process(self, content_type: str, filename: str) -> bool:
        pass

    @abc.abstractmethod
    def extract_text(self, content: bytes) -> str:
        pass

class PlainTextProcessor(DocumentProcessor):
    def can_process(self, content_type: str, filename: str) -> bool:
        return content_type == "text/plain" or filename.lower().endswith(".txt")

    def extract_text(self, content: bytes) -> str:
        try:
            return content.decode("utf-8")
        except UnicodeDecodeError:
            # Fallback to ascii with replacement if not utf-8
            return content.decode("ascii", errors="replace")
