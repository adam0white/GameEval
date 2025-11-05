# Story 3.6: Production Deployment and Documentation

Status: ready-for-dev

## Story

As a developer,
I want GameEval deployed to production with basic documentation,
so that the system is accessible and maintainable.

## Business Context

Story 3.6 is the final story in Epic 3 and completes the MVP by deploying all components (Dashboard Worker, TestAgent DO, Workflow) to Cloudflare Workers production and creating comprehensive documentation for setup, deployment, and usage. This story ensures the system is production-ready and accessible to users, with clear documentation for developers to understand the architecture, deploy the system, and use the dashboard effectively. This story completes the MVP milestone, making GameEval a fully functional, production-ready game testing pipeline.

**Value:** Enables production use of GameEval and ensures long-term maintainability through comprehensive documentation. Without this story, the system remains in development and is not accessible to users. This story validates the end-to-end production deployment and provides the foundation for future development and user onboarding.

[Source: docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md, Story 3.6]

## Acceptance Criteria

1. **Deploy Dashboard Worker to Cloudflare Workers production**: Dashboard Worker deployed to production using `wrangler deploy`, accessible at production URL, all RPC methods functional, HTML/CSS/JS served correctly
2. **Deploy TestAgent DO to production**: TestAgent Durable Object deployed to production, Durable Objects binding configured correctly, TestAgent instances can be created and accessed
3. **Deploy Workflow to production**: GameTestPipeline workflow deployed to production, Workflow service binding configured correctly, workflow can be triggered via Dashboard Worker
4. **Configure production bindings: D1, R2, Browser Rendering, AI Gateway**: All service bindings configured in wrangler.toml production environment, D1 database accessible, R2 bucket accessible, Browser Rendering accessible, AI Gateway accessible
5. **Set up production environment variables and secrets**: Production secrets configured (AI Gateway keys, any external API keys), environment variables set via Wrangler secrets, no secrets exposed in code or client-side JavaScript
6. **Create README.md with: Project overview and architecture, Setup instructions for local development, Deployment guide, Environment variable reference, RPC service binding documentation**: README.md created/updated with all required sections, architecture overview describes system components, setup instructions work for new developers, deployment guide includes production deployment steps, environment variables documented, RPC bindings explained
7. **Create USAGE.md with: How to submit tests via dashboard, How to interpret quality scores, Input schema format and examples, Troubleshooting common issues**: USAGE.md created with user guide, step-by-step instructions for submitting tests, explanation of quality score interpretation, input schema JSON format with examples, troubleshooting section with common issues and solutions
8. **Configure custom domain (optional, post-MVP acceptable)**: Custom domain configured (if desired), DNS records set up, SSL certificate configured (optional, acceptable post-MVP)
9. **Test production deployment with example game**: Submit test with example game URL in production environment, verify test executes successfully, verify dashboard displays results correctly, verify WebSocket updates work, verify all components functional

[Source: docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md, Story 3.6 Acceptance Criteria]

## Tasks / Subtasks

### Task 1: Deploy Dashboard Worker to Production (AC: 1)

- [ ] Verify Dashboard Worker code is production-ready (no debug logs, error handling complete)
- [ ] Review wrangler.toml: verify Dashboard Worker configuration (main entry point, routes)
- [ ] Run `wrangler deploy` to deploy Dashboard Worker to production
- [ ] Verify deployment successful: check Cloudflare dashboard for Worker status
- [ ] Test Dashboard Worker at production URL: verify HTML/CSS/JS served correctly
- [ ] Test RPC methods: verify `submitTest()`, `listTests()`, `getTestReport()`, `exportTestJSON()` accessible
- [ ] Verify Dashboard Worker logs accessible in Cloudflare dashboard
- [ ] Document production URL in README.md

### Task 2: Deploy TestAgent DO to Production (AC: 2)

- [ ] Verify TestAgent DO code is production-ready
- [ ] Review wrangler.toml: verify Durable Objects binding configured (`TEST_AGENT` binding, `class_name`)
- [ ] Verify TestAgent DO migrations applied (if any new migrations needed)
- [ ] Run `wrangler deploy` (includes TestAgent DO deployment)
- [ ] Verify TestAgent DO deployed: check Cloudflare dashboard for Durable Objects status
- [ ] Test TestAgent DO creation: submit test via Dashboard, verify TestAgent DO instance created
- [ ] Verify TestAgent DO WebSocket connection works in production
- [ ] Document TestAgent DO deployment in README.md

### Task 3: Deploy Workflow to Production (AC: 3)

- [ ] Verify GameTestPipeline workflow code is production-ready
- [ ] Review wrangler.toml: verify Workflows binding configured (`WORKFLOW` binding, `name`, `class_name`)
- [ ] Run `wrangler deploy` (includes Workflow deployment)
- [ ] Verify Workflow deployed: check Cloudflare dashboard for Workflow status
- [ ] Test Workflow trigger: submit test via Dashboard, verify Workflow executes
- [ ] Verify Workflow can trigger TestAgent DO correctly
- [ ] Verify Workflow logs accessible in Cloudflare dashboard
- [ ] Document Workflow deployment in README.md

### Task 4: Configure Production Bindings (AC: 4)

- [ ] Review wrangler.toml: verify all bindings configured for production:
  - D1 Database binding (`DB` binding, `database_name`, `database_id`)
  - R2 Bucket binding (`EVIDENCE_BUCKET` binding, `bucket_name`)
  - Browser Rendering binding (`BROWSER` binding)
  - AI Gateway binding (`AI` binding, `remote = true`)
  - Workflows binding (`WORKFLOW` binding)
  - Durable Objects binding (`TEST_AGENT` binding)
- [ ] Verify D1 database accessible: query test_runs table in production
- [ ] Verify R2 bucket accessible: list objects in `gameeval-evidence` bucket
- [ ] Verify Browser Rendering accessible: test browser session creation
- [ ] Verify AI Gateway accessible: test AI Gateway request (if possible)
- [ ] Document all bindings in README.md environment variable reference section
- [ ] Document binding configuration steps in deployment guide

### Task 5: Set Up Production Environment Variables and Secrets (AC: 5)

- [ ] Identify all production secrets needed:
  - AI Gateway API keys (if required)
  - Any external API keys
  - Database credentials (if any)
- [ ] Set production secrets via Wrangler CLI:
  - `wrangler secret put SECRET_NAME --env production`
- [ ] Verify secrets not exposed in code: grep for hardcoded secrets, verify no secrets in client-side JavaScript
- [ ] Verify secrets accessible in Worker: test Worker can access secrets (if applicable)
- [ ] Document secret setup process in README.md deployment guide
- [ ] Document which secrets are required in environment variable reference section
- [ ] Create `.env.example` file (if applicable) with placeholder values (never commit real secrets)

### Task 6: Create README.md Documentation (AC: 6)

- [ ] Update README.md with project overview section:
  - Project description and purpose
  - Key features (autonomous game testing, AI-powered evaluation, real-time dashboard)
  - Target use cases
- [ ] Add architecture overview section:
  - System components (Dashboard Worker, TestAgent DO, Workflow, D1, R2, Browser Rendering, AI Gateway)
  - Architecture diagram (text-based or reference to architecture docs)
  - Communication flow (RPC service bindings, WebSocket)
  - Data flow (test submission → execution → results)
- [ ] Add setup instructions for local development section:
  - Prerequisites (Node.js, npm, Wrangler CLI, Cloudflare account)
  - Installation steps (`npm install`, `npm run types`)
  - Local development setup (`npm run dev`, `wrangler dev`)
  - Database migrations (`wrangler d1 execute`)
  - R2 bucket creation (`wrangler r2 bucket create`)
  - Service bindings configuration
- [ ] Add deployment guide section:
  - Production deployment steps (`wrangler deploy`)
  - Environment configuration (wrangler.toml setup)
  - Secrets setup (`wrangler secret put`)
  - Binding configuration verification
  - Rollback procedure (`wrangler rollback`)
  - Testing production deployment
- [ ] Add environment variable reference section:
  - List all environment variables and secrets
  - Document which are required vs optional
  - Document how to set each variable/secret
  - Include example values (never real secrets)
- [ ] Add RPC service binding documentation section:
  - Explain RPC-only architecture (no REST API endpoints)
  - Document all RPC methods (Dashboard Worker methods)
  - Document service bindings (Workflow, TestAgent DO)
  - Include code examples for RPC method calls
  - Reference ADR-001 for architecture rationale
- [ ] Add project structure section (reference existing project structure)
- [ ] Add links to comprehensive documentation in `/docs` folder
- [ ] Add license section (if applicable)

### Task 7: Create USAGE.md Documentation (AC: 7)

- [ ] Create USAGE.md file in project root
- [ ] Add "How to Submit Tests via Dashboard" section:
  - Step-by-step instructions: visit dashboard URL, fill form (game URL, optional input schema), click submit
  - Screenshot of dashboard (if available) or description of UI
  - Validation requirements (HTTP/HTTPS URL, JSON schema format)
  - Expected response (test ID displayed)
- [ ] Add "How to Interpret Quality Scores" section:
  - Overall quality score explanation (0-100 scale, color coding: green >70, yellow 50-70, red <50)
  - Individual metric scores explanation:
    - Load metric (game loads successfully)
    - Visual metric (UI quality, aesthetics)
    - Controls metric (control discovery, interaction)
    - Playability metric (gameplay quality, engagement)
    - Technical metric (performance, errors, technical issues)
  - Justification text explanation (AI-generated reasoning for each score)
  - Score interpretation guide (what scores mean, when to be concerned)
- [ ] Add "Input Schema Format and Examples" section:
  - Input schema purpose (optional, guides control discovery)
  - JSON schema format specification
  - Required fields (if any)
  - Optional fields
  - Example input schemas for different game types:
    - Action game example
    - Puzzle game example
    - Strategy game example
  - Schema validation rules
  - How agent uses schema (prioritizes controls mentioned in schema)
- [ ] Add "Troubleshooting Common Issues" section:
  - Common issues and solutions:
    - "Test status stuck on Queued" → Check Workflow trigger, verify TestAgent DO accessible
    - "Test fails immediately" → Check game URL accessibility, verify Browser Rendering binding
    - "No screenshots captured" → Check R2 bucket access, verify TestAgent screenshot capture
    - "WebSocket connection fails" → Check TestAgent DO WebSocket, verify fallback to polling
    - "Quality scores not generated" → Check AI Gateway access, verify Phase 4 execution
    - "Dashboard shows error message" → Check browser console, verify RPC method calls
  - Error message interpretation guide
  - How to check logs (Cloudflare dashboard, browser console)
  - When to report issues (critical bugs, edge cases)
- [ ] Add "Best Practices" section:
  - Recommended game types (DOM-based games, not canvas)
  - Recommended input schema format
  - Testing multiple games
  - Interpreting results
- [ ] Add links to README.md and architecture documentation

### Task 8: Configure Custom Domain (Optional) (AC: 8)

- [ ] Determine if custom domain desired (optional, post-MVP acceptable)
- [ ] If custom domain desired:
  - Configure custom domain in Cloudflare dashboard
  - Set up DNS records (A or CNAME record pointing to Cloudflare Workers)
  - Configure SSL certificate (automatic via Cloudflare)
  - Update wrangler.toml with custom domain route (if applicable)
  - Test custom domain: verify dashboard accessible at custom URL
  - Document custom domain setup in README.md (optional section)
- [ ] If custom domain not desired:
  - Skip this task (acceptable for MVP)
  - Note in README.md that custom domain can be configured post-MVP

### Task 9: Test Production Deployment (AC: 9)

- [ ] Verify all components deployed:
  - Dashboard Worker accessible at production URL
  - TestAgent DO deployed (check Cloudflare dashboard)
  - Workflow deployed (check Cloudflare dashboard)
  - All bindings configured correctly
- [ ] Submit test with example game URL in production:
  - Use example game from Story 3.5 validation
  - Submit via production dashboard
  - Verify test ID generated
- [ ] Monitor test execution in production:
  - Verify test appears in dashboard test list
  - Verify status updates correctly (Queued → Running → Completed)
  - Verify WebSocket updates work in real-time (if applicable)
  - Verify progress indicator updates
- [ ] Verify test completes successfully:
  - Verify Phase 1-4 complete (check test_events in D1)
  - Verify quality scores generated (check evaluation_scores in D1)
  - Verify screenshots captured (check R2 bucket)
- [ ] Verify dashboard displays results correctly:
  - Verify test run appears in list
  - Verify overall score displayed
  - Verify detailed report view works (expand test card)
  - Verify screenshot gallery displays
  - Verify "Export JSON" button works
- [ ] Test error handling in production:
  - Submit invalid URL, verify graceful error message
  - Verify error message displayed in dashboard
- [ ] Verify production logs accessible:
  - Check Cloudflare dashboard for Dashboard Worker logs
  - Check Cloudflare dashboard for TestAgent DO logs
  - Check Cloudflare dashboard for Workflow logs
- [ ] Document production testing results in README.md or deployment guide
- [ ] Monitor production logs for first 24 hours post-deployment (optional, recommended)

## Dev Notes

### Relevant Architecture Patterns and Constraints

- **ADR-001**: Monorepo with RPC-Only Architecture - Production deployment must maintain RPC-only communication. No REST API endpoints exposed. All communication via service bindings.
- **Deployment Architecture**: Direct to Production/Staging model using `wrangler deploy`. No CI/CD pipeline needed. Global distribution to 300+ Cloudflare edge locations automatic.
- **Environment Configuration**: Production bindings configured in wrangler.toml. Secrets managed via Wrangler CLI (`wrangler secret put`). No secrets in code or client-side JavaScript.
- **Service Bindings**: All Cloudflare services (D1, R2, Browser Rendering, AI Gateway, Workflows, Durable Objects) configured via bindings in wrangler.toml. No manual API calls needed.
- **Documentation Standards**: README.md follows standard open-source project structure. USAGE.md provides user-facing documentation separate from developer documentation.

[Source: docs/architecture/architecture-decision-records-adrs.md, ADR-001]  
[Source: docs/architecture/deployment-architecture.md]  
[Source: docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md, Story 3.6 Technical Notes]  
[Source: docs/epic-3-tech-context.md, Section 3.4 Workflows - Story 3.6]

### Source Tree Components to Touch

- **`README.md`**: Update existing file with production deployment, environment variables, RPC documentation (MODIFIED)
- **`USAGE.md`**: Create new file with user guide (NEW)
- **`wrangler.toml`**: Verify production bindings configured correctly (REVIEW ONLY)
- **`docs/architecture/deployment-architecture.md`**: Reference existing deployment documentation (REFERENCE)
- **`docs/architecture/development-environment.md`**: Reference existing setup instructions (REFERENCE)
- **Dashboard Worker (`src/workers/dashboard.ts`)**: No code changes needed - deployment only (NO CHANGES)
- **TestAgent (`src/agents/TestAgent.ts`)**: No code changes needed - deployment only (NO CHANGES)
- **Workflow (`src/workflows/GameTestPipeline.ts`)**: No code changes needed - deployment only (NO CHANGES)

### Testing Standards Summary

- **Manual Testing**: This story is primarily deployment and documentation. Manual verification of production deployment, testing with example game, and documentation review.
- **Integration Testing**: Production deployment testing validates all components work together in production environment.
- **Documentation Review**: Review README.md and USAGE.md for completeness, accuracy, and clarity. Verify all instructions work for new users.
- **Production Validation**: Test production deployment with example game to validate end-to-end functionality in production environment.

[Source: docs/epic-3-tech-context.md, Section 5 Test Strategy Summary]  
[Source: docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md, Story 3.6 Technical Notes]

### Project Structure Notes

- README.md follows standard open-source project structure (project root)
- USAGE.md created in project root for user-facing documentation
- Documentation references existing architecture docs in `docs/architecture/` directory
- Deployment documentation aligns with existing `docs/architecture/deployment-architecture.md` patterns

[Source: docs/architecture/project-structure.md]

### Learnings from Previous Story

**From Story 3.5 (Example Game Testing and Validation) (Status: ready-for-dev)**

- **Validation Process**: Story 3.5 validated end-to-end system functionality with real games. Story 3.6 should use the same validation approach for production deployment testing.
- **Edge Case Documentation**: Story 3.5 documented edge cases for Epic 4. Story 3.6 should reference these edge cases in troubleshooting section of USAGE.md.
- **Test Execution Validation**: Story 3.5 validated all 4 phases execute successfully. Story 3.6 should verify production deployment maintains this functionality.
- **Dashboard Display Validation**: Story 3.5 validated dashboard displays results correctly. Story 3.6 should verify production dashboard displays results correctly.
- **WebSocket Real-Time Updates**: Story 3.5 validated WebSocket updates work in real-time. Story 3.6 should verify WebSocket functionality in production environment.
- **Error Handling**: Story 3.5 validated graceful error handling with invalid URLs. Story 3.6 should verify error handling works correctly in production.

[Source: docs/stories/3-5-example-game-testing-and-validation.md#Dev-Agent-Record]

### References

- **Cloudflare Workers Documentation**: https://developers.cloudflare.com/workers/
- **Cloudflare D1 Database Documentation**: https://developers.cloudflare.com/d1/
- **Cloudflare R2 Storage Documentation**: https://developers.cloudflare.com/r2/
- **Cloudflare Browser Rendering Documentation**: https://developers.cloudflare.com/browser-rendering/
- **Cloudflare Workflows Documentation**: https://developers.cloudflare.com/workflows/
- **Cloudflare Durable Objects Documentation**: https://developers.cloudflare.com/durable-objects/
- **Wrangler CLI Documentation**: https://developers.cloudflare.com/workers/wrangler/
- [Source: docs/architecture/architecture-decision-records-adrs.md, ADR-001]  
[Source: docs/architecture/deployment-architecture.md]  
[Source: docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md, Story 3.6 Technical Notes]  
[Source: docs/epic-3-tech-context.md, Section 3.4 Workflows - Story 3.6]

## Dev Agent Record

### Context Reference

- `docs/stories/3-6-production-deployment-and-documentation.context.xml`

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2025-01-27: Story drafted (Adam)

