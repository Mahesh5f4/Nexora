import os
import re

files = [
    r'C:\Users\saikr\OneDrive\Desktop\Springboot projects\RAG BOT\event-management-system\frontend\src\pages\workspace\Generate.jsx',
    r'C:\Users\saikr\OneDrive\Desktop\Springboot projects\RAG BOT\event-management-system\frontend\src\components\general\GeneralMode.jsx',
    r'C:\Users\saikr\OneDrive\Desktop\Springboot projects\RAG BOT\event-management-system\frontend\src\components\researcher\ResearcherMode.jsx',
    r'C:\Users\saikr\OneDrive\Desktop\Springboot projects\RAG BOT\event-management-system\frontend\src\components\planner\PlannerMode.jsx',
    r'C:\Users\saikr\OneDrive\Desktop\Springboot projects\RAG BOT\event-management-system\frontend\src\components\knowledge\KnowledgeMode.jsx',
    r'C:\Users\saikr\OneDrive\Desktop\Springboot projects\RAG BOT\event-management-system\frontend\src\components\chat\CodeBlock.jsx',
    r'C:\Users\saikr\OneDrive\Desktop\Springboot projects\RAG BOT\event-management-system\frontend\src\components\chat\MessageItem.jsx',
    r'C:\Users\saikr\OneDrive\Desktop\Springboot projects\RAG BOT\event-management-system\frontend\src\components\analyze\AnalyzeMessage.jsx'
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'copyToClipboard' in content:
        return

    # Calculate relative path to src/utils/clipboard
    # All components are in src/components/... except Generate.jsx in src/pages/workspace
    if 'pages\\workspace' in filepath:
        import_stmt = "import { copyToClipboard } from '../../utils/clipboard';\n"
    elif 'components\\chat' in filepath:
        import_stmt = "import { copyToClipboard } from '../../utils/clipboard';\n"
    elif 'components\\' in filepath: # general, researcher, planner, knowledge, analyze
        import_stmt = "import { copyToClipboard } from '../../utils/clipboard';\n"
    else:
        import_stmt = "import { copyToClipboard } from '../utils/clipboard';\n"

    # Replace the actual line
    content = content.replace('navigator.clipboard.writeText', 'copyToClipboard')
    
    # Add import after the last import line
    lines = content.split('\n')
    last_import = -1
    for i, line in enumerate(lines):
        if line.startswith('import '):
            last_import = i
    
    if last_import != -1:
        lines.insert(last_import + 1, import_stmt.strip())
    else:
        lines.insert(0, import_stmt.strip())

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

for f in files:
    process_file(f)
