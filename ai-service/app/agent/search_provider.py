from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel
import requests
import logging

logger = logging.getLogger(__name__)

class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str
    source: str
    score: Optional[float] = None
    published_date: Optional[str] = None

class WebSearchProvider(ABC):
    @abstractmethod
    def search(self, query: str, max_results: int) -> List[SearchResult]:
        pass

class TavilyWebSearchProvider(WebSearchProvider):
    def __init__(self, api_key: Optional[str], timeout_seconds: int = 10):
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds
        self.base_url = "https://api.tavily.com/search"

    def search(self, query: str, max_results: int = 5) -> List[SearchResult]:
        if not self.api_key:
            logger.error("Tavily API key is not configured.")
            raise ValueError("Web search is currently unavailable due to missing configuration.")
            
        try:
            payload = {
                "api_key": self.api_key,
                "query": query,
                "max_results": max_results,
                "search_depth": "advanced",
                "topic": "general",
                "include_answer": False,
                "include_images": False,
                "include_raw_content": False
            }
            
            response = requests.post(self.base_url, json=payload, timeout=self.timeout_seconds)
            response.raise_for_status()
            data = response.json()
            
            results = []
            for item in data.get("results", []):
                results.append(SearchResult(
                    title=item.get("title", ""),
                    url=item.get("url", ""),
                    snippet=item.get("content", ""),
                    source=item.get("url", "").split("/")[2] if "//" in item.get("url", "") else "unknown",
                    score=item.get("score"),
                    published_date=item.get("published_date")
                ))
            return results
            
        except requests.exceptions.Timeout:
            logger.error("Tavily search request timed out.")
            raise RuntimeError("Web search timed out.")
        except requests.exceptions.RequestException as e:
            logger.error(f"Tavily search request failed.")
            raise RuntimeError("Web search provider is currently unavailable.")
        except Exception as e:
            logger.error(f"Unexpected error during web search.")
            raise RuntimeError("An unexpected error occurred during web search.")
