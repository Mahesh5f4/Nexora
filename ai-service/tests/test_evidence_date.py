import pytest
from app.models.evidence import EvidenceItem
from app.agent.search_provider import SearchResult, TavilyWebSearchProvider
from app.agent.evaluator import EvidenceEvaluator
from app.services.rag_prompt_builder import RagPromptBuilder
from unittest.mock import Mock, patch

def test_evidence_item_without_date():
    ev = EvidenceItem(source_type="web", title="Title", content="Content", url="http://example.com")
    assert ev.published_date is None

def test_evidence_item_with_date():
    ev = EvidenceItem(source_type="web", title="Title", content="Content", url="http://example.com", published_date="July 24, 2026")
    assert ev.published_date == "July 24, 2026"

def test_tavily_result_with_published_date():
    res = SearchResult(title="Title", url="http://example.com", snippet="Snippet", source="example.com", score=0.9, published_date="July 24, 2026")
    assert res.published_date == "July 24, 2026"

def test_tavily_result_without_published_date():
    res = SearchResult(title="Title", url="http://example.com", snippet="Snippet", source="example.com", score=0.9)
    assert res.published_date is None

def test_evaluator_receives_date():
    client = Mock()
    ev_eval = EvidenceEvaluator(client)
    ev = EvidenceItem(source_type="web", title="Title", content="Content", url="http://example.com", published_date="July 24, 2026")
    formatted = ev_eval._format_evidence_for_evaluator([ev])
    assert "Date: July 24, 2026" in formatted

def test_final_prompt_contains_date():
    builder = RagPromptBuilder()
    ev = EvidenceItem(source_type="web", title="Title", content="Content", url="http://example.com", published_date="July 24, 2026")
    context = builder.build_context([ev])
    assert "Published: July 24, 2026" in context

def test_missing_date_is_represented_safely():
    client = Mock()
    ev_eval = EvidenceEvaluator(client)
    ev = EvidenceItem(source_type="web", title="Title", content="Content", url="http://example.com")
    formatted = ev_eval._format_evidence_for_evaluator([ev])
    assert "Date: Not provided" in formatted

    builder = RagPromptBuilder()
    context = builder.build_context([ev])
    assert "Published: Not provided" not in context
    assert "Published:" not in context
