import os
import re
import time
import logging
from typing import Protocol, List, Dict, Any, Optional
from pydantic import BaseModel
from collections import defaultdict

logger = logging.getLogger(__name__)

class CodeSearchResult(BaseModel):
    repository: str
    file_path: str
    symbol: Optional[str] = None
    line_range: str
    content: str
    score: float

class RepositorySource(Protocol):
    def search_code(self, query_terms: List[str], max_results: int = 10) -> List[CodeSearchResult]:
        ...
    def get_file(self, file_path: str) -> Optional[str]:
        ...

class LocalRepositorySource:
    """Local file system implementation for repository retrieval."""
    
    def __init__(self, base_path: str, repo_name: str = "local-repo"):
        self.base_path = os.path.abspath(base_path)
        self.repo_name = repo_name
        self.ignore_dirs = {
            ".git", "node_modules", "target", "venv", ".venv", "__pycache__",
            "build", "dist", ".idea", ".vscode"
        }
        self.ignore_exts = {
            ".pdf", ".jpg", ".png", ".jar", ".class", ".pyc", ".zip", ".tar", ".gz", ".exe"
        }

    def _should_ignore_dir(self, dir_name: str) -> bool:
        return dir_name in self.ignore_dirs or dir_name.startswith(".")

    def _should_ignore_file(self, file_name: str) -> bool:
        _, ext = os.path.splitext(file_name)
        return ext.lower() in self.ignore_exts

    def search_code(self, query_terms: List[str], max_results: int = 20) -> List[CodeSearchResult]:
        if not query_terms:
            return []
            
        start_time = time.perf_counter()
        results = []
        term_patterns = [re.compile(re.escape(term), re.IGNORECASE) for term in query_terms]

        for root, dirs, files in os.walk(self.base_path):
            dirs[:] = [d for d in dirs if not self._should_ignore_dir(d)]
            
            for file in files:
                if self._should_ignore_file(file):
                    continue
                    
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, self.base_path)
                
                # Check path match
                path_score = 0.0
                for term in query_terms:
                    if term.lower() in rel_path.lower():
                        path_score += 0.5
                        
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = f.readlines()
                except Exception:
                    continue

                # Scan lines for content matches
                for i, line in enumerate(lines):
                    match_count = sum(1 for p in term_patterns if p.search(line))
                    if match_count > 0:
                        score = match_count * 1.0 + path_score
                        
                        # Extract a window of +/- 15 lines around the match
                        start_idx = max(0, i - 15)
                        end_idx = min(len(lines), i + 15)
                        window_lines = lines[start_idx:end_idx]
                        content = "".join(window_lines)
                        
                        # Try to guess symbol context from surrounding lines
                        symbol = self._guess_symbol(window_lines)
                        
                        results.append(CodeSearchResult(
                            repository=self.repo_name,
                            file_path=rel_path,
                            symbol=symbol,
                            line_range=f"{start_idx + 1}-{end_idx}",
                            content=content.strip(),
                            score=score
                        ))
                        
                # Time limit to prevent hanging on huge repos
                if time.perf_counter() - start_time > 5.0:
                    break
            
            if time.perf_counter() - start_time > 5.0:
                break

        # Deduplicate and rank
        best_chunks = {}
        for res in results:
            # Deduplicate by roughly the same line range in the same file
            key = f"{res.file_path}:{res.line_range}"
            if key not in best_chunks or res.score > best_chunks[key].score:
                best_chunks[key] = res
                
        sorted_results = sorted(best_chunks.values(), key=lambda x: x.score, reverse=True)
        return sorted_results[:max_results]

    def _guess_symbol(self, lines: List[str]) -> Optional[str]:
        # Very simple heuristic to find class or def near the top of the window
        for line in lines:
            line = line.strip()
            if line.startswith("class ") or line.startswith("def ") or line.startswith("public class ") or line.startswith("public interface ") or ("(" in line and ")" in line and "{" in line):
                # Extract roughly the signature
                return line[:50] + "..." if len(line) > 50 else line
        return None

    def get_file(self, file_path: str) -> Optional[str]:
        full_path = os.path.join(self.base_path, file_path)
        try:
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        except Exception:
            return None


class CodeRetrievalService:
    def __init__(self, repository: RepositorySource):
        self.repository = repository

    def _extract_query_terms(self, query: str) -> List[str]:
        # Split by spaces and basic punctuation, keep meaningful keywords
        words = re.findall(r'\b[a-zA-Z0-9_]+\b', query)
        stopwords = {"what", "is", "where", "how", "does", "the", "in", "my", "project", "explain", "trace", "find", "this", "can", "why"}
        return [w for w in words if w.lower() not in stopwords and len(w) > 2]

    def retrieve_relevant_code(self, query: str) -> Dict[str, Any]:
        """
        Orchestrates repository search for the LLM.
        """
        terms = self._extract_query_terms(query)
        if not terms:
            return {
                "status": "error",
                "error": "No meaningful search terms extracted",
                "candidates_found": 0,
                "candidates_selected": 0,
                "evidence": []
            }
            
        try:
            candidates = self.repository.search_code(terms, max_results=5)
            
            # Form final output format
            evidence_list = []
            for item in candidates:
                evidence_list.append(item)
                
            return {
                "status": "success",
                "error": None,
                "candidates_found": len(candidates),
                "candidates_selected": len(evidence_list),
                "evidence": evidence_list
            }
        except Exception as e:
            logger.error(f"Code retrieval service failed: {e}")
            return {
                "status": "error",
                "error": str(e),
                "candidates_found": 0,
                "candidates_selected": 0,
                "evidence": []
            }
