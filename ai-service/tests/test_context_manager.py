import pytest
from app.services.token_counter import SimpleEstimatorTokenCounter
from app.services.context_manager import ContextManagerService, ContextTooLargeException

def test_empty_conversation():
    counter = SimpleEstimatorTokenCounter()
    manager = ContextManagerService(counter, model_context_limit=1000, reserved_output_tokens=100)
    
    result = manager.build_context(system_prompt="You are a bot", user_request="Hi")
    assert result.system_token_estimate == 4
    assert result.request_token_estimate == 1
    assert result.history_token_estimate == 0
    assert result.total_input_token_estimate == 5
    assert result.final_available_budget == 900
    assert len(result.selected_messages) == 0

def test_single_message():
    counter = SimpleEstimatorTokenCounter()
    manager = ContextManagerService(counter, model_context_limit=1000, reserved_output_tokens=100)
    
    messages = [{"content": "Hello!"}]
    result = manager.build_context(system_prompt="You are a bot", user_request="Hi", messages=messages)
    assert len(result.selected_messages) == 1
    assert result.history_token_estimate == 2

def test_multiple_messages_ordering():
    counter = SimpleEstimatorTokenCounter()
    manager = ContextManagerService(counter, model_context_limit=1000, reserved_output_tokens=100)
    
    messages = [
        {"content": "Msg 1", "id": 1},
        {"content": "Msg 2", "id": 2},
        {"content": "Msg 3", "id": 3}
    ]
    result = manager.build_context(system_prompt="You are a bot", user_request="Hi", messages=messages)
    assert len(result.selected_messages) == 3
    assert result.selected_messages[0]["id"] == 1
    assert result.selected_messages[2]["id"] == 3

def test_recent_message_selection():
    counter = SimpleEstimatorTokenCounter()
    # Very small budget to force truncation
    manager = ContextManagerService(counter, model_context_limit=24, reserved_output_tokens=0)
    
    messages = [
        {"content": "A" * 100, "id": 1},
        {"content": "Msg 2", "id": 2},
        {"content": "Msg 3", "id": 3}
    ]
    
    result = manager.build_context(system_prompt="You are a bot", user_request="Hi", messages=messages)
    assert len(result.selected_messages) == 3
    assert "[truncated]" in result.selected_messages[0]["content"]
    assert result.total_input_token_estimate <= 24

def test_context_too_large_exception():
    counter = SimpleEstimatorTokenCounter()
    manager = ContextManagerService(counter, model_context_limit=10, reserved_output_tokens=5)
    
    with pytest.raises(ContextTooLargeException):
        manager.build_context(system_prompt="A" * 40, user_request="B")

def test_rag_and_web_evidence():
    counter = SimpleEstimatorTokenCounter()
    manager = ContextManagerService(counter, model_context_limit=1000, reserved_output_tokens=100)

    rag = [{"content": "rag info"}]
    web = [{"content": "web info"}]
    evidence = rag + web

    result = manager.build_context(system_prompt="sys", user_request="req", workflow_evidence=evidence)
    assert len(result.selected_evidence) == 2
    assert result.evidence_token_estimate > 0
