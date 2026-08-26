/**
 * Preview Configuration & Interactive Agent Simulator
 * 
 * Set IS_PREVIEW_MODE = true while backend AI models are in active development/testing
 * to protect API rate limits and avoid deployment constraints.
 * 
 * Flip IS_PREVIEW_MODE = false when ready to restore live backend AI streaming.
 */

export const IS_PREVIEW_MODE = true;

// Pre-configured standout scenarios for each agent persona
export const PREVIEW_SCENARIOS = {
  GENERAL: [
    {
      title: "Full-Stack System Architecture Blueprint",
      prompt: "Design a high-throughput event-driven microservices architecture with Spring Boot, LangGraph, and PostgreSQL.",
      response: `### 🏗️ Enterprise Event-Driven Microservices Architecture

Here is the production-ready blueprint engineered for high-concurrency event ingestion, distributed messaging, and agentic AI processing:

\`\`\`mermaid
flowchart LR
    Client[Web / Mobile UI] --> API[Spring Cloud Gateway :8080]
    API --> Auth[Auth & Admin Service]
    API --> Event[Event Catalog Service]
    API --> AI[LangGraph Agentic Gateway]
    AI --> Qdrant[(Qdrant Vector DB)]
    AI --> LLM[OpenAI / Anthropic Models]
    Event --> Kafka[Apache Kafka Event Bus]
    Kafka --> Analytics[Real-Time Analytics Consumer]
\`\`\`

#### 1. Core Architectural Pillars
- **API Gateway & Routing**: Spring Cloud Gateway with distributed Redis rate limiting and JWT claims validation.
- **Agentic Intelligence Layer**: LangGraph state graph with dynamic tool routing, semantic cache, and conversational memory checkpoints.
- **Data Persistence**:
  - **Relational**: PostgreSQL with connection pooling (HikariCP) for transactional state.
  - **Vector Storage**: Qdrant Vector DB with HNSW indexing for sub-10ms similarity retrieval.
- **Asynchronous Pipeline**: Apache Kafka cluster for decoupled event pub/sub and high-volume metric ingestion.

\`\`\`java
@Configuration
@EnableKafka
public class EventStreamingConfig {
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, EventPayload> kafkaListenerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, EventPayload> factory = 
            new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory());
        factory.setConcurrency(8);
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.RECORD);
        return factory;
    }
}
\`\`\`

#### 2. Key Non-Functional Guarantees
1. **Low-Latency Streaming**: Server-Sent Events (SSE) with adaptive client typewriter buffer draining at 60 FPS.
2. **Horizontal Scalability**: Stateless agent workers orchestrated via Kubernetes with auto-scaling based on CPU/Queue lag.
3. **Resilience**: Circuit breakers with Resilience4j for third-party LLM providers.`,
      sources: [
        { title: "Spring Cloud Microservices Guide", domain: "spring.io", url: "https://spring.io" },
        { title: "LangGraph Multi-Agent Workflows", domain: "langchain-ai.github.io", url: "https://langchain-ai.github.io" },
        { title: "Qdrant Vector Database Documentation", domain: "qdrant.tech", url: "https://qdrant.tech" }
      ],
      metadata: {
        routedAgent: "CODE_RESEARCHER",
        reasoningConfidence: 0.98,
        vectorSearchUsed: true
      }
    }
  ],

  RESEARCH: [
    {
      title: "State of Agentic AI & RAG Benchmarks 2026",
      prompt: "What are the latest advancements and empirical benchmarks in Agentic RAG and self-corrective retrieval?",
      response: `### 🔬 Empirical Analysis: Agentic RAG vs. Traditional RAG Architectures

Recent benchmark studies across diverse industry datasets highlight a major paradigm shift from static single-pass retrieval to **adaptive multi-agent self-correcting graphs**.

---

#### 1. Empirical Retrieval Metrics

| Retrieval Framework | Context Recall @ 5 | Faithfulness Score | Latency (p95) | Contradiction Rate |
| :--- | :--- | :--- | :--- | :--- |
| **Traditional Naive RAG** | 68.4% | 72.1% | 850ms | 14.8% |
| **Hybrid Search (BM25 + Dense)** | 81.2% | 84.5% | 920ms | 9.2% |
| **ThinkAction Self-Corrective Agent** | **94.8%** | **97.3%** | 1,120ms | **1.1%** |

---

#### 2. Key Synthesis & Epistemic Verification

1. VERIFIED FACT Dynamic query transformation and speculative sub-question expansion yield a **+26.4% recall boost** on ambiguous domain queries over standard vector cosine matching.
2. VERIFIED FACT Adaptive reranking models (e.g., Cohere Rerank v3, BGE-Reranker) filter out over 85% of irrelevant chunks before prompt injection, eliminating token bloat.
3. INFERENCE Integration of epistemic claim verification pipelines allows real-time contradiction detection across conflicting external sources.
4. UNCERTAIN Impact of extreme context windows (>1M tokens) on agent needle-in-a-haystack synthesis remains subject to domain-specific attention dispersion.

> "Self-corrective agent loops with active source citation reduce hallucination in production enterprise deployments by over 90% compared to traditional single-prompt architectures."
> — *Journal of Autonomous Machine Intelligence, 2026*`,
      sources: [
        { title: "Self-Reflective RAG: Iterative Verification", domain: "arxiv.org", url: "https://arxiv.org/abs/2310.11511" },
        { title: "Empirical Evaluation of Hybrid Search Systems", domain: "nature.com", url: "https://www.nature.com" },
        { title: "Enterprise RAG Accuracy Benchmark Report", domain: "research.mit.edu", url: "https://mit.edu" }
      ],
      metadata: {
        evidenceCount: 3,
        confidenceScore: "HIGH",
        contradictionWarning: false
      }
    }
  ],

  PLAN: [
    {
      title: "Enterprise Product Launch & Scale Plan",
      prompt: "Create a 6-stage execution blueprint for taking our AI agent platform from Private Beta to Enterprise Scale.",
      response: `## STAGE 1: FOUNDATION & LOAD BENCHMARKING
### Objective: Hardening core streaming APIs and database throughput
- Establish distributed tracing with OpenTelemetry and Prometheus monitoring.
- Stress-test SSE streaming connection pool up to 10,000 concurrent client streams.
- Implement Redis cache for LLM gateway prompts with LRU eviction.
- ✓ DONE WHEN: p99 latency is below 350ms for cached responses and zero memory leaks detected under 48h soak testing.
- RISK: Third-party LLM rate-limit throttling during burst loads — mitigate with multi-provider fallback.

## STAGE 2: KNOWLEDGE BASE & VECTOR RETRIEVAL OPTIMIZATION
### Objective: Scale document ingestion and vector partitioning
- Deploy asynchronous document chunking workers for PDF, DOCX, and Markdown.
- Configure Qdrant collection payloads with multi-tenant workspace isolation.
- Integrate hybrid keyword + semantic vector scoring with Reciprocal Rank Fusion (RRF).
- ✓ DONE WHEN: Ingestion pipeline processes 1,000 pages in < 15 seconds with > 95% retrieval accuracy.

## STAGE 3: ENTERPRISE SECURITY & ROLE-BASED ACCESS
### Objective: SOC2 compliance readiness and fine-grained data isolation
- Implement cryptographic tenant isolation and audit event logging.
- Integrate SAML 2.0 / Okta enterprise SSO with role mapping (ADMIN, ORGANIZER, ATTENDEE).
- Enforce strict Content Security Policy (CSP) and automated secret rotation.
- ✓ DONE WHEN: Automated security vulnerability penetration tests report zero high/critical issues.

## STAGE 4: PUBLIC FOUNDER PREVIEW & COMMUNITY LAUNCH
### Objective: Drive ecosystem adoption with zero disruption
- Enable interactive preview modes with pre-computed demonstrations to avoid rate limits.
- Publish API documentation and SDKs for Python and TypeScript.
- Launch live developer feedback portal and automated error telemetry.
- ✓ DONE WHEN: 500+ developers onboarded with > 98% uptime SLA.`,
      sources: [],
      metadata: {
        totalStages: 4,
        riskCount: 1,
        estimatedDuration: "8 Weeks"
      }
    }
  ],

  ANALYZE: [
    {
      title: "Comprehensive Strategic & Architectural Analysis",
      prompt: "Analyze the competitive advantage, architectural scalability, and ROI of ThinkAction AI platform.",
      response: `### 📊 Executive Strategic & Architectural Analysis

#### 1. Strategic SWOT Matrix

| Dimension | Key Observations & Strategic Value | Impact Score |
| :--- | :--- | :--- |
| **Strengths** | Multi-agent autonomous routing, sub-millisecond vector indexing, zero-latency SSE streaming typewriter, strict tenant memory isolation. | 🟢 **9.6 / 10** |
| **Weaknesses** | Heavy reliance on upstream LLM latency — mitigated by speculative execution and local streaming simulation fallback. | 🟡 **4.2 / 10** |
| **Opportunities** | Enterprise knowledge automation, private enterprise RAG deployments, API-first integrations with Slack/Teams. | 🟢 **9.8 / 10** |
| **Threats** | Commodity LLM wrapper competition; differentiation achieved via deep multi-turn planning and verification badges. | 🔵 **3.1 / 10** |

---

#### 2. Architectural Root-Cause & Performance Diagnosis

1. **Throughput Efficiency**: The hybrid Spring Boot + LangGraph microservice separation ensures frontend interactivity is completely decoupled from heavy Python model execution.
2. **Cost Optimization**: Semantic caching and dynamic role routing reduce LLM API token expenditure by an estimated **62%**.
3. **Enterprise Compliance**: Vector payload-level tenancy guarantees complete data privacy for multi-organization deployments.

#### 3. Key Executive Recommendations
- Prioritize on-premise vector deployment connectors for enterprise clients.
- Leverage the interactive preview layer for friction-free investor and founder demos.`,
      sources: [
        { title: "Enterprise AI Platform ROI Benchmarks", domain: "gartner.com", url: "https://gartner.com" },
        { title: "Cloud Native Architecture Efficiency Metrics", domain: "cncf.io", url: "https://cncf.io" }
      ],
      metadata: {
        analysisConfidence: 0.99,
        riskLevel: "LOW"
      }
    }
  ],

  KNOWLEDGE: [
    {
      title: "Vector Document Retrieval & Grounded Q&A",
      prompt: "What are the core capabilities and security guarantees detailed in our uploaded architectural whitepaper?",
      response: `### 📄 Grounded Document Answer (Knowledge Base RAG)

Based on the indexed document **ThinkAction_Architecture_Whitepaper_v2.pdf** (98% similarity match across 4 semantic chunks):

---

#### Key Document Insights & Evidence

1. **Multi-Agent Orchestration**:
   The document specifies that user requests are evaluated by an intent classifier which dynamically delegates tasks to specialized sub-agents (\`GENERAL\`, \`RESEARCH\`, \`PLAN\`, \`ANALYZE\`).

2. **Vector Space Partitioning**:
   - Chunks are embedded using high-dimensional dense representations (1536-dim).
   - Distance metric: **Cosine Similarity** with an empirical relevance threshold of \`0.82\`.

3. **Enterprise Security Guarantees**:
   - End-to-end encryption at rest (AES-256) and in transit (TLS 1.3).
   - Zero retention by third-party model providers for uploaded proprietary knowledge files.

\`\`\`json
{
  "documentId": "doc_sec_2026_01",
  "indexedChunks": 48,
  "retrievalScore": 0.982,
  "groundedStatus": "VERIFIED_ACCURATE"
}
\`\`\``,
      sources: [
        { title: "ThinkAction_Architecture_Whitepaper_v2.pdf", domain: "Document Knowledge Base", url: "doc" },
        { title: "Security_and_Compliance_Summary.docx", domain: "Document Knowledge Base", url: "doc" }
      ],
      metadata: {
        ragEnabled: true,
        relevanceScore: 0.98,
        documentId: "doc_sec_2026_01"
      }
    }
  ]
};

// Generate adaptive dynamic response for any custom user prompt
export function generateAdaptivePreviewResponse(role, prompt) {
  const cleanPrompt = (prompt || "").trim();
  const timeStr = new Date().toLocaleTimeString();

  // Check if matching predefined scenario
  const scenarios = PREVIEW_SCENARIOS[role] || PREVIEW_SCENARIOS.GENERAL;
  const directMatch = scenarios.find(s => 
    s.prompt.toLowerCase().includes(cleanPrompt.toLowerCase()) || 
    cleanPrompt.toLowerCase().includes(s.title.toLowerCase())
  );
  if (directMatch) {
    return {
      content: directMatch.response,
      sources: directMatch.sources,
      metadata: directMatch.metadata
    };
  }

  switch (role) {
    case 'RESEARCH':
      return {
        content: `### 🔬 Research Intelligence Report: "${cleanPrompt}"

Based on synthesized multi-source intelligence retrieved at ${timeStr}:

1. VERIFIED FACT Empirical analysis confirms that **${cleanPrompt}** aligns with modern production best practices and current industry benchmarks.
2. VERIFIED FACT Multi-source verification detected strong consensus across academic and enterprise technical literature.
3. INFERENCE Integrating automated self-verification loops yields enhanced consistency and eliminates hallucination risks.
4. UNCERTAIN Long-term scaling benchmarks under non-standard distributed workloads are actively being benchmarked.

#### Key Synthesis Summary
The proposed methodology demonstrates high reliability, sub-millisecond routing efficiency, and clean architectural modularity.`,
        sources: [
          { title: `${cleanPrompt.slice(0, 30)} - Analysis & Data`, domain: "arxiv.org", url: "https://arxiv.org" },
          { title: "Enterprise Technology Standards", domain: "acm.org", url: "https://dl.acm.org" }
        ],
        metadata: {
          evidenceCount: 2,
          confidenceScore: "HIGH",
          previewGenerated: true
        }
      };

    case 'PLAN':
      return {
        content: `## STAGE 1: DISCOVERY & ARCHITECTURAL FOUNDATIONS
### Objective: Setup and validate requirements for "${cleanPrompt}"
- Define API contract schemas and data models.
- Implement security validation and rate-limit guardrails.
- ✓ DONE WHEN: Architecture blueprint reviewed and initial milestone tests passing.
- RISK: Dependency drift or changing third-party API specs.

## STAGE 2: EXECUTION & WORKFLOW INTEGRATION
### Objective: Core build-out and system wiring
- Implement core business logic and agent state graph nodes.
- Wire event listeners and bidirectional streaming sockets.
- ✓ DONE WHEN: End-to-end integration tests achieve > 95% pass rate.

## STAGE 3: VERIFICATION, LOAD TESTING & ROLLOUT
### Objective: Production readiness and performance benchmarking
- Conduct load tests with simulated high-concurrency traffic.
- Deploy to staging with real-time observability telemetry.
- ✓ DONE WHEN: Zero errors under peak traffic conditions and approved for production release.`,
        sources: [],
        metadata: {
          totalStages: 3,
          riskCount: 1,
          previewGenerated: true
        }
      };

    case 'ANALYZE':
      return {
        content: `### 📊 Structured Analytical Breakdown: "${cleanPrompt}"

#### 1. Core Evaluation Matrix
- **Feasibility & Readiness**: 🟢 High (9.4 / 10)
- **Architectural Scalability**: 🟢 Excellent (9.7 / 10)
- **Risk Profile**: 🟡 Low-to-Moderate (Controlled via circuit breakers and fallbacks)

#### 2. Key Findings & Tradeoffs
1. **Performance**: Decoupled asynchronous handling ensures the client UI remains responsive regardless of processing intensity.
2. **Reliability**: Self-correcting retry policies and graceful degradation prevent cascading failures.
3. **Recommendation**: Proceed with staged deployment while maintaining comprehensive telemetry.`,
        sources: [
          { title: "System Evaluation Benchmark Report", domain: "system-design.org", url: "https://system-design.org" }
        ],
        metadata: {
          analysisConfidence: 0.97,
          previewGenerated: true
        }
      };

    case 'KNOWLEDGE':
      return {
        content: `### 📄 Grounded Document Query Response: "${cleanPrompt}"

Based on semantic indexing of your knowledge documents:

- **Query Matched**: "${cleanPrompt}"
- **Relevance Confidence**: 97.4%
- **Context Synthesis**: The indexed documentation indicates that system components operate according to defined contract specifications with strict tenant data privacy and zero data leakage.

\`\`\`json
{
  "status": "GROUNDED_AND_VERIFIED",
  "matchScore": 0.974,
  "sourcesCount": 2
}
\`\`\``,
        sources: [
          { title: "Indexed_Document_Summary.pdf", domain: "Knowledge Base", url: "doc" },
          { title: "System_Specifications.md", domain: "Knowledge Base", url: "doc" }
        ],
        metadata: {
          ragEnabled: true,
          relevanceScore: 0.974,
          previewGenerated: true
        }
      };

    case 'GENERAL':
    default:
      return {
        content: `### ⚡ Intelligence Response: "${cleanPrompt}"

Here is a comprehensive breakdown addressing your request:

\`\`\`typescript
// Production Solution Component
export interface AgentResponse<T> {
  success: boolean;
  timestamp: number;
  data: T;
  metrics: {
    latencyMs: number;
    tokensProcessed: number;
  };
}

export function executeAgentWorkflow<T>(payload: T): Promise<AgentResponse<T>> {
  return Promise.resolve({
    success: true,
    timestamp: Date.now(),
    data: payload,
    metrics: { latencyMs: 18, tokensProcessed: 142 }
  });
}
\`\`\`

#### Key Highlights & Capabilities
1. **Dynamic Tool Routing**: Evaluates intent and automatically routes between general chat, deep web research, structured planning, and vector document retrieval.
2. **Low-Latency Streaming**: Emits token chunks seamlessly with real-time UI typewriter rendering.
3. **Adaptive Context**: Leverages persistent user memory and semantic cache to optimize repeat interactions.`,
        sources: [
          { title: "Modern Agentic Patterns & Architectures", domain: "developer.mozilla.org", url: "https://developer.mozilla.org" }
        ],
        metadata: {
          routedAgent: "GENERAL",
          previewGenerated: true
        }
      };
  }
}
