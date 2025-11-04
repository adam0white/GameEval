# Epic 4: Polish & Production Readiness **(Post-MVP)**

**Goal:** Optimize performance, handle edge cases, and ensure production reliability at scale.

**Value:** Transforms MVP into production-grade system - handles 10+ concurrent tests reliably, optimizes costs, and handles edge cases gracefully.

**Phase:** Post-MVP - Days 6+

**Dependencies:** Epic 3 (MVP complete)

---

## Stories

**Story 4.1: Concurrent Test Load Testing**

As a developer,
I want to test the system with 10+ concurrent test runs,
So that I validate it handles real-world load reliably.

**Acceptance Criteria:**
1. Load testing script submits 10-15 tests simultaneously
2. All tests complete successfully without failures
3. No database deadlocks or race conditions
4. WebSocket connections remain stable under load
5. Average test duration remains under 4 minutes
6. Dashboard remains responsive during peak load
7. Resource usage monitored: Workers CPU, D1 queries, R2 bandwidth
8. Identify and document any bottlenecks
9. Optimize: add indexes, cache queries, batch operations as needed

**Prerequisites:** Epic 3 complete

---

**Story 4.2: Advanced Error Handling and Edge Cases**

As a developer,
I want comprehensive error handling for edge cases,
So that the system fails gracefully in unexpected situations.

**Acceptance Criteria:**
1. Handle: Games with authentication walls
2. Handle: Games that never finish loading (infinite spinners)
3. Handle: Games with pop-up blockers or cookie consent
4. Handle: Games that crash the browser
5. Handle: Extremely slow games (>10s to load)
6. Handle: Games with no interactive elements
7. All edge cases return helpful error messages to users
8. Timeout handling improved: detect and report specific timeout causes
9. Retry logic tuned based on error type
10. Add telemetry: track error rates by type

**Prerequisites:** Story 4.1

---

**Story 4.3: AI Gateway Cost Optimization**

As a developer,
I want to minimize AI costs through caching and model selection,
So that the system is cost-efficient at scale.

**Acceptance Criteria:**
1. AI Gateway cache hit rate monitoring
2. Tune cache TTL based on usage patterns
3. Analyze cost per test by model
4. Implement smart model selection: use Workers AI when sufficient, frontier models only when needed
5. Batch AI requests where possible (e.g., evaluate multiple screenshots in one call)
6. Compress images before sending to AI models (optimize size vs quality)
7. Add cost dashboard: total spend, per-test cost, cost by model
8. Target: <$0.10 per test average cost

**Prerequisites:** Story 4.1

---

**Story 4.4: UI Polish and Responsive Design**

As a game developer,
I want a polished, professional dashboard UI,
So that the tool feels production-ready.

**Acceptance Criteria:**
1. Mobile-responsive layout (works on tablets and phones)
2. Loading states and skeleton screens for better UX
3. Error messages styled consistently
4. Toast notifications for actions (test submitted, test complete)
5. Smooth animations and transitions
6. Accessibility: keyboard navigation, ARIA labels, screen reader support
7. Dark mode support (optional, nice-to-have)
8. Favicon and meta tags for sharing
9. Polish screenshot lightbox: smooth transitions, keyboard controls
10. Empty states improved with helpful illustrations/text

**Prerequisites:** Story 4.1

---

**Story 4.5: Rate Limiting with Cloudflare Rate Limiting**

As a developer,
I want to prevent abuse using Cloudflare's built-in rate limiting,
So that I control costs without building custom rate limiting logic.

**Acceptance Criteria:**
1. Configure Cloudflare Rate Limiting rule for test submission endpoint
2. Limit: 10 test submissions per hour per IP address (configurable)
3. Return clear error message when rate limit exceeded: "You've reached the limit of 10 tests per hour. Please try again later."
4. Optionally: Use Cloudflare Workers Rate Limiting API for more granular control
5. Monitor rate limit hits in Cloudflare Analytics
6. Document rate limiting configuration in README
7. Test rate limiting with rapid submissions

**Prerequisites:** Story 4.1

**Technical Notes:**
- Use Cloudflare's native Rate Limiting feature (not custom code)
- Configure via Cloudflare Dashboard or Terraform/Pulumi
- Alternative: Use Workers Rate Limiting API if more flexibility needed
- Consider allowlisting trusted IPs (post-MVP)
- Rate limit applies to test submission only, not viewing results

---

**Story 4.6: AI Security with Firewall for AI**

As a developer,
I want to protect AI interactions from prompt injection and PII leakage,
So that the system is secure and trustworthy.

**Acceptance Criteria:**
1. Integrate Cloudflare Firewall for AI into AI Gateway configuration
2. Enable prompt injection detection for all AI requests
3. Enable PII detection and redaction for user inputs (game URLs, input schemas)
4. Configure security rules: block suspicious prompts, log security events
5. Test: submit malicious prompt attempts, verify they're blocked
6. Test: submit inputs with fake PII (emails, phone numbers), verify redaction
7. Security event logging to test_events table
8. Dashboard shows security status: "AI interactions protected by Firewall for AI"

**Prerequisites:** Story 4.1

**Technical Notes:**
- Firewall for AI is part of AI Gateway configuration
- Automatically scans prompts before sending to AI models
- PII redaction happens transparently (users don't see it)
- Reference: Cloudflare AI Gateway security features
- Consider security analytics dashboard (post-MVP)

---

**Epic 4 Summary:**
- **Total Stories:** 6
- **Can run in parallel:** Stories 4.2, 4.3, 4.4, 4.5, 4.6 after 4.1 establishes baseline
- **Estimated Duration:** Days 6-8
- **Deliverable:** Production-grade system ready for real-world usage at scale

---
