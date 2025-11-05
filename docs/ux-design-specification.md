# GameEval UX Design Specification

_Created on 2025-11-05 by Adam_
_Generated using BMad Method - Create UX Design Workflow v1.0_

---

## Executive Summary

**GameEval QA Pipeline** eliminates the QA bottleneck for browser games by deploying an AI agent that thinks and plays like a human tester - discovering controls, exploring gameplay, and evaluating quality autonomously in minutes.

**The Magic:** "Submit URL → Watch AI Play Your Game → Get Instant Quality Report"

**Target Users:**
- **Game Developers**: Need rapid feedback without manual QA
- **Platform Operators**: Batch testing multiple games for catalog validation
- **AI Game Generators**: Automated feedback loops for iterative improvement

**Core Experience:** Users "listen in" on an intelligent agent's thought process as it discovers and evaluates their game in real-time - like eavesdropping on a senior QA tester working through your game, but happening in minutes with visual proof.

**Platform:** Web dashboard (Cloudflare Workers, serverless, edge-deployed)

**Current State:** MVP complete (Epic 1-3) with functional dashboard. Now optimizing UX for production readiness, post-MVP polish, and advanced features.

---

## 1. Design System Foundation

### 1.1 Design System Choice

**Selected: shadcn/ui + Tailwind CSS**

**Rationale:**
- **Modern standard** for serverless apps and developer tools (Vercel, Linear, Cal.com all use it)
- **Copy-paste components** - no npm dependencies, full control over code
- **Built on Radix UI** - excellent accessibility (WCAG AA) and functionality primitives
- **Tailwind CSS** - utility-first styling for rapid customization
- **Dark mode first** - CSS variables make theming trivial
- **Performance** - lightweight, tree-shakeable, perfect for real-time updates
- **Developer-friendly** - matches GameEval's technical, cutting-edge positioning

**What This Provides:**
- 50+ pre-built accessible components (buttons, cards, dialogs, tables, dropdowns, toasts, modals)
- Dark mode support out of the box
- Form components with validation patterns
- Data table components for test result lists
- Toast notifications for user feedback
- Command palette (future feature for power users)
- Responsive utilities built-in

**Customization Strategy:**
- Use shadcn defaults as baseline
- Customize color palette for GameEval brand
- Adjust spacing/typography for optimal dashboard density
- Add custom components as needed (agent status indicator, live feed, etc.)

**Version:** shadcn/ui (latest) + Tailwind CSS v3.4+

---

## 2. Core User Experience

### 2.1 Defining Experience

**The Dual-Mode Experience:**

GameEval serves two complementary user needs that must coexist seamlessly:

**1. Dashboard Mode (Efficiency & Overview)**
- **Primary users:** Power users, batch testers, version comparers
- **Core action:** Submit multiple URLs, check reports asynchronously, compare results
- **Mindset:** "Fire and forget" - let agents work in background, review reports later
- **Key features needed:** Test list view, batch operations, filtering/sorting, version comparison, export/download
- **Emotional goal:** Productivity, efficiency, control over multiple tests

**2. Agent Focus Mode (Connection & Control)**
- **Primary users:** Active developers, curious first-timers, decision-makers
- **Core action:** Watch ONE agent work in real-time with rich visibility into its intelligence
- **Mindset:** "Listen in" - direct connection to agent's thought process and discoveries
- **Key features needed:** Live feed with metrics, confidence scores, progress indicators, stop/kill control, visual evidence stream
- **Emotional goal:** Excitement, trust, understanding ("I see what the agent sees"), control

**The Critical UX Challenge:**
Balance the "wow factor" of Agent Focus Mode (hooks users, builds trust) with the pragmatic efficiency of Dashboard Mode (serves regular workflow). Most users start in Agent Focus, then graduate to Dashboard Mode for daily use, but return to Agent Focus when they need to check progress or investigate specific tests.

**Defining Moment:** The live testing experience - watching an intelligent agent discover and evaluate your game with transparency into its reasoning. This must feel magical initially, informative regularly, and powerful when needed.

### 2.2 Desired Emotional Response

**Target Emotions by User Journey Stage:**

**First-Time Users (Agent Focus Mode):**
- **Fascinated** - "Wow, I'm watching AI figure out my game in real-time"
- **Excited about the technology** - "This is the future of QA"
- **Assured** - "This agent knows what it's doing, I can trust the results"

**Active/Iterative Users:**
- **Empowered** - "I can stop this, I'm in control, I understand what's happening"
- **Confident** - "I trust these results and can act on them immediately"
- **Productive** - "This saves me hours of manual testing"

**Power Users (Dashboard Mode):**
- **Efficient** - "I can quickly scan multiple test results and find what matters"
- **Informed** - "I have all the data I need to make decisions"
- **In control** - "I manage multiple tests, compare versions, extract exactly what I need"

**The Tell-A-Friend Moment:**  
"Dude, I just watched an AI play my game and it found bugs I didn't even know existed. You gotta see this thing work."

**Design Principle:** The UX must start with "HYPED!" (excitement, fascination) and mature into "TRUSTED" (efficiency, control, reliability) without losing the magic.

### 2.3 Inspiration Analysis & UX Pattern Learning

**Key Inspiration Sources & What We're Learning:**

**1. GitHub Actions / Vercel Deployments (Live Progress + History)**
- **Pattern:** Collapsible step-by-step execution logs with real-time streaming
- **What works:** Clear status badges (running, success, failed), timeline showing duration, ability to expand/collapse sections
- **Apply to GameEval:** Test phases (Load → Validate → Play → Evaluate) as expandable timeline sections, each with status and duration
- **Key learning:** Users want overview first, details on demand

**2. Playwright Trace Viewer / Cypress Test Runner (Visual Test Evidence)**
- **Pattern:** Screenshot galleries with timeline scrubbing, step-by-step test execution visualization
- **What works:** Users can see exactly what the test "saw" at any point, timeline allows jumping to specific moments
- **Apply to GameEval:** Screenshot gallery tied to agent decision points, not just chronological captures
- **Key learning:** Visual proof tied to specific actions/decisions builds trust

**3. Gemini AI Status Indicators (Concise AI Progress)**
- **Pattern:** Brief status summaries ("Thinking...", "Analyzing...") rather than full token streams
- **What works:** Keeps users informed without overwhelming them with raw data
- **Apply to GameEval:** Agent status line shows current high-level action ("Discovering controls...", "Testing gameplay mechanics...", "Evaluating performance...") with expandable details
- **Key learning:** Progressive summarization > full stream dump

**4. Grafana Dashboards (Metrics Visualization) - FUTURE**
- **Pattern:** Clean metrics with consistent color palette, clear visual hierarchy, interactive drill-downs
- **What works:** Dense information presented clearly for power users
- **Apply to GameEval:** Reserved for future multi-test comparison dashboard, not single agent view
- **Key learning:** Design for growth - single agent view today, aggregate metrics tomorrow

**Design Principles Extracted:**
1. **Progressive Disclosure:** Show summary, reveal details on demand
2. **Visual Hierarchy:** Most important info prominent, supporting data accessible but not distracting
3. **Consistent Status Communication:** Clear, color-coded states across all views
4. **Evidence-Based Trust:** Every claim backed by visual or data proof
5. **Real-Time + Historical Coexistence:** Live feed for active tests, clean reports for completed tests
6. **Responsive Across Contexts:** Works for "watching closely" and "quick check-in" use cases

---

## 3. Visual Foundation

### 3.1 Color System

**Selected Theme: Agent Orange**

**Primary Color Palette:**
- Primary: `#f97316` (Orange 500) - Main actions, CTAs, running states
- Primary Dark: `#c2410c` (Orange 700) - Hover states, darker accents
- Success: `#22c55e` (Green 500) - Completed tests, positive feedback
- Error: `#ef4444` (Red 500) - Failed tests, error states
- Background: `#0a0a0a` (Near black) - Main background
- Surface: `#161616` (Dark gray) - Cards, elevated surfaces
- Border: `#333333` (Medium gray) - Borders, dividers

**Semantic Color Usage:**
- **Orange (#f97316)**: Primary actions, active tests, energy, agent activity
- **Green (#22c55e)**: Success states, completed tests, positive scores
- **Red (#ef4444)**: Errors, failed tests, critical alerts
- **Blue (#3b82f6)**: Info, links, secondary emphasis

**Rationale:**
Orange conveys energy, approachability, and warmth - perfect for game testing. More friendly than corporate blue while maintaining professionalism. Creates excitement around watching the AI agent work.

**Typography:**
- Font Family: System fonts (-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif)
- Monospace: 'Courier New', monospace (for code, IDs, URLs)
- Scale: 
  - h1: 2rem (32px)
  - h2: 1.5rem (24px)
  - h3: 1.25rem (20px)
  - Body: 1rem (16px)
  - Small: 0.875rem (14px)

**Spacing System:**
- Base unit: 4px
- Scale: 0.5rem (8px), 0.75rem (12px), 1rem (16px), 1.5rem (24px), 2rem (32px), 3rem (48px)

**Interactive Reference:**

View the complete implementation mockup with Agent Orange theme: [ux-reference-mockup.html](./ux-reference-mockup.html)

---

## 4. Design Direction

### 4.1 Chosen Design Approach

**Three-View Architecture:**

GameEval uses a three-view system optimized for different user needs:

**1. Dashboard View (Card Gallery - Default)**
- **Primary use case:** Quick overview of all tests, visual progress tracking
- **Layout:** Grid of cards with preview thumbnails/status indicators
- **Key features:**
  - Visual-first design (see test progress at a glance)
  - Quick URL submission at top (low friction)
  - Status badges and scores prominent
  - Click card to enter Agent Focus Mode
  - Toggle to Table View in header
- **User type:** All users - first-time and regular
- **Emotional goal:** Approachable, clear, easy to scan

**2. Table View (Compact List)**
- **Primary use case:** Power users managing many tests, need sorting/filtering
- **Layout:** Dense, scannable rows with key info
- **Key features:**
  - High information density
  - Sort by: recent, score, duration, status
  - Filter by: status, date range
  - Quick URL input in header (always accessible)
  - Search moved to button near sort controls
  - Toggle to Card View in header
- **User type:** Power users, batch testers
- **Emotional goal:** Efficiency, productivity, control

**3. Agent Focus Mode (Immersive Single-Test)**
- **Primary use case:** Watch agent work in real-time, understand its reasoning
- **Layout:** Full-screen with hero metrics and split content
- **Key features:**
  - Prominent status summary (e.g., "Agent is discovering controls...")
  - Rich metrics at top (Progress, Duration, Screenshots, Confidence)
  - Split view: Live feed (left) + Screenshot gallery (right)
  - Brief status updates (Gemini-style concise summaries)
  - Expandable "agent thinking" for deeper reasoning (future)
  - Back to Dashboard button
  - Stop Test button (future)
- **User type:** Active watchers, first-time users, quality checkers
- **Emotional goal:** Fascination, trust, connection to agent intelligence

**Navigation Flow:**
```
Card Gallery (Default)
  ├─→ Click card → Agent Focus Mode
  ├─→ Toggle → Table View
  └─→ Click "New Test" → Submit URL → Auto-open Agent Focus

Table View
  ├─→ Click row → Agent Focus Mode
  ├─→ Toggle → Card Gallery
  └─→ Quick submit → Auto-open Agent Focus

Agent Focus Mode
  └─→ Back button → Return to previous view (Card or Table)
```

**Rationale:**
- **Card Gallery default**: Visual progress makes sense for game testing, more engaging than text list
- **Table View available**: Power users need density and sorting
- **Agent Focus separate**: Immersive experience for watching AI work, doesn't clutter main dashboard
- **Easy switching**: Toggle between Card/Table based on user preference, seamlessly enter/exit Focus Mode

**Design Decisions:**
- **Layout density:** Balanced in Card, Dense in Table, Spacious in Focus
- **Visual hierarchy:** Status and scores most prominent
- **Navigation pattern:** Persistent header with view toggle
- **Primary action:** "Start Test" always accessible
- **Content approach:** Visual progress indicators over text-heavy

**Interactive Reference Mockup:**

Complete implementation mockup showing all three views with Agent Orange theme: [ux-reference-mockup.html](./ux-reference-mockup.html)

This single-page mockup includes:
- Card Gallery view (default)
- Table View (power users)
- Agent Focus Mode (immersive single-test)
- All with Agent Orange color scheme and proper component styling

---

## 5. User Journey Flows

### 5.1 Critical User Paths

**Journey 1: First-Time User - "Watch the Magic"**

**Goal:** Submit game URL and watch AI agent test it live

**Flow:**
1. **Land on Dashboard (Card Gallery)** → See example tests, understand the concept
2. **Input game URL** → Paste URL in prominent input at top
3. **Click "Start Test"** → Immediately redirected to Agent Focus Mode
4. **Watch agent work** → See status summary, live feed updates, screenshots populate
5. **Test completes** → See final score and evaluation metrics
6. **Explore report** → Review screenshots, export if needed
7. **Return to dashboard** → Click back, see completed test in gallery

**Key moments:**
- Instant feedback on submit (no waiting on dashboard)
- Real-time status summary keeps them engaged
- Visual proof (screenshots) builds trust
- "Tell a friend" moment: watching AI discover their game

**Decisions:**
- Auto-open Agent Focus Mode on submit (don't make them search for it)
- Brief status updates (not overwhelming logs)
- Prominent metrics (Progress, Duration, Confidence)

---

**Journey 2: Power User - "Batch and Review"**

**Goal:** Submit multiple game URLs, review results later

**Flow:**
1. **Dashboard (prefer Table View)** → Toggle to Table View for density
2. **Submit multiple tests** → Quick URL input in header, submit 5-10 URLs rapidly
3. **Continue working** → Close tab, let agents work in background
4. **Return later** → See completed tests in table
5. **Sort/filter results** → Sort by score, filter by status
6. **Review specific tests** → Click to open Agent Focus Mode for deeper inspection
7. **Export/compare** → Download reports, compare versions

**Key moments:**
- Low-friction submission (no modal, inline input)
- Fire-and-forget (don't need to watch)
- Efficient scanning (table density, sorting)
- Quick access to details when needed

**Decisions:**
- Table View remembers user preference
- Quick submit in header (always accessible)
- Search/sort/filter for large test sets
- Export button on completed tests

---

**Journey 3: Active Developer - "Iterative Testing"**

**Goal:** Test half-finished game, make changes, test again

**Flow:**
1. **Submit game URL** → Start test from Card Gallery
2. **Watch in Agent Focus Mode** → See agent struggle with incomplete feature
3. **Notice issue** → "Agent can't find start button" in live feed
4. **Stop test (future)** → Kill the test early, no need to wait
5. **Fix game** → Update code based on feedback
6. **Re-submit same URL** → Quick re-test
7. **Watch improvement** → Agent now progresses further
8. **Iterate** → Repeat cycle until game passes

**Key moments:**
- Fast feedback loop (submit → watch → fix → repeat)
- Agent reasoning visible (understand why it failed)
- Stop control (don't waste time on broken tests)
- Version comparison (see progress across iterations)

**Decisions:**
- Agent Focus Mode shows clear failure reasons
- Stop button for running tests (future feature)
- Re-submit same URL easy (remember recent URLs)
- Version comparison view (future feature)

---

**Journey 4: Report Sharing - "Show Stakeholders"**

**Goal:** Share test results with team/clients

**Flow:**
1. **Find completed test** → In Card Gallery or Table View
2. **Open Agent Focus Mode** → Review full report
3. **Export options:**
   - **JSON export** → For programmatic analysis
   - **Download screenshots** → Visual evidence zip file
   - **Share link (future)** → Shareable URL to report
   - **Generate bug report (future)** → Formatted issue with evidence
4. **Send to team** → Email, Slack, issue tracker

**Key moments:**
- Professional-looking report (impress stakeholders)
- Visual proof attached (screenshots)
- Multiple export formats (developer-friendly)

**Decisions:**
- Export button prominent on completed tests
- Screenshot gallery with download all option
- Clean, shareable report format
- Future: Public sharing links with access control

---

**Journey 5: Progress Check - "Is It Done Yet?"**

**Goal:** Quickly check if tests have completed

**Flow:**
1. **Open dashboard** → Card Gallery shows visual status
2. **Scan running tests** → Orange "RUNNING" badges with duration
3. **Click running test (optional)** → Enter Agent Focus Mode to check progress
4. **See phase/time remaining** → "Phase 2: Gameplay • 2m 13s elapsed"
5. **Decide:** Wait or stop (future)
6. **Return to dashboard** → Continue working

**Key moments:**
- Instant visual scan (see status without clicking)
- Progress visibility (which phase, how long)
- Control options (stop if needed)

**Decisions:**
- Status badges color-coded and prominent
- Duration shown on cards (no need to click)
- Agent Focus Mode optional (not required for check-in)
- Stop button visible in Focus Mode (future)

---

**Design Patterns Applied:**

1. **Progressive disclosure:** Summary on dashboard → Details in Focus Mode
2. **Low-friction submission:** Always-accessible URL input, no complex forms
3. **Dual modes:** Dashboard (overview) ↔ Focus (deep dive)
4. **Visual progress:** Colors, badges, thumbnails communicate status
5. **Flexible paths:** Card or Table view based on user preference
6. **Auto-routing:** Submit → Auto-open Focus Mode (don't make users hunt)
7. **Evidence-based:** Every claim backed by screenshots and logs

---

## 6. Component Library

### 6.1 Component Strategy

**From shadcn/ui (Use as-is):**
- Button (primary, secondary, destructive variants)
- Card (for test items)
- Badge (status indicators)
- Input (URL submission, search)
- Table (Table View)
- Dialog/Modal (future: confirmation dialogs)
- Toast (notifications)
- Dropdown Menu (sort, filter options)

**Custom Components Needed:**

**1. Test Card Component**
- **Purpose:** Display test summary in Card Gallery
- **Anatomy:** Thumbnail/status visual, URL, status badge, duration, score (if complete)
- **States:** Running (animated), Completed (static), Failed (error styling)
- **Variants:** Compact (in grid), Expanded (with actions)
- **Behavior:** Click → Navigate to Agent Focus Mode; Hover → Show quick actions

**2. Agent Status Header**
- **Purpose:** Show live agent status in Focus Mode
- **Anatomy:** Live indicator, status text, metrics grid (Progress, Duration, Screenshots, Confidence)
- **States:** Active (pulsing indicator), Completed (static)
- **Styling:** Hero treatment with gradient background
- **Behavior:** Updates in real-time via WebSocket

**3. Live Feed Timeline**
- **Purpose:** Show agent's thought process and actions
- **Anatomy:** Timestamp, event type, message, expandable details (future)
- **States:** Loading (skeleton), Active (streaming), Historical (static)
- **Variants:** Compact (brief summary), Expanded (full details - future)
- **Behavior:** Auto-scroll to latest, expandable for "thinking tokens"

**4. Screenshot Gallery**
- **Purpose:** Display visual evidence with context
- **Anatomy:** Grid of images, captions, phase labels
- **States:** Loading (skeleton), Populated (images), Lightbox (fullscreen)
- **Behavior:** Click → Open lightbox with navigation; Auto-populate as agent captures

**5. Quick Submit Input**
- **Purpose:** Low-friction URL submission
- **Anatomy:** URL input field, Submit button, optional schema toggle (future)
- **States:** Empty, Typing (validation), Submitting (loading), Success (redirect)
- **Variants:** Header (compact), Landing (prominent)
- **Behavior:** Submit → Auto-open Agent Focus Mode

**6. View Toggle**
- **Purpose:** Switch between Card and Table views
- **Anatomy:** Two-option toggle (Card icon, Table icon)
- **States:** Card active, Table active
- **Persistence:** Remember user preference in localStorage
- **Behavior:** Toggle → Smooth transition, maintain scroll position if possible

---

## 7. UX Pattern Decisions

### 7.1 Consistency Rules

**Status Communication:**
- **Running:** Orange badge, pulsing indicator, elapsed time shown
- **Completed:** Green badge, final score prominent, duration shown
- **Failed:** Red badge, error message visible, retry option
- **Colors:** Orange (#f97316) = active, Green (#22c55e) = success, Red (#ef4444) = error

**Button Hierarchy:**
- **Primary:** Orange background (#f97316), white text - main actions ("Start Test", "Submit")
- **Secondary:** Transparent background, orange border, orange text - supporting actions ("View Report", "Export")
- **Destructive:** Red background (#ef4444), white text - dangerous actions ("Stop Test" - future, "Delete")

**Feedback Patterns:**
- **Success:** Toast notification (top-right), green, auto-dismiss 3s
- **Error:** Toast notification (top-right), red, manual dismiss
- **Loading:** Skeleton screens for content, spinner for actions
- **Real-time updates:** No toast spam - status updates in-place

**Navigation Patterns:**
- **Dashboard ↔ Focus:** Back button top-left, remembers previous view
- **Card ↔ Table:** Toggle button top-right, smooth transition
- **Active state:** URL path reflects current view (/dashboard, /test/:id)

**Empty States:**
- **No tests yet:** Welcoming message, prominent "Start your first test" CTA, example screenshot
- **No results (filter):** "No tests match" message, clear filters button
- **Test in progress (no screenshots yet):** "Agent is working..." with animated placeholder

**Modal/Dialog Patterns:**
- **Confirmation:** "Stop Test" requires confirmation (future)
- **Lightbox:** Screenshots open in overlay, keyboard navigation (←/→), ESC to close
- **Non-blocking:** Use toasts over modals when possible

**Real-Time Updates:**
- **Live feed:** New items prepend to top, auto-scroll, max 50 items visible
- **Status changes:** Badge updates in-place (color + text change)
- **WebSocket connection:** Show "Connecting..." or "Disconnected" status if issues
- **Polling fallback:** If WebSocket fails, poll every 2s

**Form Patterns:**
- **URL input:** Validate on blur (check format), show error inline
- **Optional schema:** Collapsed by default, expand on click (future)
- **Submit behavior:** Disable button during submit, show loading spinner
- **Error handling:** Clear error message below field, red border on input

**Data Display:**
- **Timestamps:** Relative for recent ("10s ago", "2h ago"), absolute for old
- **Durations:** Always "Xm Ys" format (e.g., "2m 34s")
- **Scores:** Large, bold numbers (0-100), color-coded (green >80, yellow 60-80, red <60)
- **URLs:** Truncate with ellipsis if too long, show full URL on hover tooltip

**Responsive Breakpoints:**
- **Mobile (<640px):** Single column, stack elements, hide Table View (too dense)
- **Tablet (640-1024px):** 2-column Card Gallery, Table View available
- **Desktop (>1024px):** 3-column Card Gallery, full Table View, Agent Focus split view

**Accessibility:**
- **Keyboard navigation:** Tab through interactive elements, Enter to activate, ESC to close
- **Focus indicators:** 2px orange outline on all interactive elements
- **ARIA labels:** All icons have aria-label, status changes announced
- **Color contrast:** WCAG AA compliant (4.5:1 for text, 3:1 for UI)
- **Screen readers:** Proper heading hierarchy, landmark regions (nav, main, aside)

---

## 8. Responsive Design & Accessibility

### 8.1 Responsive Strategy

**Breakpoints:**
- **Mobile:** <640px (sm)
- **Tablet:** 640-1024px (md-lg)
- **Desktop:** >1024px (xl+)

**Responsive Behavior:**

**Dashboard View:**
- **Desktop:** 3-column card grid, full table with all columns
- **Tablet:** 2-column card grid, table with 4 main columns (hide metadata)
- **Mobile:** Single-column cards, Table View hidden (redirect to Card View)

**Agent Focus Mode:**
- **Desktop:** Split view (live feed left 50%, screenshots right 50%)
- **Tablet:** Split view (adjust to 40/60 or stack on portrait)
- **Mobile:** Single column, tabbed interface (Feed tab, Screenshots tab)

**Header/Navigation:**
- **Desktop:** Full horizontal layout, all controls visible
- **Tablet:** Compact icons, dropdown menus for less-used actions
- **Mobile:** Hamburger menu for navigation, sticky submit button

**Touch Targets:**
- **Mobile:** Minimum 44x44px for all interactive elements
- **Desktop:** Standard button sizes (40px height sufficient)

### 8.2 Accessibility Strategy

**WCAG 2.1 Level AA Compliance**

**Key Requirements:**
- **Color contrast:** 4.5:1 for normal text, 3:1 for large text and UI components
- **Keyboard navigation:** All functionality accessible without mouse
- **Focus management:** Clear visible focus indicators, logical tab order
- **Screen reader support:** Semantic HTML, ARIA labels, live regions for updates
- **Alternative text:** Descriptive alt text for screenshots
- **Error identification:** Clear, descriptive error messages

**Implementation:**
- shadcn/ui provides accessible primitives (Radix UI foundation)
- Test with: Lighthouse, axe DevTools, keyboard-only navigation
- Live region for agent status updates (aria-live="polite")
- Skip link to main content
- Proper heading hierarchy (h1 → h2 → h3)

**Performance Considerations:**
- Lazy load screenshots (only visible ones)
- WebSocket connection cleanup on unmount
- Debounce search/filter inputs
- Pagination for large test lists (50 per page)

---

## 9. Implementation Guidance

### 9.1 Implementation Summary

**What We've Designed:**

**1. Three-View Architecture**
- **Card Gallery (Default):** Visual-first dashboard for all users
- **Table View:** High-density list for power users with sorting/filtering
- **Agent Focus Mode:** Immersive single-test experience with live updates

**2. Visual System**
- **Color Theme:** Agent Orange (#f97316) - approachable, energetic, game-focused
- **Design System:** shadcn/ui + Tailwind CSS - modern, flexible, accessible
- **Typography:** System fonts for performance, monospace for technical content

**3. Core UX Patterns**
- **Progressive disclosure:** Summary → Details on demand
- **Low-friction submission:** Always-accessible URL input
- **Real-time feedback:** WebSocket updates, brief status summaries
- **Visual evidence:** Screenshots tied to agent decisions
- **Flexible workflows:** Support first-time, power, and iterative users

**4. Key Design Decisions**
- Auto-open Agent Focus Mode on submit (don't make users hunt)
- Brief status updates (Gemini-style, not log spam)
- Card Gallery default (visual makes sense for games)
- Table View for power users (remember preference)
- Stop button in Focus Mode (future feature)
- Expandable "thinking tokens" (future feature)

### 9.2 Implementation Priorities

**Phase 1: MVP Enhancement (Current)**
- Implement Card Gallery view with Test Card components
- Add Agent Focus Mode with status header and live feed
- Apply Agent Orange color theme consistently
- Improve URL submission UX (low friction, auto-open Focus)
- Add view toggle (Card ↔ Table)

**Phase 2: Power User Features**
- Build Table View with sorting/filtering
- Add search functionality
- Export options (JSON, screenshots zip)
- View preference persistence (localStorage)

**Phase 3: Polish & Refinement**
- Mobile responsive layouts
- Empty states and loading skeletons
- Toast notifications
- Screenshot lightbox
- Keyboard shortcuts
- Accessibility audit and fixes

**Phase 4: Advanced Features (Future)**
- Stop/kill running tests
- Expandable agent "thinking tokens"
- Version comparison view
- Public sharing links
- Bulk operations
- Aggregated metrics dashboard (Grafana-style)

### 9.3 Technical Notes for Developers

**Component Structure:**
```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── TestCard.tsx     # Custom: Card Gallery item
│   ├── AgentStatus.tsx  # Custom: Focus Mode header
│   ├── LiveFeed.tsx     # Custom: Timeline component
│   ├── ScreenshotGallery.tsx
│   └── QuickSubmit.tsx
├── views/
│   ├── DashboardView.tsx  # Card Gallery + Table toggle
│   ├── TableView.tsx      # High-density list
│   └── AgentFocusView.tsx # Single-test immersive
└── hooks/
    ├── useWebSocket.ts    # Real-time updates
    └── useTestData.ts     # Test CRUD operations
```

**State Management:**
- View preference: localStorage
- Test data: React Query (or similar) for caching
- Real-time updates: WebSocket + React state
- Navigation: React Router with URL state

**Real-Time Architecture:**
- WebSocket connection per test (in Agent Focus Mode)
- Brief status summaries sent from agent
- Full logs stored in DB, queryable if needed
- Disconnect detection with reconnection logic

**Color Theme Implementation:**
```css
/* Tailwind config extension */
colors: {
  primary: '#f97316',      // orange-500
  'primary-dark': '#c2410c', // orange-700
  success: '#22c55e',      // green-500
  error: '#ef4444',        // red-500
  surface: '#161616',
  border: '#333333',
}
```

### 9.4 Next Steps

**For Developers:**
1. Install shadcn/ui and configure theme with Agent Orange colors
2. Build Card Gallery view first (highest impact)
3. Implement Agent Focus Mode (the "wow" factor)
4. Add Table View toggle
5. Connect WebSocket for real-time updates
6. Polish mobile responsive behavior

**For Designers (Optional):**
1. Create high-fidelity mockups in Figma based on this spec
2. Design detailed micro-interactions (loading states, transitions)
3. Create screenshot placeholder illustrations
4. Design marketing assets showing the live agent experience

**For Product:**
1. Validate flows with target users
2. Prioritize Phase 2-4 features based on user feedback
3. Plan analytics to track view preferences (Card vs Table)
4. Consider public beta / demo environment

---

## Appendix

### Related Documents

- Product Requirements: `docs/prd/index.md`
- Epic Summary: `docs/epics/epic-summary.md`

### Core Interactive Deliverables

**Primary Implementation Reference:**
- **[ux-reference-mockup.html](./ux-reference-mockup.html)** - Single-page mockup with all three chosen views and Agent Orange theme
  - Card Gallery view (default dashboard)
  - Table View (power user mode)
  - Agent Focus Mode (immersive single-test experience)
  - Full color scheme, component styling, and interactions
  - **Use this as the implementation reference**


### Optional Enhancement Deliverables

_This section will be populated if additional UX artifacts are generated through follow-up workflows._

<!-- Additional deliverables added here by other workflows -->

### Next Steps & Follow-Up Workflows

This UX Design Specification can serve as input to:

- **Wireframe Generation Workflow** - Create detailed wireframes from user flows
- **Figma Design Workflow** - Generate Figma files via MCP integration
- **Interactive Prototype Workflow** - Build clickable HTML prototypes
- **Component Showcase Workflow** - Create interactive component library
- **AI Frontend Prompt Workflow** - Generate prompts for v0, Lovable, Bolt, etc.
- **Solution Architecture Workflow** - Define technical architecture with UX context

### Version History

| Date     | Version | Changes                         | Author        |
| -------- | ------- | ------------------------------- | ------------- |
| 2025-11-05 | 1.0     | Initial UX Design Specification | Adam |

---

_This UX Design Specification was created through collaborative design facilitation, not template generation. All decisions were made with user input and are documented with rationale._

