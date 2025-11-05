# Epic 4: Polish & Production Readiness **(Post-MVP)**

**Goal:** Polish the user experience with responsive design, accessibility, and refinements, then optimize performance and ensure production reliability at scale.

**Value:** Transforms MVP into production-grade system with polished UX - mobile-responsive, accessible, performant, handles 10+ concurrent tests reliably, and handles edge cases gracefully.

**Phase:** Post-MVP - Days 6+

**Dependencies:** Epic 3 (MVP complete, including Story 3.7 UX Phase 1)

**UX Alignment:** This epic implements **UX Phase 3 (Polish & Refinement)** first, then production hardening.

---

## Stories

**Story 4.1: UX Phase 3 - Polish and Responsive Design**

As a game developer,
I want a polished, professional dashboard with responsive design and accessibility,
So that GameEval feels production-ready on all devices and is accessible to all users.

**Acceptance Criteria:**

**1. Responsive Layouts**
1. Mobile responsive (<640px): Single-column card gallery, stacked Agent Focus Mode
2. Tablet responsive (640-1024px): 2-column card gallery, adjust split view ratios
3. Desktop (>1024px): 3-column card gallery, full split view (50/50)
4. Test on iOS Safari, Android Chrome, desktop browsers
5. Touch targets minimum 44x44px on mobile
6. Hamburger menu for mobile navigation (if needed)

**2. Loading States and Skeletons**
7. Skeleton screens for test cards while loading
8. Loading spinner for test submissions
9. Progressive image loading for screenshots
10. Smooth transitions between loading and loaded states
11. "Connecting..." indicator for WebSocket

**3. Empty States**
12. Welcoming empty state with helpful text and CTA
13. "No tests match" for filter results (future)
14. "Agent is working..." placeholder for screenshots in progress
15. Error state illustrations/messages

**4. Toast Notifications**
16. Success toast: "Test submitted successfully!" (auto-dismiss 3s)
17. Error toast: Clear error messages (manual dismiss)
18. No toast spam for real-time updates (update in-place instead)
19. Toast position: top-right, non-blocking

**5. Screenshot Lightbox Polish**
20. Smooth open/close transitions
21. Keyboard navigation: ← → arrows, ESC to close
22. Image zoom controls
23. Caption/metadata display in lightbox
24. Mobile-friendly swipe gestures

**6. Animations and Transitions**
25. Smooth card hover effects
26. Pulsing animation for running tests
27. Fade-in for new test cards
28. Smooth scroll to new content
29. Button hover states with transitions

**7. Accessibility (WCAG 2.1 Level AA)**
30. Keyboard navigation: Tab through all interactive elements
31. Focus indicators: 2px orange outline on all focusable elements
32. ARIA labels for all icons and status badges
33. Screen reader support: proper heading hierarchy (h1 → h2 → h3)
34. Landmark regions: nav, main, aside
35. Color contrast: 4.5:1 for text, 3:1 for UI (verify with Lighthouse)
36. Skip link to main content
37. Live regions (aria-live="polite") for status updates

**8. Error Messages and Feedback**
38. Styled error messages with consistent formatting
39. Inline validation for URL input (show errors below field)
40. Clear error states with helpful recovery actions
41. Network error handling with retry options

**9. Final Polish**
42. Favicon and meta tags for social sharing
43. Page titles update based on view
44. Smooth scrolling behavior
45. Consistent spacing and alignment throughout
46. Test dark mode rendering (already default)

**10. Quality Assurance**
47. Run Lighthouse audit (target: 90+ accessibility score)
48. Test with axe DevTools (0 violations)
49. Keyboard-only navigation testing
50. Screen reader testing (VoiceOver/NVDA)

**Prerequisites:** Story 3.7 complete (UX Phase 1 foundation in place)

**Technical Notes:**
- Reference: `docs/ux-design-specification.md` (Section 8: Responsive Design & Accessibility)
- Use Tailwind responsive utilities (sm:, md:, lg:, xl:)
- shadcn/ui provides accessible primitives (Radix UI foundation)
- Test tools: Lighthouse, axe DevTools, manual keyboard testing
- This story builds on Phase 1 foundation, polishes it to production quality

---

**Story 4.2: Concurrent Test Load Testing**

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

**Prerequisites:** Story 4.1 complete

---

**Story 4.3: Advanced Error Handling and Edge Cases**

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

**Prerequisites:** Story 4.2

---

**Story 4.4: AI Gateway Cost Optimization**

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

**Prerequisites:** Story 4.2

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
- **Story Order:** 4.1 (UX Phase 3 Polish) → 4.2 (Load Testing) → 4.3-4.6 can run in parallel
- **UX Phase Implemented:** Phase 3 (Polish & Refinement)
- **Estimated Duration:** Days 6-8
- **Deliverable:** Production-grade system with polished UX, ready for real-world usage at scale

**💎 POLISH MILESTONE:** After Story 4.1, GameEval has production-quality UX - mobile-responsive, accessible, and refined. Stories 4.2-4.6 add production hardening (load testing, security, optimization).

---
