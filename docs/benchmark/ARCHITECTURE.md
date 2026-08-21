# ThinkAction Architecture (Discovered)

## Frontend
- **Framework:** React / Vite
- **Deployment:** Netlify
- **Core Functionality:** User authentication, RAG document upload, Chat interface, Streaming responses (SSE).

## Backend (API Gateway)
- **Framework:** Java Spring Boot
- **Services:** `auth-service`, `common-library`
- **Core Responsibilities:**
  - JWT Authentication (Google OAuth + Email/Password)
  - Rate limiting & request routing
  - Proxies LLM streaming requests to the internal AI Service via Server-Sent Events (SSE)
  - Usage accounting / persistence (PostgreSQL + Redis)

## AI Service
- **Framework:** Python / FastAPI
- **Agent Orchestrator:** LangGraph & LangChain
- **LLM Gateway:** `execute_prompt_stream` wrapped around Gemini via OpenAI-compatible endpoints.
- **RAG System:** Qdrant (Vector Database) for fast cosine similarity text retrieval. Document chunking and embedding.
- **Web Search:** Tavily API
- **Graph Nodes (Agent Routing):**
  - `classify_question`: Determines if the request needs RAG, web search, memory, or direct LLM processing.
  - `extract_user_memory`: Context manager.
  - `collect_initial_evidence`: Queries Qdrant/Tavily.
  - `evaluate_evidence`: Checks if evidence is sufficient.
  - `refine_query` / `search_again`: Loops back for better evidence.
  - `analyze_evidence` / `generate_answer` / `direct_answer`: Final LLM synthesis.

## Infrastructure & Resilience
- **Hosting:** AWS EC2
- **Orchestration:** Docker Compose (Nginx, Postgres, Redis, Qdrant, Java Backend, Python AI)
- **Reverse Proxy:** Nginx (Proxy Buffering disabled for SSE streams)
- **Database:** PostgreSQL (Relational) & Redis (Cache/Sessions)
