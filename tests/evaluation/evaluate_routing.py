import json
import sys
import os

# Add ai-service to path
sys.path.append(os.path.abspath('ai-service'))

try:
    from app.agent.graph import AgentGraph
    from app.agent.state import AgentState
except ImportError as e:
    print(f"Failed to import graph: {e}")
    sys.exit(1)

with open("agent_routing_dataset.json", "r") as f:
    dataset = json.load(f)

from unittest.mock import MagicMock
mock_rag = MagicMock()
graph_manager = AgentGraph(mock_rag)


results = {
    "total": len(dataset),
    "correct": 0,
    "incorrect": 0,
    "accuracy": 0.0,
    "per_category": {}
}

for item in dataset:
    query = item["input"]
    category = item["category"]
    expected = item["expected_route"]
    
    if category not in results["per_category"]:
        results["per_category"][category] = {"total": 0, "correct": 0}
        
    results["per_category"][category]["total"] += 1
    
    # Simulate routing logic
    # In graph.py, `classify_question` sets `needs_web`, `needs_rag`, `needs_memory`, `needs_code_retrieval`
    # Then `route_classification` checks these flags.
    
    state = AgentState(query=query)
    # 1. Run classifier node
    new_state = graph_manager.classify_question(state)
    state.update(new_state)
    
    # 2. Run router function
    actual = graph_manager.route_classification(state)
    
    if actual == expected:
        results["correct"] += 1
        results["per_category"][category]["correct"] += 1
    else:
        results["incorrect"] += 1
        print(f"FAILED: '{query}' -> Expected: {expected}, Got: {actual} (Flags: {new_state})")

results["accuracy"] = (results["correct"] / results["total"]) * 100

with open("agent_routing.json", "w") as f:
    json.dump(results, f, indent=2)

print(f"Routing Evaluation Complete. Accuracy: {results['accuracy']}%")
