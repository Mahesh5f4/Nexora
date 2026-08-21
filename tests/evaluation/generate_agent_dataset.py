import json
import random

templates = {
    "RAG": [
        "What does the document say about {}",
        "Summarize the section on {}",
        "Where in the text is {} mentioned?",
        "According to the uploaded file, how does {} work?",
        "Can you explain the {} process from the PDF?"
    ],
    "Web Research": [
        "Search the web for {}",
        "What is the latest news on {}?",
        "Look up {}",
        "Find recent articles about {}",
        "What is the current status of {} online?"
    ],
    "Memory": [
        "Do you remember my favorite {}?",
        "What did I say earlier about {}?",
        "Based on my experience with {}, what should I do?",
        "What are my skills in {}?",
        "Can you recall my {} preference?"
    ],
    "Code Research": [
        "Where is {} implemented?",
        "Find the source code for {}",
        "Trace this endpoint: {}",
        "Which class handles {}?",
        "In this repository, where is {}?"
    ],
    "Analysis": [
        "Analyze the root cause of {}",
        "What are the pros and cons of {}?",
        "Deep dive into {}",
        "Diagnose the issue with {}",
        "What are the weaknesses of {}?"
    ],
    "Planning": [
        "Create a roadmap for {}",
        "How should I build {}?",
        "Give me a step-by-step plan to implement {}",
        "Write a plan for {}",
        "How can we design {}?"
    ],
    "General": [
        "What is {}?",
        "How do you do {}?",
        "Tell me about {}",
        "Explain {} to me.",
        "Why is {} important?"
    ]
}

subjects = ["React", "Python", "Docker", "Machine Learning", "API Design", "Security", "Databases", "Cloud Computing", "Authentication", "Vector Search"]

dataset = []

for category, phrases in templates.items():
    for phrase in phrases:
        for _ in range(3): # 3 of each phrase = 15 per category
            subject = random.choice(subjects)
            query = phrase.format(subject)
            expected_route = ""
            if category in ["RAG", "Web Research"]:
                expected_route = "collect_initial_evidence"
            elif category in ["Memory", "General", "Analysis", "Planning", "Code Research"]:
                expected_route = "direct_answer"
                
            dataset.append({
                "input": query,
                "category": category,
                "expected_route": expected_route
            })

# We have 7 categories * 15 = 105. Let's slice exactly 100.
dataset = dataset[:100]

with open("tests/evaluation/agent_routing_dataset.json", "w") as f:
    json.dump(dataset, f, indent=2)

print(f"Generated {len(dataset)} queries.")
