# Sprint 1 Architecture & AI Gateway Plan

## Current Backend Structure
The Spring Boot backend is structured as a multi-module Maven project consisting of:
* `event-parent` (Root POM)
* `common-library` (Shared utilities, config, exceptions)
* `auth-service` (Authentication and User Management)

The main application resides in the `auth-service` module under the `com.EventmanagementbyMahesh.event.auth` package.
The existing structure inside `auth-service` uses standard layered architecture:
* `AuthApplication.java` (Main Class)
* `controller/`
* `service/`
* `repository/`
* `entity/`
* `dto/`
* `security/`
* `config/`
* `common/`

Logging and metrics setup currently utilizes Logback/SLF4j. Exception handling is structured within standard Spring Boot paradigms.

## Current Frontend Structure
The frontend is a React 19 application built with Vite and TypeScript (though using JSX files primarily for UI).
* **Routing:** Managed via `react-router-dom`.
* **API Client:** Uses `axios`.
* **State Management:** Uses `@reduxjs/toolkit` and `react-redux`.
* **Key Workspace Pages:** The AI workspace is located in `src/pages/workspace/` and includes:
  * `Dashboard.jsx` (Landing page)
  * `Analyze.jsx`
  * `Generate.jsx`
  * `Plan.jsx`
  * `Research.jsx`

## Existing Dependencies
The project currently relies on standard Spring and React dependencies. 
**Backend (Spring Boot 3.2.5):**
* `spring-boot-starter-web`
* `spring-boot-starter-data-jpa`
* `spring-boot-starter-security`
* `spring-boot-starter-oauth2-client`
* `spring-boot-starter-data-redis`
* `spring-boot-starter-actuator` (Micrometer)
* `io.jsonwebtoken` (JJWT)
* `google-api-client`
* PostgreSQL Driver
* Redis

**Existing AI Dependencies:**
* Spring WebClient: **Does not exist**
* RestClient: **Available via spring-boot-starter-web (Spring 3.2+)**
* RestTemplate: **Available via spring-boot-starter-web**
* OkHttp: **Does not exist**
* Apache HTTP Client: **Does not exist**
* Spring AI: **Does not exist**
* LangChain/LangGraph (Java): **Does not exist**
* Resilience4j: **Does not exist**

## Existing AI Code
Based on a codebase scan for AI terminology (AI, LLM, Gemini, Groq, Cerebras, OpenRouter, OpenAI, LangChain, LangGraph, Qdrant, embedding, vector, prompt, chat, analyze, generate, research, plan):

* **Exists:** Environment variables for models (`GEMINI_API_KEY`, `GROQ_API_KEY`, `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY`) in `.env` and `docker-compose.yml`. Frontend placeholder workspace pages (`Analyze`, `Generate`, `Research`, `Plan`). A separate Python-based `ai-service` skeleton with a `Dockerfile` and `requirements.txt`.
* **Does not exist:** Java-based LLM integration, Spring AI SDK, Gateway routing logic, API integration for Gemini/Groq/Cerebras/OpenRouter in the backend. 
* **Partially exists:** Qdrant is configured in Docker, but there is no Java vector store integration yet.

## Provider Configuration
The following environment variables are configured in `.env` and `docker-compose.yml`:
* `GEMINI_API_KEY` = configured
* `GROQ_API_KEY` = configured
* `CEREBRAS_API_KEY` = configured
* `OPENROUTER_API_KEY` = configured

## Recommended AI Gateway Location
The AI Gateway should reside **inside the existing Spring Boot application** (specifically, a new module or within the `auth-service` as an `ai-gateway` logical boundary, rather than the separate Python `ai-service`). 
Given the existing multi-module structure, we should either create a new `ai-gateway` Maven module alongside `auth-service`, or build it directly within a new package inside `auth-service` to minimize microservice overhead while utilizing the robust Spring ecosystem (RestClient, Security, Resilience4j).

## Recommended Package Structure
If placed within the Spring application, the package structure should follow:

```text
com.EventmanagementbyMahesh.event.ai
├── gateway/      # Core API endpoints and request interception
├── provider/     # Provider adapters (Gemini, Groq, Cerebras, OpenRouter)
├── routing/      # Strategy patterns for routing to models
├── model/        # Unified DTOs for requests/responses
└── analyze/      # Specific use-case logic (e.g. analysis tasks)
```

## Sprint 1 Dependency Plan
To properly build out this gateway, we must implement features in the following strict order:

1. **Provider abstraction:** Create the core interfaces for LLM interaction.
2. **Provider adapters:** Implement integrations for Gemini, Groq, Cerebras, and OpenRouter using `RestClient`.
3. **Provider registry:** Build a registry to hold and manage available providers.
4. **Routing strategy:** Implement logic to route prompts to specific models based on cost/speed.
5. **Health/failure handling:** Integrate Spring Retry / Resilience4j to handle API timeouts and rate limits.
6. **Fallback:** Define fallback cascades (e.g., if Groq fails, try Cerebras).
7. **Gateway API:** Build the Spring `@RestController` to expose this internally/externally.
8. **Analyze backend:** Implement the specific logic for code/doc analysis.
9. **Analyze frontend:** Connect the React `Analyze.jsx` page to the new backend.
10. **Testing:** Write integration tests mocking the LLM providers using WireMock or Testcontainers.
