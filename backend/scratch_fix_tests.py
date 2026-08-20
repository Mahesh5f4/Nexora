import sys
f = r'C:\Users\saikr\OneDrive\Desktop\Springboot projects\RAG BOT\event-management-system\backend\auth-service\src\test\java\com\EventmanagementbyMahesh\event\ai\chat\ConversationServiceSourceTest.java'
with open(f, 'r') as file:
    text = file.read()
text = text.replace('10L', '"10"')
text = text.replace('"1"', '1L')
with open(f, 'w') as file:
    file.write(text)
