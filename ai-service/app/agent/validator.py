import re
from typing import List, Dict, Any
from app.models.evidence import EvidenceItem

class AnalysisOutputValidator:
    def __init__(self):
        self.url_pattern = re.compile(r'https?://[^\s)\]"\']+')
        
        # Simple date regex to catch typical dates like "August 10, 2026", "2026-08-10", "10/08/2026"
        # We don't need a perfect regex, just one that catches the dates that might be hallucinated.
        # However, for simplicity and determinism without ML, we'll check if any explicit date-like string
        # exists in the evidence if it's found in the text.
        self.date_pattern = re.compile(r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b|\b\d{4}-\d{2}-\d{2}\b')

        self.certainty_words = {"definitely", "certainly", "guaranteed", "always", "never", "proves"}
        self.contradiction_acknowledgment_words = {"conflict", "contradict", "disagree", "unclear", "both", "differ", "discrepancy"}

        self.headings = {
            "conclusion", "key findings", "evidence", "reasoning", 
            "risks / limitations", "risks", "limitations", "recommended actions", "confidence"
        }

    def validate(self, text: str, evidence: List[EvidenceItem]) -> Dict[str, Any]:
        """
        Validates the generated text against the evidence.
        Returns a dictionary with status, warnings, and the validated text (or failure message).
        """
        if not text or not text.strip():
            return {
                "status": "FAIL",
                "validated_text": "The generated analysis could not be reliably validated against the available evidence. (Empty response)",
                "warnings": ["empty_response"],
                "structure_score": 0,
                "source_validation": "FAILED",
                "contradiction_warning": False
            }

        warnings = []
        status = "PASS"
        
        evidence_urls = {e.url for e in evidence if e.url}
        evidence_dates = {e.published_date for e in evidence if e.published_date}
        
        text_lower = text.lower()
        
        # 1. URL Validation
        found_urls = set(self.url_pattern.findall(text))
        for url in found_urls:
            # allow some basic formatting stripping
            url = url.rstrip('.,;')
            if url not in evidence_urls:
                # Fabricated URL
                return self._fail("fabricated source URL detected")

        # 2. Date Validation
        found_dates = set(self.date_pattern.findall(text))
        for date_str in found_dates:
            # Basic check: is this date mentioned in any evidence's published_date or content?
            date_in_evidence = False
            if date_str in evidence_dates:
                date_in_evidence = True
            else:
                for e in evidence:
                    if e.content and date_str in e.content:
                        date_in_evidence = True
                        break
            
            if not date_in_evidence:
                return self._fail(f"fabricated publication date detected")

        # 3. Certainty Validation
        has_certainty = any(word in text_lower for word in self.certainty_words)
        if has_certainty and not evidence:
            warnings.append("certainty_warning")
            status = "WARNING"

        # 4. Contradiction Validation
        has_contradiction_candidate = any("[CONTRADICTION_CANDIDATE]" in (e.content or "") for e in evidence)
        if has_contradiction_candidate:
            acknowledged = any(word in text_lower for word in self.contradiction_acknowledgment_words)
            if not acknowledged:
                warnings.append("contradiction_warning")
                status = "WARNING"

        # 5. Structure Validation
        structure_score = 0
        for heading in self.headings:
            if heading in text_lower:
                structure_score += 1
                
        if structure_score == 0:
            warnings.append("unstructured_response")
            status = "WARNING"

        return {
            "status": status,
            "validated_text": text,
            "warnings": warnings,
            "structure_score": structure_score,
            "source_validation": "PASS",
            "contradiction_warning": "contradiction_warning" in warnings
        }

    def _fail(self, reason: str) -> Dict[str, Any]:
        return {
            "status": "FAIL",
            "validated_text": "The generated analysis could not be reliably validated against the available evidence.",
            "warnings": [reason],
            "structure_score": 0,
            "source_validation": "FAILED",
            "contradiction_warning": False
        }
