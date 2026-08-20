# Nexora AI Agents Documentation

The Nexora AI Service uses a **LangGraph-based Orchestrator** to handle user queries. Rather than a single monolithic prompt, the system relies on specialized "Agents" (or execution paths) tailored to specific intents. 

This document details each agent within the `AgentGraph`, how it operates, and how it utilizes the LLM Gateway for generation.

---

## 1. Intent Classification (The Orchestrator)
When a user sends a query, the LangGraph `AgentState` starts at the `classify_question` node. 
Instead of wasting LLM tokens on classification, the system uses deterministic regex pattern matching to route the query to the correct Agent path.

- **RAG Patterns:** `\bmy document\b`, `\buploaded\b`
- **Web Patterns:** `\blatest\b`, `\bnews\b`, `\btoday\b`
- **Code Patterns:** `\btrace this api\b`, `\bwhere is .* implemented\b`
- **Memory Patterns:** `\bmy favorite\b`, `\bi prefer\b`
- **Analysis Patterns:** `\banalyze\b`, `\broot cause\b`

Once the intent is determined, the Orchestrator delegates the work to one or more of the following specialized Agents.

---

## 2. The Specialized Agents

### 🤖 1. The RAG Agent (Document Retrieval)
**Purpose:** Answers questions based on private documents uploaded by the user.
* **How it works:** 
  1. The Orchestrator flags `needs_rag = True`.
  2. The `DocumentRetrievalTool` uses `RAGService` to query a **Qdrant Vector Database**.
  3. It performs a similarity search to fetch the top `K` most relevant chunks of the user's documents.
* **LLM Usage:** 
  - The retrieved chunks are packaged into an `EvidenceItem` array.
  - The Spring Boot LLM Gateway is called to synthesize a final answer using the prompt: *"Answer the user's question using ONLY the provided document evidence."*

### 🌐 2. The Web Research Agent
**Purpose:** Answers questions requiring current, real-time, or external factual data (e.g., sports scores, stock prices, news).
* **How it works:**
  1. Triggered by words like "latest" or "today".
  2. Uses the `WebResearchTool` powered by the **Tavily API**.
  3. Tavily scrapes the web and returns concise search results.
* **LLM Usage:**
  - The search results are injected into the context window.
  - The LLM Gateway is instructed to construct a factual response based strictly on the provided web search context, ensuring hallucinations are minimized.

### 💾 3. The Memory Agent (Personalization)
**Purpose:** Remembers user preferences and long-term facts across sessions (e.g., "My favorite framework is React").
* **How it works:**
  1. The `extract_user_memory` node inspects every incoming query.
  2. It first attempts deterministic extraction using regex (e.g., `my favorite (.+) is (.+)`).
  3. It saves the extracted fact into Qdrant tied to the `user_id`.
* **LLM Usage:**
  - **Extraction Fallback:** If regex fails but the query contains "I", "my", or "me", the Memory Agent makes a cheap, low-temperature LLM call to extract the fact (e.g., `Extract facts about a user... Output ONLY the fact or NONE`).
  - **Recall:** On subsequent queries, the user's saved facts are fetched and appended to the LLM's system prompt as `[USER FACT]`, guiding the LLM to provide personalized answers.

### 💻 4. The Code Researcher Agent
**Purpose:** Navigates and explains the Nexora codebase (Trace APIs, locate implementations).
* **How it works:**
  1. Triggered by software engineering intents.
  2. Uses the `CodeRetrievalService` acting on a `LocalRepositorySource`.
  3. It scans the local file system (or a vector-indexed representation of the codebase) to find relevant classes and methods.
* **LLM Usage:**
  - Code snippets are sent to the LLM Gateway as evidence. The LLM is prompted to act as a Senior Software Engineer to explain the logic, trace the execution path, or identify bugs within the provided code context.

### 🧠 5. The Analyze Agent (Deep Reasoning)
**Purpose:** Performs complex, multi-step semantic evaluation rather than simple fact retrieval.
* **How it works:**
  1. Triggered by explicit analytical verbs ("evaluate", "diagnose", "pros and cons").
  2. It first collects evidence (either via RAG or Web).
  3. It uses a tiered semantic evidence evaluator (`EvidenceEvaluator`).
* **LLM Usage:**
  - The Analyze Agent may use the LLM twice in one graph execution. First, to evaluate the *quality* and *relevance* of the retrieved evidence (Tier-2 evaluation). Second, to perform a deep synthesis, generating pros/cons, root cause analysis, or comprehensive summaries.

### 🗺️ 6. The Plan Agent
**Purpose:** Generates structured roadmaps, implementation steps, and architectural designs.
* **How it works:**
  1. Triggered by "how to build", "create a plan", etc.
* **LLM Usage:**
  - Heavily relies on the LLM's internal reasoning capabilities. It formats the LLM's output into markdown steps, often utilizing the user's memory (e.g., tailoring a tech stack plan to the user's known favorite programming languages).

---

## 3. How the Agents Communicate with the LLMs

The Python LangGraph Agents **do not hold API keys** for OpenRouter.

Instead, whenever an Agent requires LLM generation or reasoning, it constructs an `AiExecuteRequest` (containing the constructed prompt, system instructions, and token limits) and uses the `spring_gateway_client` to make a REST call to the **Spring Boot LLM Gateway** (`POST /internal/ai/execute/stream`).

The Java Gateway then utilizes the OpenRouter provider, executes the request, and streams the tokens back to the Python Agent, which in turn streams them to the Frontend.
