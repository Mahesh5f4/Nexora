# Nexora Complete Architecture Flow (Frontend to LLM Gateway)

This document outlines the exact request flow and architecture for AI chat and streaming interactions in the Nexora Event Booking Platform. You can use this reference to understand where API keys, configurations, and network calls are managed.

## 1. High-Level Overview

The system uses a 3-tier architecture for AI processing:
1. **Frontend (React/Vite)**: Manages UI and client-side streaming.
2. **Backend (Spring Boot / Auth-Service)**: Acts as the main entry point, security gateway, and the **LLM Gateway** (Provider routing).
3. **AI Service (Python/FastAPI)**: Manages the LangGraph agent logic, RAG, and Web Search orchestration.

When a user asks a question, the request originates at the Frontend, goes to the Backend, is forwarded to the AI Service for orchestration, and the AI Service calls *back* to the Backend (acting as an LLM Gateway) to actually execute the LLM prompts.

## 2. Detailed Request Flow (Step-by-Step)

### Step 1: Frontend Request Initiation
- **File**: `frontend/src/hooks/useAgentStream.js` and `frontend/src/services/api.js`
- **Action**: The user submits a prompt. The frontend calls the backend API at `POST /api/messages/stream` (proxied to `http://localhost:8081`).
- **Data format**: SSE (Server-Sent Events) connection is established.

### Step 2: Spring Boot Backend (Main Controller)
- **File**: `backend/auth-service/src/main/java/.../ai/chat/controller/ConversationController.java`
- **Action**: Receives the request, verifies authentication (JWT), and passes it to `ConversationService`.
- **File**: `backend/auth-service/src/main/java/.../ai/chat/service/ConversationService.java`
- **Action**: Packages the conversation history and uses `PythonAiServiceClient` to forward the request to the Python AI Service via an internal REST call.
- **Port**: Communicates from `8081` -> `8002` (AI Service).

### Step 3: Python AI Service (Agent Orchestration)
- **File**: `ai-service/app/api/internal_agent.py` (`POST /stream`)
- **Action**: Receives the request. Authenticates using `AI_SERVICE_INTERNAL_TOKEN`.
- **File**: `ai-service/app/agent/graph.py` (LangGraph)
- **Action**: The request enters the LangGraph `AgentState`. The agent classifies the intent, performs RAG (via Qdrant) or Web Search (via Tavily), and prepares the final prompt for the LLM.
- **File**: `ai-service/app/clients/spring_gateway_client.py`
- **Action**: To execute the actual LLM generation, the AI service calls *back* to the Spring Boot backend using its LLM Gateway endpoints (`POST /internal/ai/execute/stream`).
- **Port**: Communicates from `8002` -> `8081` (Backend).

### Step 4: Spring Boot Backend (LLM Gateway / Provider Routing)
- **File**: `backend/auth-service/src/main/java/.../ai/gateway/InternalAiController.java`
- **Action**: Receives the execution request from the Python service.
- **File**: `backend/auth-service/src/main/java/.../ai/service/AiExecutionService.java`
- **Action**: Delegates to `ProviderSelectionService`.
- **File**: `backend/auth-service/src/main/java/.../ai/service/ProviderSelectionService.java`
- **Action**: Checks health, API key configuration, and uses a `RoutingStrategy` (e.g., Round Robin) to select the appropriate LLM provider.
- **Providers Available**:
  - `OpenRouterProvider.java`

### Step 5: External LLM Execution
- **Action**: The selected Provider (e.g., `OpenRouterProvider`) makes the actual HTTP POST request to the external AI provider's API.
- **Streaming**: The provider receives Server-Sent Events (SSE) from the external API, parses the JSON tokens, and emits them.

### Step 6: Stream Response Cascade
The individual tokens stream back through the established connections in reverse:
1. **External API** -> `[Provider].java`
2. `[Provider].java` -> `AiExecutionService.java` -> `InternalAiController.java`
3. `InternalAiController.java` -> `spring_gateway_client.py`
4. `spring_gateway_client.py` -> `internal_agent.py`
5. `internal_agent.py` -> `ConversationService.java`
6. `ConversationService.java` -> `ConversationController.java`
7. `ConversationController.java` -> Frontend (`useAgentStream.js`)
8. Frontend updates the React state to display the text word-by-word with the blinking cursor (`.stream-cursor`).

## 3. Configuration & API Keys

### Backend (`backend/.env` & `backend/auth-service/src/main/resources/application.yml`)
- Provides keys for the LLM Gateway:
  - `OPENROUTER_API_KEY`
- Internal security token for inter-service calls:
  - `AI_SERVICE_INTERNAL_TOKEN`

### AI Service (`ai-service/.env`)
- External search APIs:
  - `TAVILY_API_KEY` (Web Search)
  - `QDRANT_API_KEY` (Vector DB, if hosted remotely)
- Internal security token matching the backend:
  - `AI_SERVICE_INTERNAL_TOKEN`

## 4. Key Takeaways for Modifying API Keys / Routing

If you are modifying how API keys are handled, cycled, or how providers are chosen:
1. **The AI Service (Python) does NOT hold LLM keys.** It relies entirely on the Spring Boot backend (`InternalAiController`) to execute prompts.
2. **Provider Selection** logic lives entirely in `ProviderSelectionService.java` and the implementations of `LlmProvider.java`.
3. If you want to change the active model or provider dynamically based on the key, you must modify the Spring Boot `ProviderRegistry` and `LlmProvider` implementations.
