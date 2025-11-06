# GameEval Architecture Diagram

**Generated:** 2025-11-06  
**Purpose:** Visual representation of GameEval's component architecture, data flow, and technology stack.

---

## System Architecture Overview

```mermaid
graph TB
    subgraph "User Layer"
        Browser["🌐 Browser<br/>(React Dashboard)"]
    end

    subgraph "Edge Layer - Cloudflare Workers"
        DashboardWorker["📊 Dashboard Worker<br/>(src/index.ts)<br/>Serves UI + RPC Handler"]
        
        subgraph "Orchestration"
            Workflow["⚙️ Cloudflare Workflow<br/>(GameTestPipeline)<br/>4-Phase Coordinator"]
        end
        
        subgraph "Agent Layer"
            TestAgentDO["🤖 TestAgent DO<br/>(Per Test Instance)<br/>Stateful Test Executor"]
        end
    end

    subgraph "Cloudflare Services"
        BrowserRendering["🎮 Browser Rendering<br/>(Stagehand + Playwright)<br/>Autonomous Gameplay"]
        AIGateway["🧠 AI Gateway<br/>(Workers AI + Fallbacks)<br/>15-min Cache"]
        
        subgraph "Data Persistence"
            D1["🗄️ D1 Database<br/>(SQLite)<br/>Test Metadata"]
            AgentSQL["💾 Agent SQL<br/>(Per-DO Storage)<br/>Decisions & Reasoning"]
            R2["📦 R2 Storage<br/>(Object Store)<br/>Screenshots & Logs"]
        end
    end

    %% User Interactions
    Browser -->|1. Submit Test| DashboardWorker
    DashboardWorker -->|2. Start Pipeline| Workflow
    Browser -.->|WebSocket: Live Updates| TestAgentDO
    
    %% Workflow Orchestration
    Workflow -->|3. Create Agent| TestAgentDO
    Workflow -->|4. Run Phase 1| TestAgentDO
    Workflow -->|5. Run Phase 2| TestAgentDO
    Workflow -->|6. Run Phase 3| TestAgentDO
    Workflow -->|7. Run Phase 4| TestAgentDO
    
    %% TestAgent Dependencies
    TestAgentDO -->|Launch Browser| BrowserRendering
    TestAgentDO -->|AI Requests| AIGateway
    TestAgentDO -->|Store Metadata| D1
    TestAgentDO -->|Store Decisions| AgentSQL
    TestAgentDO -->|Upload Evidence| R2
    
    %% Results Flow
    TestAgentDO -.->|8. Broadcast Progress| Browser
    DashboardWorker -->|9. Query Results| D1
    DashboardWorker -->|10. Serve Evidence| R2

    style Browser fill:#e1f5ff
    style DashboardWorker fill:#fff4e1
    style Workflow fill:#f0e1ff
    style TestAgentDO fill:#e1ffe1
    style BrowserRendering fill:#ffe1e1
    style AIGateway fill:#ffe1f5
    style D1 fill:#f5f5f5
    style AgentSQL fill:#f5f5f5
    style R2 fill:#f5f5f5
```

---

## 4-Phase Test Execution Flow

```mermaid
sequenceDiagram
    participant User as 🌐 User Browser
    participant DW as 📊 Dashboard Worker
    participant WF as ⚙️ Workflow
    participant TA as 🤖 TestAgent DO
    participant BR as 🎮 Browser Rendering
    participant AI as 🧠 AI Gateway
    participant D1 as 🗄️ D1 Database
    participant R2 as 📦 R2 Storage

    User->>DW: Submit Game URL
    DW->>D1: Create test_run record (status: queued)
    DW->>WF: Start GameTestPipeline
    
    WF->>TA: Create DO instance (ID = test UUID)
    User->>TA: Connect WebSocket
    
    rect rgb(200, 220, 255)
        Note over WF,TA: Phase 1: Load & Validation (30s timeout)
        WF->>TA: runPhase1()
        TA->>BR: Launch browser session
        BR-->>TA: Browser ready
        TA->>BR: Navigate to game URL
        TA->>BR: Capture screenshot
        TA->>R2: Upload screenshot
        TA->>D1: Log event: "phase1 completed"
        TA-->>User: WebSocket: "Game loaded ✓"
        TA-->>WF: Phase 1 complete
    end
    
    rect rgb(200, 255, 220)
        Note over WF,TA: Phase 2: Control Discovery (45s timeout)
        WF->>TA: runPhase2()
        TA->>BR: Stagehand.observe()
        BR-->>TA: Interactive elements found
        TA->>TA: Store in Agent SQL
        TA->>R2: Upload controls screenshot
        TA-->>User: WebSocket: "8 controls discovered"
        TA-->>WF: Phase 2 complete
    end
    
    rect rgb(255, 240, 200)
        Note over WF,TA: Phase 3: Gameplay Exploration (5min timeout)
        WF->>TA: runPhase3()
        loop Autonomous Gameplay
            TA->>AI: "What action should I take?"
            AI-->>TA: "Click play button"
            TA->>BR: Execute action
            TA->>BR: Capture screenshot
            TA->>R2: Upload evidence
            TA->>TA: Log decision in Agent SQL
            TA-->>User: WebSocket: "Testing movement..."
        end
        TA-->>WF: Phase 3 complete
    end
    
    rect rgb(255, 220, 220)
        Note over WF,TA: Phase 4: Evaluation & Scoring (60s timeout)
        WF->>TA: runPhase4()
        TA->>R2: Retrieve all screenshots
        TA->>AI: "Evaluate game quality (vision model)"
        AI-->>TA: Scores + justifications
        TA->>D1: Insert evaluation_scores
        TA->>D1: Update test_run (status: completed)
        TA-->>User: WebSocket: "Evaluation complete! Score: 85/100"
        TA-->>WF: Phase 4 complete
    end
    
    WF->>DW: Pipeline complete
    User->>DW: Request detailed report
    DW->>D1: Query scores + events
    DW->>R2: Get evidence URLs
    DW-->>User: Display full report
```

---

## Novel Pattern: TestAgent as Durable Object

```mermaid
graph LR
    subgraph "Single TestAgent Instance"
        direction TB
        State["🧠 Durable Object State<br/>• Browser Session<br/>• Evidence Array<br/>• WebSocket Clients"]
        Methods["📋 RPC Methods<br/>• /phase1<br/>• /phase2<br/>• /phase3<br/>• /phase4<br/>• /ws"]
        AgentDB["💾 Agent SQL<br/>• agent_actions<br/>• control_discoveries<br/>• decision_log"]
        
        State -.-> Methods
        Methods -.-> AgentDB
    end
    
    Workflow["⚙️ Workflow<br/>(Orchestrator)"]
    Browser["🌐 Dashboard<br/>(Real-time UI)"]
    
    Workflow -->|"RPC: fetch phase1"| Methods
    Browser -.->|WebSocket: Live Updates| Methods
    
    Methods -->|Save Decisions| AgentDB
    Methods -->|Store Screenshots| R2[(📦 R2)]
    Methods -->|Log Events| D1[(🗄️ D1)]
    
    style State fill:#e1ffe1
    style Methods fill:#fff4e1
    style AgentDB fill:#e1f5ff
```

**Key Benefits:**
- ✅ **Single Source of Truth:** All test state in one DO instance
- ✅ **Browser Persistence:** Session survives across phases (faster, maintains game state)
- ✅ **Built-in WebSocket:** Real-time updates without polling
- ✅ **Stateful Retry:** Workflow retries preserve TestAgent context

---

## Data Architecture

```mermaid
erDiagram
    TEST_RUNS ||--o{ EVALUATION_SCORES : "has"
    TEST_RUNS ||--o{ TEST_EVENTS : "has"
    
    TEST_RUNS {
        text id PK "UUID"
        text url
        text input_schema "JSON or NULL"
        text status "queued|running|completed|failed"
        integer overall_score "0-100"
        integer created_at
        integer updated_at
        integer completed_at
    }
    
    EVALUATION_SCORES {
        integer id PK
        text test_run_id FK
        text metric_name "load|visual|controls|playability|technical"
        integer score "0-100"
        text justification
        integer created_at
    }
    
    TEST_EVENTS {
        integer id PK
        text test_run_id FK
        text phase "phase1|phase2|phase3|phase4"
        text event_type "started|progress|completed|failed"
        text description
        integer timestamp
    }
```

**Storage Strategy:**
- **D1 (SQLite):** Cross-test metadata, queryable reports
- **Agent SQL (Per-DO):** Ephemeral per-test decisions, not shared
- **R2 (Objects):** Binary artifacts (screenshots, logs)

---

## Technology Stack Layers

```mermaid
graph TB
    subgraph "Frontend Layer"
        React["React 19.2.0<br/>+ React Router"]
        Vite["Vite 7.2.0<br/>Build Tool"]
        TailwindCSS["Tailwind CSS 3.4<br/>Styling"]
    end
    
    subgraph "Compute Layer"
        Workers["Cloudflare Workers<br/>Global Edge Runtime"]
        Workflows["Cloudflare Workflows<br/>Durable Orchestration"]
        DurableObjects["Durable Objects<br/>Stateful Agents"]
    end
    
    subgraph "Automation Layer"
        BrowserAPI["Browser Rendering API"]
        Stagehand["Stagehand 2.5.0<br/>AI Browser Control"]
        Playwright["@cloudflare/playwright"]
    end
    
    subgraph "AI Layer"
        AIGatewayBox["AI Gateway<br/>Request Router"]
        WorkersAI["Workers AI<br/>Llama Vision, Gemini"]
        ThirdPartyAI["OpenAI GPT-4o<br/>Anthropic Claude 3.5"]
    end
    
    subgraph "Data Layer"
        D1DB["D1 (SQLite)"]
        AgentSQLBox["Agent SQL"]
        R2Box["R2 Object Storage"]
    end
    
    React --> Workers
    Vite --> Workers
    Workers --> Workflows
    Workflows --> DurableObjects
    DurableObjects --> BrowserAPI
    BrowserAPI --> Stagehand
    Stagehand --> Playwright
    DurableObjects --> AIGatewayBox
    AIGatewayBox --> WorkersAI
    AIGatewayBox --> ThirdPartyAI
    DurableObjects --> D1DB
    DurableObjects --> AgentSQLBox
    DurableObjects --> R2Box
    
    style React fill:#61dafb
    style Vite fill:#646cff
    style Workers fill:#f38020
    style Workflows fill:#f6821f
    style DurableObjects fill:#f6821f
    style AIGatewayBox fill:#ff6b6b
    style D1DB fill:#003b73
    style R2Box fill:#003b73
```

---

## Communication Patterns

### 1. RPC Service Bindings (Internal Only)

```mermaid
graph LR
    DW["📊 Dashboard Worker"]
    WF["⚙️ Workflow"]
    TA["🤖 TestAgent DO"]
    
    DW -->|"env.WORKFLOW.create run"| WF
    WF -->|"env.TEST_AGENT.get fetch"| TA
    DW -->|"env.TEST_AGENT.get fetch"| TA
    
    style DW fill:#fff4e1
    style WF fill:#f0e1ff
    style TA fill:#e1ffe1
```

**No HTTP APIs Exposed** - All communication via Cloudflare service bindings

---

### 2. WebSocket Real-Time Updates

```mermaid
sequenceDiagram
    participant Browser as 🌐 Dashboard
    participant Worker as 📊 Worker Proxy
    participant TestAgent as 🤖 TestAgent DO

    Browser->>Worker: Connect to /ws/{testId}
    Worker->>TestAgent: Proxy WebSocket
    TestAgent-->>Browser: WebSocket established
    
    loop During Test Execution
        TestAgent->>Browser: { phase: "discovery", status: "in_progress", progress: 45 }
        TestAgent->>Browser: { phase: "exploration", message: "Testing WASD controls" }
        TestAgent->>Browser: { evidence: { screenshotUrl: "..." } }
    end
    
    TestAgent->>Browser: { phase: "evaluation", status: "completed", score: 85 }
    Browser->>TestAgent: Close connection
```

**Benefits:** No polling, instant updates, browser maintains connection

---

## Error Handling & Retry Strategy

```mermaid
graph TD
    Start["Phase Execution Starts"] --> Execute["TestAgent Executes Phase"]
    Execute --> Success{Success?}
    
    Success -->|Yes| Complete["Phase Complete"]
    Success -->|No| Retry1{Retry Count < 3?}
    
    Retry1 -->|Yes| Context["Send Error Context to TestAgent"]
    Context --> Strategy["TestAgent Tries Alternative Strategy"]
    Strategy --> Execute
    
    Retry1 -->|No| Degrade{Can Degrade Gracefully?}
    
    Degrade -->|Yes| Partial["Continue with Partial Data"]
    Degrade -->|No| Fail["Mark Phase Failed"]
    
    Partial --> Complete
    
    Complete --> NextPhase{More Phases?}
    NextPhase -->|Yes| Start
    NextPhase -->|No| Done["Test Complete"]
    
    Fail --> UserError["Show User-Friendly Error"]
    
    style Complete fill:#90EE90
    style Fail fill:#FFB6C1
    style Partial fill:#FFD700
    style Strategy fill:#87CEEB
```

**Multi-Level Resilience:**
1. **Workflow Level:** Automatic exponential backoff retry (2 retries per phase)
2. **TestAgent Level:** Receives error context, adapts strategy
3. **User Level:** All errors translated to actionable messages

---

## Deployment Architecture

```mermaid
graph TB
    Developer["👨‍💻 Developer"]
    Git["📦 Git Repository"]
    Wrangler["🔧 Wrangler CLI"]
    
    subgraph "Cloudflare Global Network"
        Edge1["🌍 Edge Location 1<br/>(North America)"]
        Edge2["🌍 Edge Location 2<br/>(Europe)"]
        Edge3["🌍 Edge Location 3<br/>(Asia)"]
        EdgeN["🌍 ... 300+ Locations"]
    end
    
    Users["👥 Users Worldwide"]
    
    Developer -->|"git commit"| Git
    Developer -->|"npm run deploy"| Wrangler
    Wrangler -->|"Deploy to Edge"| Edge1
    Wrangler -->|"Deploy to Edge"| Edge2
    Wrangler -->|"Deploy to Edge"| Edge3
    Wrangler -->|"Deploy to Edge"| EdgeN
    
    Users -.->|"Routed to Nearest"| Edge1
    Users -.->|"Routed to Nearest"| Edge2
    Users -.->|"Routed to Nearest"| Edge3
    
    style Developer fill:#e1f5ff
    style Wrangler fill:#f38020
    style Edge1 fill:#f0e1ff
    style Edge2 fill:#f0e1ff
    style Edge3 fill:#f0e1ff
    style EdgeN fill:#f0e1ff
```

**Deployment Commands:**
```bash
# Deploy to production
npm run deploy  # Builds frontend + deploys Worker

# Rollback if needed
npx wrangler rollback
```

**Zero Infrastructure:**
- ✅ No CI/CD pipeline
- ✅ No container orchestration
- ✅ No load balancers
- ✅ Automatic global distribution

---

## File Organization

```
gameeval-qa-pipeline/
├── src/
│   ├── index.ts                    # 📊 Dashboard Worker entry point
│   ├── workers/
│   │   └── dashboard.ts            # Frontend serving + RPC handler
│   ├── workflows/
│   │   └── gameTestPipeline.ts     # ⚙️ 4-phase orchestration
│   ├── agents/
│   │   └── TestAgent.ts            # 🤖 TestAgent Durable Object
│   ├── shared/
│   │   ├── types.ts                # TypeScript interfaces
│   │   ├── constants.ts            # Config, timeouts, error messages
│   │   └── helpers/
│   │       ├── r2.ts               # R2 upload/retrieval
│   │       ├── d1.ts               # D1 query helpers
│   │       └── ai-gateway.ts       # AI request wrapper
│   └── frontend/
│       ├── main.tsx                # React entry point
│       ├── App.tsx                 # Dashboard UI
│       └── components/             # React components
├── migrations/
│   ├── 0001_create_test_runs.sql
│   ├── 0002_create_evaluation_scores.sql
│   └── 0003_create_test_events.sql
├── wrangler.toml                   # Cloudflare configuration
├── package.json
└── tsconfig.json
```

---

## Key Architectural Decisions (ADRs)

| ADR | Decision | Rationale |
|-----|----------|-----------|
| **ADR-001** | Monorepo with RPC-Only | Simplifies deployment, no exposed APIs |
| **ADR-002** | Single TestAgent DO Per Test | Stateful execution, persistent browser session |
| **ADR-003** | Workflow Auto-Retry with Error Awareness | Resilient testing, adaptive strategies |
| **ADR-004** | AI Gateway as Primary Entry Point | Cost optimization, automatic failover |
| **ADR-005** | Direct Wrangler Deploy (No CI/CD) | Reduces complexity, instant deployments |
| **ADR-006** | WebSocket for Real-Time Updates | Better UX than polling, instant feedback |
| **ADR-007** | Agent SQL for Ephemeral Data, D1 for Metadata | Optimized storage per use case |

---

## Scalability & Performance

```mermaid
graph LR
    subgraph "Auto-Scaling Components"
        Workers["Workers<br/>∞ concurrent requests"]
        DO["Durable Objects<br/>1 per test (parallel)"]
        Browser["Browser Sessions<br/>Concurrent per DO"]
        R2Store["R2<br/>Unlimited storage"]
    end
    
    subgraph "Rate Limits"
        AIGatewayLimit["AI Gateway<br/>Account-level quotas"]
        WorkflowLimit["Workflows<br/>Built-in concurrency control"]
    end
    
    subgraph "Performance Optimizations"
        Cache["AI Gateway Cache<br/>15-min TTL"]
        D1Index["D1 Indexes<br/>status, created_at"]
        R2Edge["R2 Edge Caching<br/>Screenshot delivery"]
    end
    
    Workers --> DO
    DO --> Browser
    DO --> R2Store
    DO --> AIGatewayLimit
    Workers --> WorkflowLimit
    
    AIGatewayLimit --> Cache
    R2Store --> R2Edge
    
    style Workers fill:#90EE90
    style DO fill:#90EE90
    style R2Store fill:#90EE90
    style Cache fill:#FFD700
    style D1Index fill:#FFD700
    style R2Edge fill:#FFD700
```

**Expected Performance:**
- **Test Duration:** 6-8 minutes per game (4 phases)
- **Concurrent Tests:** 100+ simultaneous (limited by AI quotas)
- **Dashboard Load Time:** < 2s (edge-cached)
- **WebSocket Latency:** < 100ms (edge proximity)

---

## Summary

**Architecture Style:** Serverless Edge Computing  
**Deployment Model:** Global Edge Network  
**Communication:** RPC + WebSocket (no REST APIs)  
**State Management:** Durable Objects (strong consistency per test)  
**Data Strategy:** Tiered (D1 metadata, Agent SQL decisions, R2 artifacts)  
**Resilience:** Multi-level retry + graceful degradation  
**Monitoring:** Built-in Cloudflare Observability

**Core Strengths:**
1. ✅ **Zero Infrastructure:** No servers, VMs, or containers
2. ✅ **Auto-Scaling:** Handles 1 or 1000 tests without config changes
3. ✅ **Stateful Agents:** Browser sessions persist across phases
4. ✅ **Real-Time UX:** WebSocket updates, no polling lag
5. ✅ **Cost-Optimized:** Workers AI primary, zero egress fees

**Novel Innovations:**
1. 🎯 TestAgent as Durable Object pattern
2. 🎯 Event-driven progress streaming via built-in WebSocket
3. 🎯 Workflow-orchestrated multi-phase testing with error recovery

---

_This diagram was generated by Winston (Architect Agent) based on the validated GameEval architecture._

