# Story 1.1: Project Setup and Cloudflare Configuration

**Story ID:** 1.1  
**Epic:** Epic 1 - Core Test Infrastructure  
**Status:** ready-for-dev  
**Created:** 2025-11-04  
**Assigned To:** Developer

---

## User Story

**As a** developer,  
**I want** a configured Cloudflare Workers project with all required services,  
**So that** I have the foundation to build the GameEval autonomous test pipeline.

---

## Business Context

Epic 1 establishes the foundational infrastructure for the GameEval QA pipeline. This story creates the project scaffold, configures all Cloudflare service bindings (Workflows, D1, R2, Browser Rendering, AI Gateway), and sets up the development environment. Without this foundation, no tests can execute.

This is the **first story** in the project and unblocks all subsequent development work.

**Value:** Enables all future stories by providing the project structure and service bindings required for test execution.

[Source: docs/epic-1-context.md, Section 1]

---

## Acceptance Criteria

1. ✅ **Cloudflare Workers project initialized** with `wrangler.toml` configuration
2. ✅ **Service bindings configured** for:
   - Workflows (binding: `WORKFLOW`, name: `gameTestPipeline`)
   - D1 Database (binding: `DB`, database_name: `gameeval-db`)
   - R2 Bucket (binding: `EVIDENCE_BUCKET`, bucket_name: `gameeval-evidence`)
   - Browser Rendering (binding: `BROWSER`)
   - AI Gateway (binding: `AI`)
   - Durable Objects (binding: `TEST_AGENT`, class_name: `TestAgent`)
3. ✅ **Project structure created** following the architecture pattern:
   - `/src/index.ts` - Dashboard Worker entry point
   - `/src/workers/` - Worker implementations
   - `/src/agents/` - TestAgent Durable Object (skeleton)
   - `/src/workflows/` - Workflow orchestration
   - `/src/shared/` - Shared types, helpers, constants
   - `/migrations/` - D1 migration scripts
4. ✅ **TypeScript configuration** with strict mode enabled (`tsconfig.json`)
5. ✅ **Package.json** with required dependencies:
   - `@cloudflare/workers-types` (^4.0.0)
   - `@cloudflare/ai` (^1.0.0)
   - `stagehand` (latest)
   - `wrangler` (^3.78.0)
6. ✅ **Basic Dashboard Worker** responds to HTTP GET `/` with "GameEval QA Pipeline - Ready"
7. ✅ **Development environment verified**:
   - `wrangler dev` runs successfully
   - `tsc --noEmit` shows no type errors
   - All service bindings accessible in Worker environment

[Source: docs/epics/epic-1-core-test-infrastructure.md, Story 1.1]

---

## Tasks and Subtasks

### Task 1: Initialize Cloudflare Project
- [ ] Create project directory: `gameeval-qa-pipeline`
- [ ] Run `wrangler init` to scaffold project
- [ ] Configure `wrangler.toml` with compatibility_date: "2024-01-01"
- [ ] Set project name: `gameeval-qa-pipeline`
- [ ] Set main entry point: `src/index.ts`

### Task 2: Configure Service Bindings in wrangler.toml
- [ ] Add AI Gateway binding: `[ai]` with `binding = "AI"`
- [ ] Add D1 database binding: `[[d1_databases]]` with `binding = "DB"`, `database_name = "gameeval-db"`
- [ ] Add R2 bucket binding: `[[r2_buckets]]` with `binding = "EVIDENCE_BUCKET"`, `bucket_name = "gameeval-evidence"`
- [ ] Add Workflows binding: `[[workflows]]` with `binding = "WORKFLOW"`, `name = "gameTestPipeline"`
- [ ] Add Durable Objects binding: `[[durable_objects.bindings]]` with `name = "TEST_AGENT"`, `class_name = "TestAgent"`
- [ ] Add Browser Rendering binding: `[browser]` with `binding = "BROWSER"`

### Task 3: Create Project Structure
- [ ] Create directory structure:
  - `src/` (root source directory)
  - `src/workers/` (Worker implementations)
  - `src/agents/` (Durable Objects)
  - `src/workflows/` (Workflow orchestration)
  - `src/shared/types.ts` (TypeScript interfaces)
  - `src/shared/constants.ts` (Error messages, timeouts)
  - `src/shared/helpers/` (r2.ts, d1.ts, ai-gateway.ts)
  - `migrations/` (D1 migration scripts)
- [ ] Create placeholder files for future stories (empty exports)

### Task 4: Configure TypeScript
- [ ] Create `tsconfig.json` with:
  - `"strict": true`
  - `"target": "ES2022"`
  - `"module": "ES2022"`
  - `"moduleResolution": "bundler"`
  - `"types": ["@cloudflare/workers-types"]`
  - `"resolveJsonModule": true`
  - `"jsx": "react"` (for future dashboard UI)

### Task 5: Initialize package.json with Dependencies
- [ ] Create `package.json` with project metadata
- [ ] Add dev dependencies:
  - `@cloudflare/workers-types@^4.0.0`
  - `typescript@^5.0.0`
- [ ] Add runtime dependencies:
  - `@cloudflare/ai@^1.0.0`
  - `stagehand@latest` (for Epic 2)
- [ ] Add scripts:
  - `"dev": "wrangler dev"`
  - `"deploy": "wrangler deploy"`
  - `"lint": "tsc --noEmit"`

### Task 6: Implement Basic Dashboard Worker
- [ ] Create `src/index.ts` with fetch handler:
  - Accept `Request`, `Env`, `ExecutionContext` parameters
  - Check if pathname === '/' and method === 'GET'
  - Return Response with "GameEval QA Pipeline - Ready" (status 200)
  - Return 404 for all other routes
- [ ] Define `Env` interface with all binding types:
  - `AI: any`
  - `DB: D1Database`
  - `EVIDENCE_BUCKET: R2Bucket`
  - `WORKFLOW: Workflow`
  - `TEST_AGENT: DurableObjectNamespace`
  - `BROWSER: Fetcher`

### Task 7: Create Cloudflare Resources
- [ ] Run `wrangler d1 create gameeval-db` to create D1 database
- [ ] Copy database_id to `wrangler.toml` under `[[d1_databases]]`
- [ ] Run `wrangler r2 bucket create gameeval-evidence` to create R2 bucket
- [ ] Verify resources created in Cloudflare dashboard

### Task 8: Verify Development Environment
- [ ] Run `npm install` to install dependencies
- [ ] Run `tsc --noEmit` to check for type errors (should pass)
- [ ] Run `wrangler dev` and test locally:
  - Access `http://localhost:8787/` in browser
  - Verify response: "GameEval QA Pipeline - Ready"
- [ ] Verify all bindings accessible (test by logging `env.DB`, `env.EVIDENCE_BUCKET`, etc.)

### Task 9: Deploy to Cloudflare (Optional Validation)
- [ ] Run `wrangler deploy` to deploy to production
- [ ] Access deployed Worker URL
- [ ] Verify response: "GameEval QA Pipeline - Ready"
- [ ] Check Cloudflare dashboard for successful deployment

[Implementation Pattern: RPC-only architecture, no REST API endpoints. All service bindings configured for internal communication.]

[Source: docs/architecture/project-structure.md, docs/architecture/implementation-patterns.md]

---

## Dev Notes

### Architecture Alignment

This story implements the foundation of the **Workflows + Agents SDK** pattern:
- **Dashboard Worker** (`src/index.ts`) serves as the entry point
- All communication uses **RPC service bindings** (no exposed HTTP APIs)
- Project structure follows the **monorepo pattern** with clear module boundaries

[Source: docs/epic-1-context.md, Section 2.1]

### Service Bindings Configuration

All bindings configured in `wrangler.toml`:
```toml
name = "gameeval-qa-pipeline"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[ai]
binding = "AI"

[[d1_databases]]
binding = "DB"
database_name = "gameeval-db"
database_id = "<generated-on-creation>"

[[r2_buckets]]
binding = "EVIDENCE_BUCKET"
bucket_name = "gameeval-evidence"

[[workflows]]
binding = "WORKFLOW"
name = "gameTestPipeline"
script_name = "gameTestPipeline"

[[durable_objects.bindings]]
name = "TEST_AGENT"
class_name = "TestAgent"
script_name = "gameeval-qa-pipeline"

[browser]
binding = "BROWSER"
```

[Source: docs/epic-1-context.md, Section 5.3]

### TypeScript Env Interface

Define all binding types in `src/shared/types.ts`:
```typescript
export interface Env {
  AI: any; // AI Gateway binding
  DB: D1Database; // D1 database
  EVIDENCE_BUCKET: R2Bucket; // R2 object storage
  WORKFLOW: Workflow; // Workflows binding
  TEST_AGENT: DurableObjectNamespace; // TestAgent DO
  BROWSER: Fetcher; // Browser Rendering API
}
```

[Source: docs/epic-1-context.md, Section 3.2]

### Testing Strategy

**Integration Test:**
1. Deploy Worker to Cloudflare
2. `curl https://<worker-url>/` → verify 200 response with "GameEval QA Pipeline - Ready"
3. Verify all bindings accessible in Worker logs

**Local Development:**
- `wrangler dev` runs Workers in local environment with service bindings emulated
- Test bindings by logging `env.DB`, `env.EVIDENCE_BUCKET`, etc. in fetch handler

[Source: docs/epic-1-context.md, Section 8.2]

### Dependencies for Future Stories

This story creates the foundation for:
- **Story 1.2**: D1 database schema (uses `DB` binding)
- **Story 1.3**: R2 storage helpers (uses `EVIDENCE_BUCKET` binding)
- **Story 1.4**: Workflow orchestration (uses `WORKFLOW` binding)
- **Story 1.5**: AI Gateway configuration (uses `AI` binding)

All subsequent stories depend on this project structure and service bindings.

[Source: docs/epic-1-context.md, Section 9]

### Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Service binding configuration errors | Validate `wrangler.toml` config, test bindings in dev environment before production |
| Missing TypeScript types | Install `@cloudflare/workers-types` and configure `tsconfig.json` properly |
| Wrangler CLI version mismatch | Use Wrangler ^3.78.0 or later (specified in package.json) |

[Source: docs/epic-1-context.md, Section 7.1]

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] `wrangler dev` runs without errors
- [ ] `tsc --noEmit` shows no type errors
- [ ] Dashboard Worker responds to HTTP GET `/` with 200 status
- [ ] All service bindings configured and accessible
- [ ] Deployed to Cloudflare and accessible via Worker URL
- [ ] Story marked as `drafted` → `ready-for-dev` in sprint-status.yaml

---

## Related Documentation

- **Epic Context:** docs/epic-1-context.md
- **Epic Details:** docs/epics/epic-1-core-test-infrastructure.md
- **Architecture:** docs/architecture/index.md
- **Project Structure:** docs/architecture/project-structure.md
- **PRD:** docs/prd/index.md

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-11-04 | Story drafted | Bob (SM) |

---

## Dev Agent Record

_This section will be populated by the Developer Agent during implementation._

### Context Reference
- `docs/stories/1-1-project-setup-and-cloudflare-configuration.context.xml` (generated 2025-11-04)

### Completion Notes
<!-- Developer Agent: Document key implementation decisions, deviations from spec, and new patterns established -->

### Debug Log References
<!-- Developer Agent: Link to any debug logs or issues encountered during development -->

### File List
<!-- Developer Agent: List all files created, modified, or deleted during implementation -->

---

## Senior Developer Review (AI)

_This section will be populated during code review (via `code-review` workflow)._

**Review Date:**  
**Reviewer:**  
**Outcome:** [ ] Approve | [ ] Changes Requested | [ ] Blocked

**Action Items:**
<!-- SM: Document review findings and required changes -->

---

## Review Follow-ups (AI)

_This section tracks review action items completion._

**Tasks:**
<!-- Developer Agent: Check off tasks as review items are addressed -->

---

