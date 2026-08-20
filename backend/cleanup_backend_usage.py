import re

# 1. PythonAiServiceClient.java
client_java = r"C:\Users\saikr\OneDrive\Desktop\Springboot projects\RAG BOT\event-management-system\backend\auth-service\src\main\java\com\EventmanagementbyMahesh\event\ai\document\client\PythonAiServiceClient.java"
with open(client_java, 'r') as f:
    text = f.read()

# Replace TOO_MANY_REQUESTS block
text = re.sub(r"""\s*if\s*\([^)]*HttpStatus\.TOO_MANY_REQUESTS\)\s*\{\s*throw\s*new\s*com\.EventmanagementbyMahesh\.event\.ai\.exception\.UsageExhaustedException[^;]*;\s*\}""", "", text)
# Replace onError.accept UsageExhaustedException
text = re.sub(r"""\s*if\s*\([^)]*429[^)]*\)\s*\{\s*onError\.accept\(new\s*com\.EventmanagementbyMahesh\.event\.ai\.exception\.UsageExhaustedException[^;]*;\s*return;\s*\}""", "", text)

with open(client_java, 'w') as f:
    f.write(text)

# 2. ConversationService.java
conv_java = r"C:\Users\saikr\OneDrive\Desktop\Springboot projects\RAG BOT\event-management-system\backend\auth-service\src\main\java\com\EventmanagementbyMahesh\event\ai\chat\service\ConversationService.java"
with open(conv_java, 'r') as f:
    text = f.read()

text = re.sub(r"""\s*\}\s*catch\s*\(com\.EventmanagementbyMahesh\.event\.ai\.exception\.UsageExhaustedException\s*e\)\s*\{[^}]*\}""", "", text)

with open(conv_java, 'w') as f:
    f.write(text)

# 3. ai-service evaluator.py
evaluator_py = r"C:\Users\saikr\OneDrive\Desktop\Springboot projects\RAG BOT\event-management-system\ai-service\app\agent\evaluator.py"
with open(evaluator_py, 'r') as f:
    text = f.read()

text = re.sub(r"""\s*if\s*status_code\s*==\s*429:[^e]*elif""", "\n            if", text)
text = re.sub(r"""\s*USAGE_EXHAUSTED\s*=\s*"USAGE_EXHAUSTED\"""", "", text)

with open(evaluator_py, 'w') as f:
    f.write(text)

# 4. ai-service graph.py
graph_py = r"C:\Users\saikr\OneDrive\Desktop\Springboot projects\RAG BOT\event-management-system\ai-service\app\agent\graph.py"
with open(graph_py, 'r') as f:
    text = f.read()

text = re.sub(r"""\s*if\s*status\s*==\s*"USAGE_EXHAUSTED":[^:]*:\s*raise\s*HTTPException\(status_code=429,\s*detail=reason\)""", "", text)
text = re.sub(r'"429",\s*', "", text)
with open(graph_py, 'w') as f:
    f.write(text)

