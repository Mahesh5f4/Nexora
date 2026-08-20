import re

# 1. AdminService.java
admin_java = r"C:\Users\saikr\OneDrive\Desktop\Springboot projects\RAG BOT\event-management-system\backend\auth-service\src\main\java\com\EventmanagementbyMahesh\event\auth\admin\service\AdminService.java"
with open(admin_java, 'r') as f:
    text = f.read()

text = re.sub(r"import com\.EventmanagementbyMahesh\.event\.ai\.usage\.repository\.UsageSessionRepository;\n", "", text)
text = re.sub(r"\s*private final UsageSessionRepository usageSessionRepository;\n", "\n", text)
text = re.sub(r",\s*UsageSessionRepository usageSessionRepository", "", text)
text = re.sub(r"\s*this\.usageSessionRepository = usageSessionRepository;\n", "\n", text)
# We also need to remove usage limits from admin stats
text = re.sub(r"\s*long totalTokensUsed = usageSessionRepository\.findAll\(\)\.stream\(\)\s*\.mapToInt\(s -> s\.getTokensUsed\(\)\)\s*\.sum\(\);\n", "\n        long totalTokensUsed = 0;\n", text)
with open(admin_java, 'w') as f:
    f.write(text)

# 2. App.tsx
app_tsx = r"C:\Users\saikr\OneDrive\Desktop\Springboot projects\RAG BOT\event-management-system\frontend\src\App.tsx"
with open(app_tsx, 'r') as f:
    text = f.read()

# There is a syntax error because I left an unmatched tag.
# [builtin:vite-transform] Error: Expected corresponding JSX closing tag for 'Routes'.
# [builtin:vite-transform] Error: Unexpected token. Did you mean `{'}'}` or `&rbrace;`?
# 128 │                   </PrivateRoute>} />
# Let's fix it manually.
