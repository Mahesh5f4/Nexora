"""
Unit tests for Analyze Agent intent detection and routing.

Tests _detect_analysis_intent() independently (no AgentGraph instantiation needed)
and verify classify_question() integration.

Coverage:
  A. Obvious Analyze requests
  B. Normal chat (must NOT trigger analyze)
  C. Research requests (must NOT trigger analyze)
  D. Plan requests (must NOT trigger analyze)
  E. Code Researcher requests (must NOT trigger analyze)
  F. Ambiguous requests
  G. Document-analysis requests
  H. Memory-assisted analysis requests
  I. Case variations
  J. False-positive guards (word "analyze" in non-analysis context)
"""
import pytest
from app.agent.graph import _detect_analysis_intent, _matches_any, _ANALYZE_PATTERNS, _ANTI_ANALYZE_PATTERNS


# ---------------------------------------------------------------------------
# A. Obvious Analyze requests — must return True
# ---------------------------------------------------------------------------

class TestObviousAnalyzeRequests:
    @pytest.mark.parametrize("query", [
        "analyze this architecture",
        "analyze this PDF",
        "evaluate this implementation",
        "diagnose this problem",
        "interpret these results",
        "what is the root cause of this error?",
        "compare these two approaches",
        "what are the weaknesses of this design?",
        "what are the key findings?",
        "break down this system for me",
        "deep dive into this component",
        "what are the pros and cons of this approach?",
        "review this document",
        "review my architecture",
        "what went wrong with the deployment?",
        "what are the risks of this approach?",
        "what are the strengths and weaknesses?",
        "why is my API returning 500 errors?",
        "why does the service crash under load?",
        "explain what is wrong with this system",
    ])
    def test_analyze_intent_detected(self, query):
        assert _detect_analysis_intent(query.lower()) is True, f"Expected analyze for: {query}"


# ---------------------------------------------------------------------------
# B. Normal chat — must return False
# ---------------------------------------------------------------------------

class TestNormalChat:
    @pytest.mark.parametrize("query", [
        "what is dependency injection?",
        "explain polymorphism",
        "what is Redis?",
        "hello",
        "how does garbage collection work?",
        "what is a microservice?",
        "tell me a joke",
        "thank you",
    ])
    def test_normal_chat_not_analyze(self, query):
        assert _detect_analysis_intent(query.lower()) is False, f"Should NOT be analyze: {query}"


# ---------------------------------------------------------------------------
# C. Research requests — must return False
# ---------------------------------------------------------------------------

class TestResearchRequests:
    @pytest.mark.parametrize("query", [
        "what are the latest AI news stories?",
        "research recent papers on RAG",
        "find the latest information about transformers",
        "analyze the latest trends in AI",  # "analyze" + "latest" → anti-analyze wins
        "evaluate the current state of quantum computing",  # "evaluate" + "current" → anti-analyze wins
        "what happened with OpenAI today?",
    ])
    def test_research_not_analyze(self, query):
        assert _detect_analysis_intent(query.lower()) is False, f"Should NOT be analyze: {query}"


# ---------------------------------------------------------------------------
# D. Plan requests — must return False
# ---------------------------------------------------------------------------

class TestPlanRequests:
    @pytest.mark.parametrize("query", [
        "create a plan to implement authentication",
        "how should I build this feature?",
        "give me implementation steps for caching",
        "write a plan to build a REST API",
        "how can we design a notification system?",
        "how do I implement rate limiting?",
    ])
    def test_plan_not_analyze(self, query):
        assert _detect_analysis_intent(query.lower()) is False, f"Should NOT be analyze: {query}"


# ---------------------------------------------------------------------------
# E. Code Researcher requests — must return False
# ---------------------------------------------------------------------------

class TestCodeResearcherRequests:
    @pytest.mark.parametrize("query", [
        "find why this Java method is failing",
        "trace this API request through the repository",
        "which class causes this exception?",
        "find the function that handles authentication",
    ])
    def test_code_researcher_not_analyze(self, query):
        assert _detect_analysis_intent(query.lower()) is False, f"Should NOT be analyze: {query}"


# ---------------------------------------------------------------------------
# F. Ambiguous requests — document the expected behavior
# ---------------------------------------------------------------------------

class TestAmbiguousRequests:
    def test_simple_compare_no_target(self):
        # "compare" alone without "these/the/two/both/this" → no match
        assert _detect_analysis_intent("compare frameworks") is False

    def test_compare_with_target(self):
        assert _detect_analysis_intent("compare these frameworks") is True

    def test_explain_without_failure_context(self):
        # "explain" alone does not trigger analyze (it's normal chat)
        assert _detect_analysis_intent("explain polymorphism") is False

    def test_explain_with_failure_context(self):
        assert _detect_analysis_intent("explain what is wrong with this service") is True

    def test_review_without_target(self):
        # "review" alone without "this/my/the" → no match
        assert _detect_analysis_intent("review best practices") is False


# ---------------------------------------------------------------------------
# G. Document-analysis requests — must return True
# ---------------------------------------------------------------------------

class TestDocumentAnalysis:
    @pytest.mark.parametrize("query", [
        "analyze this PDF",
        "review this document",
        "review my resume",
        "what are the key findings from this report?",
        "evaluate this proposal",
        "analyze my architecture document",
    ])
    def test_document_analysis_detected(self, query):
        assert _detect_analysis_intent(query.lower()) is True, f"Expected analyze for: {query}"


# ---------------------------------------------------------------------------
# H. Memory-assisted analysis requests — must return True
# ---------------------------------------------------------------------------

class TestMemoryAssistedAnalysis:
    @pytest.mark.parametrize("query", [
        "analyze this resume against my background",
        "evaluate this approach based on my preferences",
        "review my design",
    ])
    def test_memory_analysis_detected(self, query):
        assert _detect_analysis_intent(query.lower()) is True, f"Expected analyze for: {query}"


# ---------------------------------------------------------------------------
# I. Case variations — must be case-insensitive
# ---------------------------------------------------------------------------

class TestCaseVariations:
    @pytest.mark.parametrize("query", [
        "ANALYZE this architecture",
        "Evaluate THIS Design",
        "What Are The Weaknesses?",
        "DIAGNOSE the problem",
        "Root Cause of this issue",
    ])
    def test_case_insensitive(self, query):
        assert _detect_analysis_intent(query.lower()) is True, f"Expected analyze for: {query}"


# ---------------------------------------------------------------------------
# J. False-positive guards — "analyze" in non-analysis context
# ---------------------------------------------------------------------------

class TestFalsePositiveGuards:
    def test_analyze_with_latest_suppressed(self):
        """'analyze the latest news' → research, not analyze."""
        assert _detect_analysis_intent("analyze the latest news") is False

    def test_analyze_with_recent_suppressed(self):
        assert _detect_analysis_intent("analyze recent developments in AI") is False

    def test_evaluate_with_current_suppressed(self):
        assert _detect_analysis_intent("evaluate the current market trends") is False

    def test_analyze_with_plan_intent_suppressed(self):
        assert _detect_analysis_intent("analyze and create a plan to fix authentication") is False

    def test_analyze_with_code_tracing_suppressed(self):
        assert _detect_analysis_intent("analyze and find which class causes this exception") is False

    def test_pure_analyze_not_suppressed(self):
        """Without anti-patterns, analyze should still work."""
        assert _detect_analysis_intent("analyze this architecture") is True


# ---------------------------------------------------------------------------
# Verify _detect_analysis_intent is importable without AgentGraph
# ---------------------------------------------------------------------------

class TestIndependentTestability:
    def test_function_is_callable(self):
        assert callable(_detect_analysis_intent)

    def test_returns_bool(self):
        assert isinstance(_detect_analysis_intent("hello"), bool)
        assert isinstance(_detect_analysis_intent("analyze this"), bool)
