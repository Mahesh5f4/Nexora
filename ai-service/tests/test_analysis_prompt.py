"""
Unit tests for the Analyze Agent prompt generation.

Tests verify that:
- ANALYSIS_SYSTEM_PROMPT contains all required behavioral clauses
- build_analysis_prompt() produces correct output for all input combinations
- No hardcoded project-specific facts are present
"""
import pytest
from app.services.rag_prompt_builder import RagPromptBuilder


@pytest.fixture
def builder():
    return RagPromptBuilder()


# ---------------------------------------------------------------------------
# ANALYSIS_SYSTEM_PROMPT content tests
# ---------------------------------------------------------------------------

class TestAnalysisSystemPrompt:
    """Verify ANALYSIS_SYSTEM_PROMPT contains all required behavioral clauses."""

    def test_contains_goal_understanding(self, builder):
        assert "GOAL UNDERSTANDING" in builder.ANALYSIS_SYSTEM_PROMPT

    def test_contains_evidence_hierarchy(self, builder):
        assert "EVIDENCE HIERARCHY" in builder.ANALYSIS_SYSTEM_PROMPT

    def test_contains_epistemic_labels(self, builder):
        prompt = builder.ANALYSIS_SYSTEM_PROMPT
        assert "[FACT]" in prompt
        assert "[INFERENCE]" in prompt
        assert "[UNCERTAINTY]" in prompt

    def test_contains_fabrication_rules(self, builder):
        prompt = builder.ANALYSIS_SYSTEM_PROMPT
        assert "FABRICATION RULES" in prompt
        assert "Never fabricate" in prompt
        assert "statistics" in prompt
        assert "Document contents" in prompt.lower() or "document contents" in prompt.lower()
        assert "URLs" in prompt or "urls" in prompt.lower()

    def test_contains_conflict_handling(self, builder):
        prompt = builder.ANALYSIS_SYSTEM_PROMPT
        assert "CONFLICT HANDLING" in prompt
        assert "silently" in prompt

    def test_contains_insufficient_evidence_clause(self, builder):
        prompt = builder.ANALYSIS_SYSTEM_PROMPT
        assert "INSUFFICIENT EVIDENCE" in prompt
        assert "missing" in prompt.lower()

    def test_contains_provenance_clause(self, builder):
        assert "PROVENANCE" in builder.ANALYSIS_SYSTEM_PROMPT

    def test_contains_no_code_generation(self, builder):
        prompt = builder.ANALYSIS_SYSTEM_PROMPT
        assert "Do not generate executable code" in prompt or "not generate executable code" in prompt

    def test_contains_no_implementation_plans_unless_asked(self, builder):
        prompt = builder.ANALYSIS_SYSTEM_PROMPT
        assert "implementation plan" in prompt.lower()
        assert "unless" in prompt.lower()

    def test_contains_no_code_modification(self, builder):
        prompt = builder.ANALYSIS_SYSTEM_PROMPT
        assert "modify" in prompt.lower() or "rewrite" in prompt.lower()

    def test_contains_document_usage(self, builder):
        assert "DOCUMENT" in builder.ANALYSIS_SYSTEM_PROMPT

    def test_contains_memory_usage(self, builder):
        assert "USER MEMORY" in builder.ANALYSIS_SYSTEM_PROMPT

    def test_contains_web_evidence_guard(self, builder):
        prompt = builder.ANALYSIS_SYSTEM_PROMPT
        assert "WEB" in prompt
        assert "Never claim to have performed web research" in prompt

    def test_contains_security_clause(self, builder):
        prompt = builder.ANALYSIS_SYSTEM_PROMPT
        assert "SECURITY" in prompt
        assert "untrusted" in prompt

    def test_no_hardcoded_project_names(self, builder):
        """The prompt must not contain project-specific facts."""
        prompt = builder.ANALYSIS_SYSTEM_PROMPT.lower()
        forbidden = ["thinkaction", "nexora", "springboot", "qdrant", "groq", "gemini", "tavily"]
        for term in forbidden:
            assert term not in prompt, f"Found hardcoded project term: {term}"

    def test_is_string(self, builder):
        assert isinstance(builder.ANALYSIS_SYSTEM_PROMPT, str)
        assert len(builder.ANALYSIS_SYSTEM_PROMPT) > 100

    def test_confidence_levels_mentioned(self, builder):
        prompt = builder.ANALYSIS_SYSTEM_PROMPT
        assert "High" in prompt
        assert "Medium" in prompt
        assert "Low" in prompt


# ---------------------------------------------------------------------------
# build_analysis_prompt() output tests
# ---------------------------------------------------------------------------

class TestBuildAnalysisPrompt:
    """Verify build_analysis_prompt() produces correct output for all input combinations."""

    def test_with_context_and_query(self, builder):
        result = builder.build_analysis_prompt("Compare A and B", "some evidence")
        assert "--- EVIDENCE ---" in result
        assert "some evidence" in result
        assert "--- ANALYSIS REQUEST ---" in result
        assert "Compare A and B" in result
        assert "[FACT]" in result
        assert "[INFERENCE]" in result
        assert "[UNCERTAINTY]" in result

    def test_without_context(self, builder):
        result = builder.build_analysis_prompt("Diagnose this issue", "")
        assert "--- EVIDENCE ---" not in result
        assert "No evidence was provided" in result
        assert "[UNCERTAINTY]" in result

    def test_with_messages_context(self, builder):
        result = builder.build_analysis_prompt(
            "Analyze this", "evidence here", messages_context="USER:\nPrevious question"
        )
        assert "USER:\nPrevious question" in result
        assert "--- EVIDENCE ---" in result

    def test_without_messages_context(self, builder):
        result = builder.build_analysis_prompt("Analyze this", "evidence here")
        assert "--- ANALYSIS REQUEST ---" in result

    def test_empty_context_triggers_insufficient_hint(self, builder):
        result = builder.build_analysis_prompt("What went wrong?", "")
        assert "No evidence was provided" in result

    def test_nonempty_context_no_insufficient_hint(self, builder):
        result = builder.build_analysis_prompt("What went wrong?", "some data")
        assert "No evidence was provided" not in result

    def test_returns_string(self, builder):
        result = builder.build_analysis_prompt("test", "test context")
        assert isinstance(result, str)

    def test_query_appears_in_output(self, builder):
        result = builder.build_analysis_prompt("Why is latency high?", "server logs here")
        assert "Why is latency high?" in result

    def test_existing_research_prompt_unchanged(self, builder):
        """Verify the existing research system_prompt is untouched."""
        assert "You are answering questions using the provided evidence" in builder.system_prompt
        assert "ANALYSIS" not in builder.system_prompt
