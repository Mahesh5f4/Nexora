import pytest
import asyncio
from app.services.context_manager import ContextManagerService, ContextTooLargeException
from app.services.token_counter import SimpleEstimatorTokenCounter
from app.models.evidence import EvidenceItem
from app.core.config import settings

def test_token_counter_cache():
    counter = SimpleEstimatorTokenCounter()
    # Cache miss
    assert counter.count("test content") == 3
    # Cache hit
    assert counter.count("test content") == 3

def test_safety_bounds_stage_1():
    counter = SimpleEstimatorTokenCounter()
    manager = ContextManagerService(counter, model_context_limit=1000, reserved_output_tokens=100)
    
    # Create oversized evidence item
    content = "A" * (settings.safety_max_chars_per_rag_chunk + 100)
    evidence = [EvidenceItem(title="Test", source_type="document", content=content)]
    
    result = manager.build_context(system_prompt="", user_request="", messages=[], workflow_evidence=evidence)
    
    selected_ev = result.selected_evidence[0]
    # Should be truncated at the safety limit (Stage 1) BEFORE token budgeting
    expected_len = settings.safety_max_chars_per_rag_chunk + len("...\n[truncated]")
    assert len(selected_ev.content) == expected_len

def test_context_manager_concurrency():
    counter = SimpleEstimatorTokenCounter()
    manager = ContextManagerService(counter, model_context_limit=8192, reserved_output_tokens=1000)
    
    async def build_task(i):
        # Create some unique content for each task
        messages = [{"role": "user", "content": f"Hello from task {i}"}]
        evidence = [EvidenceItem(title=f"Doc {i}", source_type="document", content=f"Evidence for task {i}")]
        
        # CPU bound task wrapped in to thread in typical FastAPI, but here we just test sync logic
        # For concurrency safety, ContextManager is completely stateless.
        return manager.build_context(
            system_prompt="System",
            user_request=f"Request {i}",
            messages=messages,
            workflow_evidence=evidence
        )
    
    async def run_concurrent():
        tasks = [build_task(i) for i in range(50)]
        results = await asyncio.gather(*tasks)
        
        for i, res in enumerate(results):
            assert res.user_request == f"Request {i}"
            assert res.selected_messages[0]["content"] == f"Hello from task {i}"
            assert res.selected_evidence[0].content == f"Evidence for task {i}"
            
    asyncio.run(run_concurrent())

def test_total_evidence_chars_limit():
    counter = SimpleEstimatorTokenCounter()
    manager = ContextManagerService(counter, model_context_limit=8192, reserved_output_tokens=100)
    
    # Create multiple large evidence chunks that sum up to exactly over safety_max_total_evidence_chars
    content = "B" * settings.safety_max_chars_per_rag_chunk
    
    # Needs a lot of chunks to hit total
    num_chunks = (settings.safety_max_total_evidence_chars // settings.safety_max_chars_per_rag_chunk) + 5
    evidence = [EvidenceItem(title=f"Test {i}", source_type="document", content=content) for i in range(num_chunks)]
    
    result = manager.build_context(system_prompt="", user_request="", messages=[], workflow_evidence=evidence)
    
    # The number of selected items must be less than num_chunks because of the total size limit
    assert len(result.selected_evidence) < num_chunks

def test_token_budget_truncation():
    counter = SimpleEstimatorTokenCounter()
    manager = ContextManagerService(counter, model_context_limit=50, reserved_output_tokens=10) # 40 tokens remaining
    
    # 40 tokens = 160 characters. System + Request = 0.
    content = "C" * 200
    evidence = [EvidenceItem(title="Test", source_type="document", content=content)]
    
    result = manager.build_context(system_prompt="", user_request="", messages=[], workflow_evidence=evidence)
    
    # Stage 1 bounds wouldn't trigger (200 chars is fine).
    # Stage 2 Token limits will trigger: max 40 tokens.
    assert len(result.selected_evidence) == 1
    # keep_tokens = target_tokens - 4 = 40 - 4 = 36 tokens
    # keep_chars = 36 * 4 = 144 characters
    # Plus "...\n[truncated]"
    assert result.selected_evidence[0].content == ("C" * 144) + "...\n[truncated]"
