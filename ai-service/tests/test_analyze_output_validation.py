import pytest
from app.agent.validator import AnalysisOutputValidator
from app.models.evidence import EvidenceItem

class TestAnalyzeOutputValidation:
    @pytest.fixture
    def validator(self):
        return AnalysisOutputValidator()

    def test_valid_grounded_answer_passes(self, validator):
        text = "## Conclusion\nEverything looks good.\n## Reasoning\nBased on the evidence."
        evidence = [EvidenceItem(source_type="document", title="doc1", content="looks good", document_id="d1", chunk_id="c1")]
        result = validator.validate(text, evidence)
        assert result["status"] == "PASS"
        assert result["validated_text"] == text

    def test_empty_answer_fails(self, validator):
        text = "   "
        evidence = [EvidenceItem(source_type="document", title="doc1", content="data", document_id="d1", chunk_id="c1")]
        result = validator.validate(text, evidence)
        assert result["status"] == "FAIL"
        assert "empty" in result["warnings"][0]

    def test_fabricated_url_fails(self, validator):
        text = "Check out https://fake.url.com for more."
        evidence = [EvidenceItem(source_type="web", title="doc1", content="data", url="https://real.url.com")]
        result = validator.validate(text, evidence)
        assert result["status"] == "FAIL"
        assert "fabricated source URL detected" in result["warnings"]

    def test_valid_evidence_url_passes(self, validator):
        text = "## Conclusion\nCheck out https://real.url.com for more."
        evidence = [EvidenceItem(source_type="web", title="doc1", content="data", url="https://real.url.com")]
        result = validator.validate(text, evidence)
        assert result["status"] == "PASS"

    def test_fabricated_date_fails(self, validator):
        text = "## Conclusion\nPublished on 2026-08-10."
        evidence = [EvidenceItem(source_type="web", title="doc1", content="data", published_date="2025-01-01")]
        result = validator.validate(text, evidence)
        assert result["status"] == "FAIL"
        assert "fabricated publication date detected" in result["warnings"]

    def test_evidence_backed_date_passes(self, validator):
        text = "## Conclusion\nPublished on 2026-08-10."
        evidence = [EvidenceItem(source_type="web", title="doc1", content="data", published_date="2026-08-10")]
        result = validator.validate(text, evidence)
        assert result["status"] == "PASS"

    def test_date_in_content_passes(self, validator):
        text = "## Conclusion\nIt happened on 2026-08-10."
        evidence = [EvidenceItem(source_type="document", title="doc1", content="The incident occurred on 2026-08-10.", document_id="d1", chunk_id="c1")]
        result = validator.validate(text, evidence)
        assert result["status"] == "PASS"

    def test_strong_unsupported_certainty_warning(self, validator):
        text = "## Conclusion\nThis definitely proves the issue."
        # No evidence
        evidence = []
        result = validator.validate(text, evidence)
        assert result["status"] == "WARNING"
        assert "certainty_warning" in result["warnings"]

    def test_contradiction_ignored_warning(self, validator):
        text = "## Conclusion\nThe locking strategy is optimistic."
        evidence = [EvidenceItem(source_type="document", title="doc1", content="[CONTRADICTION_CANDIDATE] optimistic locking", document_id="d1", chunk_id="c1")]
        result = validator.validate(text, evidence)
        assert result["status"] == "WARNING"
        assert "contradiction_warning" in result["warnings"]

    def test_contradiction_acknowledged_passes(self, validator):
        text = "## Conclusion\nSources conflict on whether it is optimistic or pessimistic."
        evidence = [EvidenceItem(source_type="document", title="doc1", content="[CONTRADICTION_CANDIDATE] optimistic locking", document_id="d1", chunk_id="c1")]
        result = validator.validate(text, evidence)
        assert result["status"] == "PASS"
        assert result["contradiction_warning"] is False

    def test_missing_optional_heading_passes(self, validator):
        text = "## Conclusion\nGood.\n## Reasoning\nGood."
        evidence = [EvidenceItem(source_type="document", title="doc1", content="data", document_id="d1", chunk_id="c1")]
        result = validator.validate(text, evidence)
        # Score should be 2 (Conclusion, Reasoning)
        assert result["structure_score"] == 2
        assert result["status"] == "PASS"

    def test_completely_unstructured_response_warning(self, validator):
        text = "It just seems like a bad idea overall."
        evidence = [EvidenceItem(source_type="document", title="doc1", content="data", document_id="d1", chunk_id="c1")]
        result = validator.validate(text, evidence)
        assert result["structure_score"] == 0
        assert result["status"] == "WARNING"
        assert "unstructured_response" in result["warnings"]
