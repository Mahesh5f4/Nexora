from app.dependencies import get_rag_service

rag_service = get_rag_service()

user_id = "test_user_mahesh_fresh_brain"
print("Initial memories:", rag_service.list_user_memory(user_id))

rag_service.add_user_memory(user_id, "User loves Spring Boot")
rag_service.add_user_memory(user_id, "User's name is Mahesh")
rag_service.add_user_memory(user_id, "User is preparing for DevOps roles")

print("After add memories:", rag_service.list_user_memory(user_id))
