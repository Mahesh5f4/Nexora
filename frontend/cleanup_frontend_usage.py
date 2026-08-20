import re

# 1. App.tsx
app_tsx = r"C:\Users\saikr\OneDrive\Desktop\Springboot projects\RAG BOT\event-management-system\frontend\src\App.tsx"
with open(app_tsx, 'r') as f:
    text = f.read()
text = re.sub(r"const Usage = lazy\(\(\) => import\('\./pages/workspace/Usage'\)\);\n?", "", text)
text = re.sub(r"<Route path=\"/workspace/usage\".*?/>\n?", "", text)
with open(app_tsx, 'w') as f:
    f.write(text)

# 2. Navbar.jsx
navbar = r"C:\Users\saikr\OneDrive\Desktop\Springboot projects\RAG BOT\event-management-system\frontend\src\components\Navbar.jsx"
with open(navbar, 'r') as f:
    text = f.read()
text = re.sub(r"\s*\{\s*label:\s*'Usage & Quota',\s*to:\s*'/workspace/usage',\s*private:\s*true\s*\},?", "", text)
with open(navbar, 'w') as f:
    f.write(text)

# 3. api.js
api_js = r"C:\Users\saikr\OneDrive\Desktop\Springboot projects\RAG BOT\event-management-system\frontend\src\services\api.js"
with open(api_js, 'r') as f:
    text = f.read()
text = re.sub(r"\s*getUsage:\s*\(\)\s*=>\s*api\.get\('/ai/usage'\),?", "", text)
with open(api_js, 'w') as f:
    f.write(text)

# 4. Generate, Research, Plan error handling
def remove_usage_limit(file_path):
    with open(file_path, 'r') as f:
        text = f.read()
    
    # We want to remove the specific lines where it checks for usage limit
    # e.g., if (err.response?.status === 403 || err.message?.includes('Usage limit')) { setError(...); return; }
    # Or just specifically the setError("Usage limit reached. Please try again after your current session resets.");
    
    # Let's replace specifically the string.
    text = re.sub(
        r"""if\s*\([^)]*403[^)]*Usage limit[^)]*\)\s*\{[^}]*setError\([^)]*"Usage limit reached[^)]*"\);[^}]*return;\s*\}""",
        "", text, flags=re.DOTALL
    )
    # Or if it's slightly different, let's just use a simpler regex
    text = re.sub(
        r"if\s*\([^\{]+Usage limit[^\}]+setError\(\"Usage limit reached[^\}]+\}", 
        "", text, flags=re.DOTALL
    )
    with open(file_path, 'w') as f:
        f.write(text)

remove_usage_limit(r"C:\Users\saikr\OneDrive\Desktop\Springboot projects\RAG BOT\event-management-system\frontend\src\pages\workspace\Generate.jsx")
remove_usage_limit(r"C:\Users\saikr\OneDrive\Desktop\Springboot projects\RAG BOT\event-management-system\frontend\src\pages\workspace\Research.jsx")
remove_usage_limit(r"C:\Users\saikr\OneDrive\Desktop\Springboot projects\RAG BOT\event-management-system\frontend\src\pages\workspace\Plan.jsx")
