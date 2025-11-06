# GameEval QA Pipeline

**Autonomous AI-powered game testing and quality evaluation platform**

GameEval is an intelligent testing pipeline that automatically evaluates browser-based games using AI agents. It combines serverless browser automation, computer vision, and large language models to test games without human intervention, providing comprehensive quality scores and actionable insights.

## 🎯 Key Features

- **Autonomous Testing**: AI agents discover and interact with games automatically
- **Four-Phase Evaluation**: Load validation → Control discovery → Gameplay exploration → Quality scoring
- **Real-Time Dashboard**: Live progress updates via WebSockets with detailed test reports
- **Production-Ready**: Built on Cloudflare Workers, globally distributed to 300+ edge locations
- **Zero-Infrastructure**: Fully serverless using Cloudflare D1, R2, Browser Rendering, and AI Gateway

## 🏗️ Architecture Overview

GameEval uses a modern RPC-only architecture with Cloudflare Workers ecosystem:

### System Components

```
┌──────────────────────────────────────────────────────────────┐
│                      Dashboard Worker                         │
│  • Serves HTML/CSS/JS (inline, no static hosting)            │
│  • Exposes RPC methods: submitTest(), listTests(), etc.      │
│  • Handles WebSocket connections for live updates            │
└───────────────────────┬──────────────────────────────────────┘
                        │ RPC binding
                        ↓
┌──────────────────────────────────────────────────────────────┐
│                    Workflow Orchestration                     │
│  • GameTestPipeline: Coordinates 4-phase test execution      │
│  • Automatic retries, timeouts, state persistence            │
└───────────────────────┬──────────────────────────────────────┘
                        │ RPC binding
                        ↓
┌──────────────────────────────────────────────────────────────┐
│                  TestAgent Durable Object                     │
│  • Browser automation via Stagehand + Playwright             │
│  • Phase execution: Load → Controls → Gameplay → Evaluation  │
│  • WebSocket broadcasting for real-time updates              │
└───────────────────────┬──────────────────────────────────────┘
                        │ Service bindings
                        ↓
┌──────────────────────────────────────────────────────────────┐
│              Cloudflare Services (D1, R2, etc.)              │
│  • D1: Test metadata (test_runs, scores, events)            │
│  • R2: Screenshots, logs, artifacts                          │
│  • Browser Rendering: Serverless browser sessions            │
│  • AI Gateway: LLM routing for evaluation                    │
└──────────────────────────────────────────────────────────────┘
```

### Communication Flow

1. **Test Submission**: User submits game URL via dashboard → Dashboard Worker validates → Triggers Workflow
2. **Orchestration**: Workflow creates TestAgent DO instance → Executes 4 phases sequentially
3. **Execution**: TestAgent loads game in browser → Discovers controls → Explores gameplay → Scores quality
4. **Updates**: TestAgent broadcasts progress via WebSocket → Dashboard displays real-time updates
5. **Completion**: Final scores saved to D1 → Screenshots to R2 → Dashboard shows report

### Data Flow

- **Input**: Game URL + optional input schema (JSON)
- **Processing**: Browser automation, AI evaluation, screenshot capture
- **Storage**: D1 (metadata), R2 (artifacts)
- **Output**: Quality scores (0-100), justifications, screenshots, event log

**RPC-Only Architecture**: No exposed HTTP REST APIs. All communication via service bindings. See [ADR-001](docs/architecture/architecture-decision-records-adrs.md) for rationale.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Generate TypeScript types from wrangler.toml
npm run types

# Build frontend assets
npm run build:frontend

# Start local development server
npm run dev

# Deploy to production
npm run deploy
```

Access dashboard: `http://localhost:8787` (local) or `https://gameeval.adamwhite.work` (production)

## 📋 Prerequisites

- **Node.js**: 25.x or later
- **npm**: 11.x or later  
- **Wrangler CLI**: 4.x or later (`npm install -g wrangler`)
- **Cloudflare Account**: With the following enabled:
  - Workers (Paid plan for Durable Objects)
  - D1 Database
  - R2 Storage
  - Browser Rendering
  - AI Gateway
  - Workflows

## 🔧 Setup Instructions for Local Development

### 1. Clone and Install

```bash
git clone <repository-url>
cd GameEval
npm install
```

### 2. Configure Cloudflare Account

Update `account_id` in `wrangler.toml`:

```toml
account_id = "your-cloudflare-account-id"
```

### 3. Create D1 Database

```bash
# Create database
wrangler d1 create gameeval-db

# Update wrangler.toml with database_id from output
# Then run migrations
wrangler d1 execute gameeval-db --file=migrations/0001_create_test_runs.sql
wrangler d1 execute gameeval-db --file=migrations/0002_create_evaluation_scores.sql
wrangler d1 execute gameeval-db --file=migrations/0003_create_test_events.sql
wrangler d1 execute gameeval-db --file=migrations/0004_add_metadata_to_test_events.sql
wrangler d1 execute gameeval-db --file=migrations/0005_add_error_message_to_test_runs.sql
```

### 4. Create R2 Bucket

```bash
wrangler r2 bucket create gameeval-evidence
```

### 5. Configure Environment Variables

Create `.dev.vars` for local development (never commit this file):

```bash
# .dev.vars
R2_PUBLIC_URL=http://localhost:8787
```

For production, environment variables are set in `wrangler.toml` `[vars]` section.

### 6. Set Secrets (if required)

If your AI Gateway requires API keys:

```bash
# For production
wrangler secret put AI_GATEWAY_API_KEY

# For local dev, add to .dev.vars
# AI_GATEWAY_API_KEY=your-key-here
```

### 7. Generate TypeScript Types

```bash
npm run types
```

This generates `worker-configuration.d.ts` with all binding types from `wrangler.toml`.

### 8. Start Development Server

```bash
npm run dev
```

Dashboard accessible at `http://localhost:8787`

## 📦 Deployment Guide

### Deploy to Production

```bash
# Build frontend and deploy
npm run deploy

# Or manually:
npm run build:frontend
wrangler deploy
```

This deploys:
- Dashboard Worker (main entry point)
- TestAgent Durable Object
- GameTestPipeline Workflow
- All service bindings configured automatically

### Production Configuration

Production settings in `wrangler.toml`:

```toml
name = "gameeval-qa-pipeline"
main = "src/index.ts"
compatibility_date = "2025-11-04"
account_id = "a20259cba74e506296745f9c67c1f3bc"
workers_dev = false

[[routes]]
pattern = "gameeval.adamwhite.work"
custom_domain = true

[vars]
R2_PUBLIC_URL = "https://evidence.adamwhite.work"
```

### Custom Domain Setup

Custom domain already configured: `gameeval.adamwhite.work`

To configure your own:
1. Add domain to Cloudflare
2. Update `pattern` in `wrangler.toml` routes section
3. Set `custom_domain = true`
4. Deploy with `wrangler deploy`
5. SSL certificate configured automatically by Cloudflare

### Verify Deployment

1. Check Cloudflare Dashboard → Workers & Pages
2. Verify Worker status is "Active"
3. Verify Durable Objects binding present
4. Verify Workflows binding present
5. Test dashboard at production URL

### Rollback

```bash
wrangler rollback
```

This rolls back to the previous deployment version.

### View Logs

```bash
# Tail production logs
wrangler tail

# View logs in Cloudflare Dashboard
# Navigate to Workers & Pages → gameeval-qa-pipeline → Logs
```

## 🔑 Environment Variables and Secrets

### Environment Variables

Set in `wrangler.toml` `[vars]` section:

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `R2_PUBLIC_URL` | string | Base URL for serving R2 artifacts | `https://evidence.adamwhite.work` |

### Secrets

Set via Wrangler CLI (not stored in code):

```bash
# Set production secret
wrangler secret put SECRET_NAME

# List secrets
wrangler secret list

# Delete secret
wrangler secret delete SECRET_NAME
```

**Security**: Never commit secrets to version control. Secrets are encrypted and stored in Cloudflare's infrastructure.

### Service Bindings

Configured in `wrangler.toml`, no manual setup required:

| Binding | Type | Purpose |
|---------|------|---------|
| `DB` | D1 Database | Test metadata storage |
| `EVIDENCE_BUCKET` | R2 Bucket | Screenshots, logs, artifacts |
| `BROWSER` | Browser Rendering | Serverless browser sessions |
| `AI` | AI Gateway | LLM request routing |
| `WORKFLOW` | Workflows | Test orchestration |
| `TEST_AGENT` | Durable Object | TestAgent instances |

## 🔌 RPC Service Binding Documentation

GameEval uses **RPC-only architecture** with service bindings for all communication. No HTTP REST APIs are exposed.

### Dashboard Worker RPC Methods

Access via RPC binding in client-side JavaScript:

```javascript
// Submit a new test
const response = await rpc.submitTest(gameUrl, inputSchema);
// Returns: { testId: string; message: string }

// List recent tests
const tests = await rpc.listTests(limit);
// Returns: TestRunSummary[]

// Get detailed test report
const report = await rpc.getTestReport(testId);
// Returns: TestReport (scores, screenshots, events, logs)

// Export test as JSON
const json = await rpc.exportTestJSON(testId);
// Returns: string (JSON)
```

### Workflow Service Binding

Trigger workflow from Dashboard Worker:

```typescript
// Create workflow instance and run
const instance = await env.WORKFLOW.create();
const result = await instance.run({
  testRunId: string,
  gameUrl: string,
  inputSchema?: string
});
```

### TestAgent Durable Object Binding

Access TestAgent DO from Workflow:

```typescript
// Get Durable Object instance
const id = env.TEST_AGENT.idFromName(testRunId);
const stub = env.TEST_AGENT.get(id);

// Send RPC request
const response = await stub.fetch(new Request('https://fake-host/run', {
  method: 'POST',
  body: JSON.stringify({ gameUrl, inputSchema })
}));
```

### Why RPC-Only?

- **Security**: No exposed HTTP endpoints reduces attack surface
- **Performance**: Direct service bindings are faster than HTTP
- **Simplicity**: No API versioning, CORS, or authentication needed
- **Type Safety**: Full TypeScript support for RPC methods

See [ADR-001](docs/architecture/architecture-decision-records-adrs.md) for detailed rationale.

## 📂 Project Structure

```
GameEval/
├── src/
│   ├── index.ts                    # Main entry point, exports DO and Workflow
│   ├── agents/
│   │   └── TestAgent.ts            # TestAgent Durable Object (SQLite-backed)
│   ├── workers/
│   │   └── dashboard.ts            # Dashboard Worker (RPC methods, HTML)
│   ├── workflows/
│   │   └── GameTestPipeline.ts     # Workflow orchestration
│   ├── frontend/                   # React frontend (Vite build)
│   │   ├── main.tsx                # Frontend entry point
│   │   ├── components/             # React components
│   │   └── views/                  # Dashboard views
│   └── shared/
│       ├── types.ts                # TypeScript interfaces
│       ├── constants.ts            # App constants
│       └── helpers/                # D1, R2, AI Gateway helpers
├── migrations/                     # D1 database migrations
├── docs/                           # Comprehensive documentation
│   ├── architecture/               # Architecture decisions, patterns
│   ├── epics/                      # Epic definitions
│   ├── stories/                    # User stories with context
│   └── prd/                        # Product requirements
├── dist/frontend/                  # Built frontend assets (Vite output)
├── wrangler.toml                   # Cloudflare Workers configuration
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── vite.config.ts                  # Vite build configuration
├── README.md                       # This file
└── USAGE.md                        # User guide (how to use dashboard)
```

## 🧪 Testing

### Manual Testing

```bash
# Start dev server
npm run dev

# In another terminal, submit test
curl -X POST http://localhost:8787/test
```

### Integration Tests

Integration tests located in `tests/` directory:

```bash
# Phase-based tests
tests/phase1-integration.test.ts
tests/phase2-integration.test.ts
tests/phase3-integration.test.ts
tests/phase4-integration.test.ts

# Story-based tests
tests/story-3.1-dashboard-worker.test.ts
tests/story-3.2-test-run-list.test.ts
tests/story-3.3-websocket-connection.test.ts
tests/story-3.4-detailed-test-report.test.ts
```

Run tests manually against running `wrangler dev` instance.

### Production Validation

After deployment, test with example game:

1. Visit `https://gameeval.adamwhite.work`
2. Submit test with example game URL
3. Verify test executes successfully
4. Verify dashboard displays results
5. Verify WebSocket updates work in real-time

## 📚 Comprehensive Documentation

See `/docs` directory for detailed documentation:

- **Architecture**: [docs/architecture/](docs/architecture/)
  - [Architecture Decision Records (ADRs)](docs/architecture/architecture-decision-records-adrs.md)
  - [Technology Stack Details](docs/architecture/technology-stack-details.md)
  - [Deployment Architecture](docs/architecture/deployment-architecture.md)
  - [Novel Pattern Designs](docs/architecture/novel-pattern-designs.md)
  - [Security Architecture](docs/architecture/security-architecture.md)

- **Product Requirements**: [docs/prd/](docs/prd/)
  - [Introduction/Overview](docs/prd/1-introductionoverview.md)
  - [Product Vision & Goals](docs/prd/2-product-vision-goals.md)
  - [Technical Architecture](docs/prd/6-technical-architecture.md)

- **Epics & Stories**: [docs/epics/](docs/epics/)
  - [Epic 1: Core Test Infrastructure](docs/epics/epic-1-core-test-infrastructure.md)
  - [Epic 2: AI Test Agent & Browser Automation](docs/epics/epic-2-ai-test-agent-browser-automation.md)
  - [Epic 3: Live Dashboard & Real-Time Updates](docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md)

- **User Guide**: [USAGE.md](USAGE.md) - How to use the dashboard

## 🛠️ Modern Best Practices

GameEval follows the latest Cloudflare Workers best practices:

- **ESNext Modules**: Latest JavaScript features
- **ctx.exports Pattern**: Modern service binding access pattern  
- **Generated Types**: Using `wrangler types` (not deprecated `@cloudflare/workers-types`)
- **Native AI Binding**: Using native AI binding (not deprecated `@cloudflare/ai` package)
- **Node.js Compatibility**: Enabled via `nodejs_compat` flag
- **Monorepo Architecture**: Single codebase for all components
- **TypeScript Strict Mode**: Full type safety
- **Zero Build Step**: Workers deployed directly from TypeScript

## 🌍 Global Distribution

Automatic deployment to 300+ Cloudflare edge locations worldwide:

- **Dashboard**: Served from nearest edge location to user
- **Durable Objects**: TestAgent instances created near game servers
- **D1 Database**: Replicated globally with automatic failover
- **R2 Storage**: Globally distributed object storage
- **Browser Rendering**: Regional browser sessions

No additional configuration required - Cloudflare handles distribution automatically.

## 🔒 Security

- **No Exposed APIs**: RPC-only architecture
- **Secrets Management**: Encrypted secrets via Wrangler CLI
- **Error Sanitization**: Stack traces and internal details stripped from user-facing errors
- **Input Validation**: All user inputs validated via Zod schemas
- **HTTPS Only**: All traffic encrypted via Cloudflare SSL

## 📄 License

Private project - All rights reserved

## 🤝 Support

For issues, questions, or feature requests, see the `/docs` directory or contact the development team.

---

**Production URL**: https://gameeval.adamwhite.work  
**Built with**: Cloudflare Workers, Durable Objects, Workflows, D1, R2, Browser Rendering, AI Gateway  
**Version**: 1.0.0 (MVP Complete)
