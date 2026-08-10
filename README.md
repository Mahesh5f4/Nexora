# 🎫 EventHub

**Live Demo:** [https://eventshublimited.netlify.app/](https://eventshublimited.netlify.app/)

[![Backend CI](https://github.com/Mahesh5f4/event-management-system/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/Mahesh5f4/event-management-system/actions/workflows/backend-ci.yml)
[![Java](https://img.shields.io/badge/Java-17-ED8B00?logo=openjdk&logoColor=white)](https://openjdk.org/projects/jdk/17/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.5-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Spring Cloud](https://img.shields.io/badge/Spring%20Cloud-2023.0.1-6DB33F?logo=spring&logoColor=white)](https://spring.io/projects/spring-cloud)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](./backend/docker-compose.yml)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](./ml-service)
[![Coverage](https://img.shields.io/badge/Coverage-70%25-brightgreen?logo=jacoco)](./backend/coverage-report)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![AWS](https://img.shields.io/badge/Deploy-AWS%20EC2-FF9900?logo=amazonaws&logoColor=white)](./docs/AWS_DEPLOYMENT_GUIDE.md)

> A high-availability, microservices-based distributed event ticketing and inventory management platform engineered to handle massive concurrent traffic and prevent double-booking race conditions.

---

## 📖 Overview

**What it does:** EventHub is a full-stack platform that allows users to discover events, receive ML-powered recommendations, and book tickets with guaranteed seat allocation. 
**Why it exists:** To solve the classic "Lost Update" problem and high-concurrency data integrity challenges commonly faced by ticketing platforms during high-demand flash sales.
**Who it is for:** Event organizers and millions of prospective attendees looking for a seamless, secure, and resilient ticket purchasing experience.
**Real-world use case:** Powering a massive concert ticket release where 100,000+ users attempt to purchase 10,000 available seats simultaneously without overselling or crashing the system.

---

## ✨ Key Features

*   **Distributed Seat Locking:** Atomically locks seats during checkout using Redis `SETNX` to prevent concurrent reservation conflicts.
*   **Asynchronous Processing:** Offloads heavy tasks like PDF ticket generation and email notifications to RabbitMQ, drastically reducing API latency.
*   **Secure Payment Gateway:** Seamless Razorpay integration for fast, secure, and reliable transaction processing.
*   **ML-Powered Recommendations:** Dedicated Python microservice providing personalized event recommendations based on user history and event metadata.
*   **Interactive Account Settings:** Fully featured frontend profile management with dynamic OTP-based password resetting.
*   **Resilient Microservices:** Domain-driven design split into Auth, Event, Booking, and Gateway services for independent scaling and failure isolation.
*   **Centralized API Documentation:** Auto-generated OpenAPI 3.0 / Swagger UI aggregated at the API Gateway level.
*   **Real-time Updates:** WebSocket integration (STOMP) for broadcasting live seat availability updates to all connected clients.
*   **Robust Security:** Stateless JWT authentication with RSA256 signatures and Google OAuth 2.0 Single Sign-On (SSO) integration.
*   **Digital Passes & PDF Tickets:** Auto-generates downloadable PDF tickets and features a highly polished digital pass UI with "Encrypted Pass Issued" visuals.
*   **Interactive Stage Mapping:** Provides a dynamic visual stage area and interactive seat selection UI during the booking flow.
*   **Scheduled State Cleanup:** Utilizes Spring `@Scheduled` background workers to automatically reap expired locks and maintain inventory consistency.
*   **Premium Aesthetic:** Features a responsive, modern "Liquid Glass" UI design language with complex GSAP and Framer Motion micro-animations.

---

## 🏛️ System Architecture & Microservice Communication

EventHub utilizes a modular microservices architecture designed for horizontal scalability, fault isolation, and high availability.

### Tech Stack Overview
*   **Frontend:** React 19 SPA (Vite, Redux Toolkit, GSAP Animations).
*   **Backend:** Spring Boot 3.4 microservices (Java 17).
*   **API Gateway:** Spring Cloud Gateway handling centralized routing, CORS, and rate limiting.
*   **Database:** MySQL 8.0 for persistent, ACID-compliant transactional data.
*   **Cache & Mutex:** Redis 7.4 for distributed locking and high-speed read caching.
*   **Message Broker:** RabbitMQ 3.13 for decoupled, asynchronous task execution.
*   **Machine Learning:** Python FastAPI service for recommendations.

---

### Overall System Architecture

This diagram details the flow of traffic, service routing, data components, and supporting services.

```mermaid
graph TD
    Client([Web/Mobile Client]) -->|HTTP/HTTPS| Nginx[Nginx Reverse Proxy :80/:443]
    Nginx -->|Route Request| Gateway[API Gateway :8080]
    
    subgraph "Microservices Layer"
        Gateway -->|Route /api/auth/**| Auth[Auth Service :8081]
        Gateway -->|Route /api/events/**| Event[Event Service :8082]
        Gateway -->|Route /api/bookings/**| Booking[Booking Service :8083]
    end
    
    subgraph "Data Storage & Caching"
        Auth -->|Read/Write| MySQL[(MySQL DB :3306)]
        Event -->|Read/Write| MySQL
        Booking -->|Read/Write| MySQL
        Event -->|Read/Write Cache| Redis[(Redis Cache :6379)]
        Booking -->|Read/Write Mutex| Redis
    end
    
    subgraph "Async Processing"
        Booking -- Publish --> RMQ[[RabbitMQ :5672]]
        RMQ -- Consume --> BookingWorker[Booking Consumer]
        BookingWorker --> Notification[Email & PDF Service]
    end
    
    subgraph "External Services"
        Auth --> Google[Google OAuth OIDC]
        Event --> ML[Python ML Service :8001]
    end
```

---

### Microservice Communication Topology

Illustrates how services communicate with one another: Synchronous REST calls (`RestTemplate`) for critical validations, Asynchronous Messaging (`RabbitMQ`) for tasks execution, and WebSockets (STOMP) for pushing real-time updates to clients.

```mermaid
graph TD
    subgraph "Client"
        C[Web Browser / Client]
    end

    subgraph "API Gateway"
        GW[Gateway Service :8080]
    end

    subgraph "Microservices"
        AS[Auth Service :8081]
        ES[Event Service :8082]
        BS[Booking Service :8083]
        MLS[ML Service :8001]
    end

    subgraph "Message Broker"
        RMQ[[RabbitMQ :5672]]
    end

    C -->|REST API Calls| GW
    C <-->|WebSocket STOMP| GW
    GW -->|REST /api/auth| AS
    GW -->|REST /api/events| ES
    GW -->|REST /api/bookings & /api/seats| BS
    GW <-->|WS Proxy /api/ws-booking| BS

    %% Inter-service Sync HTTP calls
    BS -.->|HTTP GET /api/auth/internal/users| AS
    BS -.->|HTTP GET /api/events/internal/| ES
    BS -.->|HTTP PUT /api/events/internal/.../deduct-seats| ES
    ES -.->|HTTP POST /recommendations| MLS

    %% Async Communication
    BS -->|Publish BookingMessage| RMQ
    RMQ -->|Deliver Message| BS
```

---

### API Request Lifecycle Flow

This sequence trace details the path an incoming API request takes from the client, through Nginx, the API Gateway, and down to the microservices.

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Nginx as Nginx Proxy (:80/:443)
    participant GW as API Gateway (:8080)
    participant Service as Downstream Service
    participant DB as MySQL/Redis

    Client->>Nginx: HTTP Request (Headers + JWT)
    Note over Nginx: Rate Limiting & Gzip checks
    Nginx->>GW: Forward Request
    Note over GW: JwtFilter validates token signature<br/>& extracts claims
    GW->>Service: Forward Request (with User info headers)
    Note over Service: Spring Security checks RBAC
    Service->>DB: Query/Update Data
    DB-->>Service: Return Data
    Service-->>GW: HTTP Response
    GW-->>Nginx: HTTP Response
    Nginx-->>Client: HTTP Response
```

---

### Service Dependency Matrix

This diagram showcases both compile-time Maven build dependencies and run-time service linkages.

```mermaid
graph TD
    subgraph "Compile-Time Maven Dependencies"
        AuthS[auth-service] -->|Maven Dependency| CL[common-library]
        EventS[event-service] -->|Maven Dependency| CL
        BookingS[booking-service] -->|Maven Dependency| CL
        GatewayS[gateway-service] -->|Maven Dependency| CL
    end

    subgraph "Runtime Service Dependencies"
        GW[gateway-service] --> AuthSR[auth-service]
        GW --> EventSR[event-service]
        GW --> BookingSR[booking-service]
        
        BookingSR -->|HTTP REST| AuthSR
        BookingSR -->|HTTP REST| EventSR
        EventSR -->|HTTP REST| MLSR[ml-service]
        
        AuthSR --> DB[(MySQL)]
        EventSR --> DB
        BookingSR --> DB
        
        EventSR --> Cache[(Redis Cache)]
        BookingSR --> Lock[(Redis Lock)]
        
        BookingSR --> Queue[[RabbitMQ]]
    end
```

---

## 🧠 Internal Workings & Sequence Diagrams

---

### User Login & JWT Generation

This sequence details the credential validation and creation of stateless, cryptographically signed JWT tokens.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client (Web App)
    participant Nginx as Nginx
    participant GW as API Gateway
    participant AS as Auth Service
    participant DB as MySQL DB

    User->>Nginx: POST /api/auth/login
    Nginx->>GW: Forward to Gateway
    GW->>AS: Route to Auth Service
    AS->>DB: SELECT * FROM users WHERE email = ?
    DB-->>AS: User details (Hashed password)
    Note over AS: Verify password using BCrypt
    AS->>AS: Generate JWT payload (claims, role, expiration)
    AS->>AS: Sign JWT with RSA256 Private Key
    AS-->>GW: Return JWT token
    GW-->>Nginx: Return JWT token
    Nginx-->>User: HTTP 200 OK (token)
```

---

### JWT Authentication & Authorization Flow

Demonstrates validation of incoming authorization tokens by the Gateway without hitting the Authentication Database.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client
    participant GW as API Gateway
    participant Service as Event/Booking Service
    
    User->>GW: GET /api/bookings (Authorization: Bearer <JWT>)
    Note over GW: JwtFilter extracts JWT<br/>Validates signature using RSA256 Public Key
    alt Invalid/Expired Token
        GW-->>User: HTTP 401 Unauthorized
    else Valid Token
        GW->>GW: Inject headers (X-User-Email, X-User-Role)
        GW->>Service: Forward request with headers
        Note over Service: SecurityContext populated<br/>RBAC checked (@PreAuthorize)
        Service-->>GW: Resource data
        GW-->>User: HTTP 200 OK
    end
```

---

### Event Retrieval & Cache Read/Write Flow

Utilizes a cache-aside design with automatic expiration and eviction strategies.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client
    participant ES as Event Service
    participant Redis as Redis Cache
    participant DB as MySQL DB

    User->>ES: GET /api/events?page=0&size=10
    ES->>Redis: Check cache for key 'events::page:0:size:10'
    alt Cache Hit
        Redis-->>ES: Return serialized event list
        ES-->>User: Return HTTP 200 OK
    else Cache Miss
        Redis-->>ES: null (Cache Miss)
        ES->>DB: Query events table (paginated)
        DB-->>ES: Return event list
        ES->>Redis: Write serialized list to key with TTL (10 mins)
        ES-->>User: Return HTTP 200 OK
    end
```

---

### Distributed Seat Locking & Seat Booking Checkout

Shows the interaction between distributed seat locking (Redis `SETNX`), optimistic version control in Hibernate, and the asynchronous ticket queueing workflow.

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant SC as SeatLockController
    participant BC as BookingController
    participant RD as Redis
    participant MQ as RabbitMQ
    participant Consumer as BookingConsumer
    participant BS as BookingService
    participant ES as EventService
    participant DB as MySQL DB

    %% 1. Seat Selection
    Client->>SC: POST /api/seats/42/lock (seatId: "A1")
    SC->>RD: SETNX seat_lock:42:A1 userId (EX 5m)
    alt Seat already held
        RD-->>SC: 0 (failed)
        SC-->>Client: HTTP 409 Conflict (Already Held)
    else Seat free
        RD-->>SC: 1 (success)
        SC->>Client: HTTP 200 OK (Locked for 5m)
        SC->>Client: Broadcast list of locked seats via WS topic
    end

    %% 2. Razorpay Order Creation
    Client->>BC: POST /api/bookings/payments/create-order {eventId: 42, seats: ["A1"]}
    Note over BC: Check Rate Limits in Redis (max 500 req/min)
    BC->>Razorpay: Create Order API Call
    Razorpay-->>BC: razorpay_order_id
    BC-->>Client: HTTP 200 OK {razorpayOrderId}

    %% 3. Payment & Verification
    Client->>Razorpay: Complete Payment Modal
    Razorpay-->>Client: razorpay_payment_id & signature
    Client->>BC: POST /api/bookings/payments/verify {signature}
    Note over BC: Verify Razorpay HMAC Signature
    BC->>MQ: Publish BookingMessage (if valid)
    MQ->>Consumer: Deliver BookingMessage
    Consumer->>BS: Call processBooking(req)
    
    %% Concurrency control on event write
    loop Attempt event lock
        BS->>RD: SETNX lock:event:42 uniqueValue (EX 10s)
        alt Lock acquired
            RD-->>BS: 1 (Success)
            BS->>BS: attemptBooking()
            BS->>ES: GET /api/events/internal/42 (Retrieve capacity)
            ES-->>BS: Event data
            Note over BS: Verify availableSeats >= ticketCount
            BS->>ES: PUT /api/events/internal/42/deduct-seats
            Note over ES: Decrement availableSeats & check version
            ES->>DB: UPDATE events SET available_seats = ?, version = version+1
            ES-->>BS: Success
            BS->>DB: INSERT INTO bookings (status = CONFIRMED)
            BS->>RD: DEL seat_lock:42:A1 (Release seat lock)
            BS->>RD: DEL lock:event:42 (Release event lock)
            BS->>RD: Set status = COMPLETED, message = "Success"
        else Lock busy
            RD-->>BS: 0 (Failed)
            Note over BS: Backoff and retry (up to 15 times)
        end
    end
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---------|------------|----------|
| **Frontend** | React 19, TypeScript, Redux | Dynamic UI, state management, and fast client-side rendering. |
| **Gateway** | Spring Cloud Gateway | Centralized routing, authentication filtering, and load balancing. |
| **Backend Services** | Spring Boot 3.4, Java 17 | Core business logic, REST APIs, and microservices orchestration. |
| **Data Access** | Spring Data JPA, Hibernate | ORM mapping and database interactions. |
| **Database** | MySQL 8.0 | ACID-compliant persistent storage for inventory and users. |
| **Cache/Locking** | Redis 7.4 | Distributed mutex locks for seats and L2 caching for events. |
| **Messaging** | RabbitMQ 3.13 | Async communication decoupling booking from notification logic. |
| **Machine Learning** | Python 3.12, FastAPI | High-performance recommendation engine. |
| **Payments** | Razorpay API | Secure, production-grade checkout and payment processing gateway. |
| **Monitoring** | Prometheus, Grafana | System observability and real-time metrics tracking. |
| **CI/CD** | GitHub Actions, JaCoCo | Automated testing, coverage reporting, and continuous integration. |

---

## 🧠 System Design Decisions

*   **Why Microservices?** A monolithic architecture becomes a bottleneck when the booking engine needs to scale independently of the event discovery catalog. Microservices allow targeted resource scaling.
*   **Why Redis `SETNX` for Locks?** Traditional DB row locks cause massive contention and deadlocks during flash sales. Redis handles hundreds of thousands of atomic lock attempts per second in-memory, acting as a high-speed buffer before database writes.
*   **Why RabbitMQ?** Synchronous PDF generation and email sending block HTTP threads. By dropping messages into RabbitMQ, the Booking Service can respond with `202 Accepted` in milliseconds, improving perceived performance.
*   **Optimistic vs. Pessimistic DB Locking:** Used JPA Optimistic Locking (`@Version`) as a fallback to Redis to maintain DB integrity without the massive performance penalty of Pessimistic locks.

---

## 📁 Project Structure

```text
EventHub/
├── backend/
│   ├── pom.xml                        # Root Maven POM (multi-module)
│   ├── docker-compose.yml             # Production orchestration (10 services)
│   ├── Makefile                       # Lifecycle commands (build/start/stop/backup...)
│   ├── .env.example                   # Environment variable template
│   ├── .env.production                # Production secrets (gitignored)
│   ├── .dockerignore                  # Excludes logs/IDE files from build context
│   │
│   ├── auth-service/                  # JWT · OAuth · Users  (Port 8081)
│   │   └── Dockerfile                 # Multi-stage: Maven build → JRE alpine
│   ├── event-service/                 # Events · Reviews · ML  (Port 8082)
│   │   └── Dockerfile                 # Multi-stage: Maven build → JRE alpine
│   ├── booking-service/               # Seats · Async Booking · PDF  (Port 8083)
│   │   └── Dockerfile                 # Multi-stage: Maven build → JRE alpine
│   ├── gateway-service/               # Spring Cloud Gateway  (Port 8080)
│   │   └── Dockerfile                 # Multi-stage: Maven build → JRE alpine
│   ├── common-library/                # Shared DTOs · Exceptions · Security
│   ├── coverage-report/               # JaCoCo multi-module aggregator
│   │
│   ├── nginx/                         # Reverse proxy (only public-facing service)
│   │   ├── nginx.conf                 # Base config: gzip · rate limiting · workers
│   │   └── conf.d/
│   │       ├── default.conf           # HTTP server block (active)
│   │       └── default-https.conf     # HTTPS template (activate after domain setup)
│   │
│   ├── monitoring/
│   │   └── prometheus/prometheus.yml  # Scrapes all 4 services by container name
│   │
│   ├── scripts/
│   │   ├── backup.sh                  # Manual mysqldump (keeps last 7)
│   │   ├── restore.sh                 # Restore with confirmation gate
│   │   └── auto-backup.sh             # Nightly cron backup (14-day retention)
│   │
│   └── init-letsencrypt.sh            # One-shot Let's Encrypt HTTPS setup
│
├── ml-service/                        # Python FastAPI Recommendation Engine
│   ├── Dockerfile                     # python:3.12-slim · non-root · healthcheck
│   ├── main.py                        # TF-IDF cosine similarity recommender
│   └── requirements.txt
│
├── frontend/                          # React 19 SPA (Vite · Redux · GSAP)
│
├── docs/
│   ├── AWS_DEPLOYMENT_GUIDE.md        # 11-step EC2 deployment walkthrough
│   └── DEPLOYMENT_CHECKLIST.md        # 10-phase post-deployment verification
│
└── .github/workflows/                 # GitHub Actions CI/CD pipelines
```

---

## 🗄️ Database Design

**Key Entities & Relationships:**
*   **User:** Contains authentication credentials and role data.
*   **Event:** Contains metadata, total capacity, and available seats. Features an `@Version` column for optimistic concurrency control.
*   **Booking:** Links User and Event. Tracks ticket count, specific seats allocated, and booking status (PENDING/CONFIRMED).
*   **Review:** Links User and Event for rating data.

### Entity-Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ BOOKING : places
    USER ||--o{ REVIEW : writes
    EVENT ||--o{ BOOKING : has
    EVENT ||--o{ REVIEW : receives
    
    USER {
        Long id PK
        String email UK
        String password
        String role
    }
    EVENT {
        Long id PK
        String title
        Integer totalSeats
        Integer availableSeats
        Integer version "Optimistic Lock"
    }
    BOOKING {
        Long id PK
        Long userId FK
        Long eventId FK
        Integer ticketCount
        String status
    }
    REVIEW {
        Long id PK
        Long userId FK
        Long eventId FK
        Integer rating
        String comment
    }
```

---

## 🔌 API Documentation (OpenAPI 3)

EventHub features centralized Swagger UI documentation accessible at the API Gateway.

**Unified Swagger UI URL:** `http://localhost:8080/swagger-ui.html`

### Major Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user | No |
| `POST` | `/api/auth/login` | Authenticate and get JWT | No |
| `GET` | `/api/events` | Paginated event catalog (cached) | No |
| `GET` | `/api/events/{id}/recommendations` | Get ML recommendations | No |
| `POST` | `/api/seats/{eventId}/lock` | Atomically lock a seat in Redis | **Yes** (User) |
| `POST` | `/api/bookings/payments/create-order` | Create Razorpay order | **Yes** (User) |
| `POST` | `/api/bookings/payments/verify` | Verify payment and confirm booking | **Yes** (User) |
| `GET` | `/api/bookings/{id}/ticket` | Download generated PDF ticket | **Yes** (User) |
| `POST` | `/api/events` | Create a new event | **Yes** (Admin) |
| `GET` | `/api/admin/analytics/traffic` | Traffic & revenue dashboard | **Yes** (Admin) |

#### Sample Request: Razorpay Order Creation
```json
POST /api/bookings/payments/create-order
Authorization: Bearer <JWT_TOKEN>

{
  "eventId": 42,
  "ticketCount": 2,
  "seats": ["A1", "A2"]
}
```
*Response (200 OK):*
```json
{
  "success": true,
  "message": "Payment order created",
  "data": {
    "razorpayOrderId": "order_H2aX...",
    "amount": 200000,
    "currency": "INR"
  }
}
```

---

## 🔒 Security

*   **Authentication Mechanism:** Stateless JWT (JSON Web Tokens) verified at the Gateway and Service layers using shared public keys.
*   **Authorization Strategy:** Role-Based Access Control (RBAC) via Spring Security `@PreAuthorize("hasRole('ADMIN')")`.
*   **Password Handling:** Passwords hashed with BCrypt.
*   **OAuth Integration:** Direct integration with Google OAuth 2.0 OpenID Connect.
*   **Rate Limiting:** Redis-backed token bucket algorithm (e.g., max 500 booking attempts per minute per user).
*   **Cross-Origin Resource Sharing (CORS):** Strictly configured at the API Gateway for frontend domains.

---

## ⚡ Performance Optimizations

*   **L2 Caching:** Event catalog queries (`GET /events`) are cached in Redis. Cache eviction triggers automatically on `POST` or `PATCH` to maintain consistency.
*   **Pagination:** All list endpoints use Spring Data `Pageable` to prevent loading massive datasets into memory.
*   **Asynchronous I/O:** PDF generation logic uses `itextpdf` inside a decoupled RabbitMQ listener, keeping HTTP worker threads free.
*   **Query Optimization:** Fetch types configured carefully (`FetchType.LAZY` for `ManyToOne` relations) to prevent the N+1 query problem.

---

## 🌐 Live Deployment

*   **Live Application (Frontend)**: [https://eventshublimited.netlify.app/](https://eventshublimited.netlify.app/)
*   **Backend Base API IP**: `http://13.48.56.253`
*   **Frontend Deployment**: Deployed on Netlify, connected via Git integration for CD, with all requests to `/api/*` proxied directly to the backend IP `http://13.48.56.253/api/*`.
*   **Health Check Status Endpoint**: `http://13.48.56.253/actuator/health` (Internal: forwards to the Gateway health verification routing).
*   **Unified Swagger OpenAPI Endpoint**: `http://13.48.56.253/swagger-ui.html`
*   **GitHub Repository**: [Mahesh5f4/event-management-system](https://github.com/Mahesh5f4/event-management-system)
*   **Docker Images**: Built locally on host during deployments (no public registry publication currently).

---

## 🏗️ Infrastructure Overview

EventHub is structured to run inside a high-security container network. The layout of the hosting architecture consists of:

*   **AWS Infrastructure**: Hosted on a single **AWS EC2** virtual machine (`t3.small` - 2 vCPU, 2GB RAM, 30 GB gp3 EBS Volume).
*   **Operating System**: Ubuntu Server 22.04 LTS.
*   **Elastic IP Address**: Associated with the instance to provide a static public IPv4 gateway.
*   **Containerization**: **Docker Engine** and **Docker Compose v2** manage the deployment environment.
*   **Private Bridge Networking**: All microservices run inside a closed virtual network (`eventhub-net`).
*   **Nginx Proxy Gateway**: The only container exposing ports to the outside world (`80` and `443`). It routes requests to the API Gateway (`gateway-service`), performs Gzip compression, forces rate limits, sets HTTP safety headers, and manages SSL certificates.
*   **Redis (L2 Caching & Concurrency)**: Runs inside the private network. Persistent storage is mounted using Docker volumes (`redis_data`) with `appendonly` AOF tracking.
*   **RabbitMQ Broker**: Decouples heavy processes. Persistent message queues are stored on Docker volume (`rabbitmq_data`).
*   **MySQL Database**: Holds user, ticket, and booking records. Persisted using volume mount (`mysql_data`).

---

## 🚀 Deployment Guide (Production AWS & Docker Compose)

This guide documents the complete procedure to provision resources, build containers, configure security settings, and test operations on AWS.

### CI/CD Pipeline Build System

A robust GitHub Actions pipeline (`backend-ci.yml`) triggers on pushes to `main`/`develop`:

```mermaid
graph TD
    Dev[Developer git push] --> GHA[GitHub Actions Runner]
    GHA --> Setup[Setup Java 17 Temurin]
    Setup --> Cache[Cache Maven Dependencies]
    Cache --> Compile[Compile & Validate Multi-Module mvnw]
    Compile --> Tests[Execute Unit & Integration Tests]
    Tests --> Coverage[Verify Coverage via JaCoCo]
    Coverage --> Report[Report Aggregate % + Upload HTML Artifacts]
```

---

### Deployment Architecture Map

```mermaid
graph TD
    Dev[Developer] -->|1. git push| GitRepo[GitHub Repository]
    GitRepo -->|2. Trigger Workflow| GHA[GitHub Actions]
    GHA -->|3. Build & Package| DB[Docker Build]
    DB -->|4. Generate| DI[Docker Images]
    DI -->|5. Deploy / Pull| EC2[AWS EC2 Instance]
    
    subgraph "EC2 Runtime Environment (Docker Compose)"
        Nginx[Nginx Reverse Proxy :80/:443] -->|Route to Internal Net| GW[API Gateway :8080]
        
        subgraph "Microservices Layer"
            GW --> AS[Authentication Service :8081]
            GW --> ES[Event Service :8082]
            GW --> BS[Booking Service :8083]
            ES --> MS[Recommendation ML Service :8001]
        end
        
        subgraph "Infrastructure & Storage"
            AS --> MySQL[(MySQL :3306)]
            ES --> MySQL
            BS --> MySQL
            
            ES --> Redis[(Redis :6379)]
            BS --> Redis
            
            BS --> RMQ[[RabbitMQ :5672]]
        end
    end
```

---

### Step 1 — AWS Security Groups Configuration
Create a security group `eventhub-sg` with the following inbound rule configurations:

| Rule Type | Port Range | Source | Purpose |
|---|---|---|---|
| SSH | 22 | Your Local IP only (`x.x.x.x/32`) | Secure server terminal access |
| HTTP | 80 | Anywhere (`0.0.0.0/0`, `::/0`) | Standard web traffic access |
| HTTPS | 443 | Anywhere (`0.0.0.0/0`, `::/0`) | Secure encrypted web traffic access |

> [!WARNING]
> Keep database ports `3306`, `6379`, `5672`, and service ports `8080-8083` closed to external traffic. They are secured inside the Docker virtual bridge network.

---

### Step 2 — Provision Elastic IP
To ensure the host retains the same IP across updates and resets:
1. Log into the AWS EC2 Console, and head to **Network & Security** → **Elastic IPs**.
2. Click **Allocate Elastic IP address**.
3. Select the allocated address, click **Actions** → **Associate Elastic IP address**.
4. Select the target EC2 instance and click **Associate**.

---

### Step 3 — Install Docker Engine on EC2
Establish an SSH connection to your instance and run the setup scripts:

```bash
# Connect to your instance
ssh -i target-key.pem ubuntu@<YOUR-ELASTIC-IP>

# Update package mappings
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install packages
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Assign permissions to default user (avoids running commands with sudo)
sudo usermod -aG docker ubuntu
newgrp docker
```

---

### Step 4 — Clone Repository and Configure Env Variables
Clone the repo and configure your secrets using the `.env.example` structure:

```bash
# Clone
git clone https://github.com/Mahesh5f4/event-management-system.git
cd event-management-system/backend

# Create production env file
cp .env.production .env
nano .env
```

Review and set secure keys in the environment file:
```bash
# Database credentials
MYSQL_ROOT_PASSWORD=SetSecureDbPassword
SPRING_DATASOURCE_PASSWORD=SetSecureDbPassword

# Messaging broker credentials
RABBITMQ_PASSWORD=SetSecureBrokerPassword
SPRING_RABBITMQ_PASSWORD=SetSecureBrokerPassword

# Monitoring administration
GF_ADMIN_PASSWORD=SetGrafanaDashboardPassword

# Routing and domain bindings
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

---

### Step 5 — Prepare Target Folders & Build Images
Before running the containers, initialize the local directory paths and build the images:

```bash
# Create local directories for certs and backups
mkdir -p certbot/conf certbot/www backups

# Assign execution permissions to all script files
chmod +x scripts/backup.sh scripts/restore.sh scripts/auto-backup.sh init-letsencrypt.sh

# Build all docker containers from source configurations
docker compose build
```

---

### Step 6 — Run the Stack & Verify Boot Status
Deploy the services in detached mode and trace the logs:

```bash
# Start
docker compose up -d

# Verify all 10 containers are running and healthy
docker compose ps
```

Expected healthy boot order takes ~2 minutes. Verify status values:
```text
eventhub-mysql             -> healthy
eventhub-redis             -> healthy
eventhub-rabbitmq          -> healthy
eventhub-ml-service        -> healthy
eventhub-auth-service      -> healthy
eventhub-event-service     -> healthy
eventhub-booking-service   -> healthy
eventhub-gateway-service   -> healthy
eventhub-nginx             -> healthy
```

---

### Step 7 — SSL Setup (Let's Encrypt)
To enable HTTPS, execute the automated verification script:

```bash
# Run HTTPS initialization script
./init-letsencrypt.sh yourdomain.com your-email@example.com
```

To manage the certificate lifecycle, configure automated renew tasks inside the server's crontab:
```bash
# Open crontab config
crontab -e

# Append renewal task (fires on the 1st of every month)
0 0 1 * * cd /home/ubuntu/event-management-system/backend && docker run --rm -v $(pwd)/certbot/conf:/etc/letsencrypt -v $(pwd)/certbot/www:/var/www/certbot certbot/certbot:latest renew --quiet && docker compose restart nginx
```

---

### Step 8 — Configure Database Backup Policy
Deploy automated database dumps to protect transaction records:

```bash
# Install cron job mapping (automates DB dumps every night at 2:00 AM)
make setup-backup-cron

# Verify the job mapping is active
crontab -l
```

Manual actions (useful when upgrading containers or running server migrations):
```bash
# Run manual database dump
make backup

# Restore database from dump file
make restore FILE=./backups/eventhub_backup_20260720_120000.sql
```

---

### Step 9 — Deployment Verification Checklist
Execute these commands post-deployment to ensure all systems are operating correctly:

#### Check Infrastructure Services
```bash
# Test MySQL connection
docker exec eventhub-mysql mysqladmin ping -u root --password="$MYSQL_ROOT_PASSWORD"

# Test Redis connection
docker exec eventhub-redis redis-cli ping

# Test RabbitMQ connection
docker exec eventhub-rabbitmq rabbitmq-diagnostics check_port_connectivity
```

#### Test API routing and internal services
```bash
# Fetch health check status of Auth microservice through Nginx Gateway
curl -s http://localhost/api/auth/actuator/health

# Verify ML Recommendation service health check response
docker exec eventhub-ml-service python -c \
  "import urllib.request; print(urllib.request.urlopen('http://localhost:8001/health').read())"
```

---

### Step 10 — Redeployment & Maintenance
When pushing updates to production, execute a rolling update without dropping active client connections:

```bash
# Pull new changes, build image updates, and hot-restart containers
make update
```

---

## 💻 Running Locally

### Prerequisites
*   Docker & Docker Compose v2
*   Java 17 (JDK) — for running services outside Docker
*   Node.js 20+

There are two ways to run EventHub locally:

---

### Option A — Full Docker Compose (Recommended)

Runs **everything** in containers, exactly as it will on EC2.

```bash
# 1. Set up environment
cd backend
cp .env.example .env
# Edit .env — set your SMTP/Google credentials

# 2. Build all images (first run: ~8 minutes)
docker compose build

# 3. Start all 10 services
docker compose up -d

# 4. Check all containers are healthy (~2 minutes)
docker compose ps

# 5. Access the API
# Swagger UI: http://localhost/swagger-ui.html
# API Base:   http://localhost/api/
```

> **Note:** In Docker Compose mode, Nginx listens on port 80. The gateway is not directly accessible.

---

### Option B — Infrastructure in Docker, Services on Host (Faster Dev Cycle)

Runs MySQL, Redis, RabbitMQ, and ML service in Docker; Spring Boot services on your machine for hot-reload.

```bash
# 1. Start infrastructure only
cd backend
cp .env.example .env
docker compose up -d mysql redis rabbitmq ml-service

# 2. Run all Spring Boot services
.\start-all.bat
# (or run each service individually with: ./mvnw spring-boot:run)

# 3. Access directly via gateway (no Nginx in this mode)
# Swagger UI: http://localhost:8080/swagger-ui.html
# API Base:   http://localhost:8080/api/

# 4. Start Frontend
cd ../frontend && npm install && npm run dev
```

---

### Common Local Commands

```bash
make status          # Show container health
make logs            # Tail all logs
make logs-booking    # Tail a specific service
docker compose restart auth-service  # Restart one service
```

---

## 🧪 Testing

The codebase maintains an aggregated **~70% Instruction Coverage** (Auth Service: ~91%).
*   **Unit Tests:** JUnit 5 and Mockito verifying core business logic and exception handling without database dependencies.
*   **Integration Tests:** `MockMvc` verifying full controller layers, serialization, and HTTP status codes.
*   **Multi-Module Reporting:** A dedicated `coverage-report` maven module aggregates JaCoCo metrics across all microservices into a single unified HTML report.

**Run Tests:**
```bash
cd backend
./mvnw clean verify
```

---

## 💡 Challenges Solved

**Challenge: The Double Booking Race Condition**
During popular event sales, multiple users attempt to checkout the exact same seat simultaneously. If two threads read the database simultaneously, both see the seat as "available", process payment, and write to the database, resulting in an oversold seat.

**Solution: Multi-Layered Concurrency Control**
1. **Layer 1 (Application):** Distributed Mutex using Redis `SETNX`. The user "locks" the seat for 5 minutes during checkout. Any concurrent request for that seat fails immediately with `409 Conflict` out of memory, never touching the DB.
2. **Layer 2 (Database):** Optimistic Locking (`@Version` annotation). Even if the lock fails or expires unexpectedly, Hibernate checks the entity version during the final `UPDATE`. If another transaction altered it, an `OptimisticLockException` rolls back the transaction entirely.

---

## 🔭 Future Improvements

> Current deployment: single EC2 instance · Docker Compose · MySQL single node

### Near Term
- [ ] **Load testing suite** — k6 or Gatling scripts targeting booking endpoint under 1,000 concurrent users; publish empirical benchmark results
- [ ] **Idempotency keys** — prevent duplicate bookings on network retry (client-generated `X-Idempotency-Key` header + Redis deduplication)
- [ ] **CI/CD to EC2** — extend GitHub Actions to build images, push to ECR, and SSH-deploy on merge to `main`
- [ ] **Refresh tokens** — replace single JWT with access + refresh token pair for better session management

### Medium Term
- [ ] **Kubernetes migration** — Helm charts for each service; HPA on Booking Service during flash sale spikes
- [ ] **Distributed tracing** — OpenTelemetry + Jaeger/Zipkin for end-to-end request tracing across services
- [ ] **Blue-green deployments** — zero-downtime production releases with traffic shifting
- [ ] **Read replicas** — MySQL read replica for event catalog queries, offloading the primary write node
- [ ] **API versioning** — `/api/v1/` and `/api/v2/` routing at the Gateway layer

### Long Term
- [ ] **Event sourcing** — CQRS pattern for the Booking aggregate; full audit log of every state transition
- [ ] **Database sharding / distributed SQL** — CockroachDB or Vitess for horizontal write scaling
- [ ] **Multi-region active-active** — Route 53 latency routing + cross-region MySQL replication
- [ ] **Kafka migration** — Replace RabbitMQ with Kafka for replay-capable event streaming at scale

---

## 📊 Engineering Metrics

### API Performance (Architectural Analysis)

| Endpoint | Without Optimization | With Optimization | Improvement | Method |
|---|---|---|---|---|
| `GET /api/events` (catalog) | ~180–250ms | ~5–15ms | **~95% faster** | Redis L2 cache eliminates MySQL disk I/O |
| `POST /api/bookings` | ~2,500–3,000ms | ~80–120ms | **~97% faster** | RabbitMQ async offload of PDF + email |
| `POST /api/seats/:id/lock` | N/A (race condition) | ~2–5ms | **Race-free** | Redis `SETNX` atomic in-memory operation |
| Duplicate booking attempt | DB deadlock / oversell | ~1ms rejection | **100% safe** | `@Version` optimistic lock + Redis gate |

### Docker Deployment Metrics

| Metric | Before | After | Gain |
|---|---|---|---|
| Build context size | ~26 MB | ~2 MB | **90% smaller** |
| Runtime image size (per service) | ~550 MB (JDK) | ~180 MB (JRE alpine) | **67% smaller** |
| Publicly exposed ports | 8 ports | 2 ports (80, 443) | **75% reduction** |
| Services with health checks | 0 | 10 / 10 | **100% coverage** |
| Data persistent across restarts | MySQL only | MySQL + Redis AOF + RabbitMQ + Grafana | **4× persistence** |

### Test Coverage

| Module | Instruction Coverage |
|---|---|
| auth-service | ~91% |
| event-service | ~65% |
| booking-service | ~62% |
| common-library | ~78% |
| **Aggregate** | **~70%** |

> **Methodology note:** API latency figures are architectural estimates derived from Spring Boot Actuator metrics patterns and Redis/MySQL I/O characteristics at the design load of 1,000 concurrent users. For empirical load-test results, a JMeter/k6 suite targeting the EC2 deployment is planned — see [Future Improvements](#-future-improvements).

---

## 📸 Screenshots

### Event Discovery Dashboard
![Event Discovery — dark-themed event catalog with ML-powered cards](./docs/screenshots/event-discovery.png)
*Event catalog with real-time seat availability badges, price filters, and ML-powered recommendations*

### Interactive Seat Booking
![Seat Booking Flow — interactive seat map with Redis lock timer](./docs/screenshots/booking-flow.png)
*Live seat map with Redis-backed distributed locking — selected seats are reserved for 5 minutes during checkout*

### Centralized Swagger UI (API Gateway)
![Swagger UI — aggregated API docs from all microservices](./docs/screenshots/swagger-ui.png)
*All microservice APIs (Auth, Event, Booking) aggregated at the Gateway — accessible at `/swagger-ui.html`*

### Grafana Monitoring Dashboard
![Grafana — real-time metrics across all Spring Boot services](./docs/screenshots/grafana-dashboard.png)
*Prometheus + Grafana monitoring: JVM heap, request rates, error rates, and booking success metrics across all services*

---

## 📝 Resume Highlights

*   **Architected and deployed** a highly available distributed event ticketing platform utilizing a Spring Boot microservices architecture (API Gateway, Auth, Event, Booking).
*   **Engineered a multi-layered concurrency strategy** eliminating double-booking race conditions during high-traffic flash sales using Redis `SETNX` distributed locks and JPA Optimistic Locking.
*   **Optimized API response times and throughput** by implementing L2 Redis caching for read-heavy operations and RabbitMQ for asynchronous offloading of resource-intensive tasks (PDF generation).
*   **Integrated enterprise-grade payment and authentication flows**, including Razorpay for secure checkout processing and Google OAuth 2.0 SSO alongside JWT-based custom auth.
*   **Built a state-of-the-art frontend experience** utilizing React, Redux, and Framer Motion to deliver a premium "Liquid Glass" UI with real-time WebSocket seat mapping.
*   **Established comprehensive CI/CD pipelines** via GitHub Actions, integrating multi-module Maven builds, automated testing, and aggregated JaCoCo reporting achieving 70%+ global test coverage.

---

## 🎓 Learning Outcomes

*   Designing resilient microservices boundaries and inter-service communication.
*   Handling distributed concurrency control and understanding the CAP theorem tradeoffs.
*   Implementing asynchronous message-driven architectures for decoupled system design.
*   Centralizing API documentation (OpenAPI 3) and routing through a Spring Cloud Gateway.

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
