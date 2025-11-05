# Story 3.7: UX Phase 1 - Three-View Architecture with Agent Orange Theme

Status: ready-for-dev

## Story

As a game developer,
I want a modern, professional dashboard with Card Gallery, Agent Focus Mode, and Agent Orange branding,
so that GameEval feels polished and provides an engaging testing experience.

## Business Context

Story 3.7 is the UX enhancement phase that transforms the MVP dashboard into a modern, professional interface using shadcn/ui + Tailwind CSS with the Agent Orange color scheme. This story implements the three-view architecture (Card Gallery, Table View toggle placeholder, Agent Focus Mode) as specified in the UX Design Specification, establishing the visual foundation for all future features. This story enhances the user experience while maintaining all existing functionality from Stories 3.1-3.6, ensuring the dashboard feels polished and engaging for both first-time users and power users. This story completes Epic 3's MVP milestone with UX polish, making GameEval production-ready with a professional appearance.

**Value:** Creates a memorable first impression for users, builds trust through polished design, and establishes the UI foundation for future advanced features. Without this story, the dashboard remains functional but lacks the professional polish needed for production use. This story transforms GameEval from a functional MVP into a polished product that users will want to share and recommend.

[Source: docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md, Story 3.7]  
[Source: docs/ux-design-specification.md]

## Acceptance Criteria

1. **Install and configure shadcn/ui + Tailwind CSS**: shadcn/ui installed and configured with Tailwind CSS, components directory structure created (`src/components/ui/`), Tailwind config includes Agent Orange color palette, system fonts configured
2. **Implement Agent Orange color system**: Primary color `#f97316` (Orange 500) for main actions and running states, Primary Dark `#c2410c` (Orange 700) for hover states, Success `#22c55e` (Green 500) for completed tests, Error `#ef4444` (Red 500) for failed tests, Background `#0a0a0a`, Surface `#161616`, Border `#333333`, Tailwind config extended with custom colors
3. **Configure Tailwind with custom color palette and typography**: Tailwind config file updated with Agent Orange colors, typography scale configured (h1: 2rem, h2: 1.5rem, h3: 1.25rem, body: 1rem, small: 0.875rem), system fonts configured (San Francisco, Segoe UI, system-ui)
4. **Implement Card Gallery View (Default Dashboard)**: Grid layout for test cards (3 columns desktop, 2 tablet, 1 mobile), TestCard component created with visual status indicator (animated pulse for running), game URL truncated with tooltip, status badge with Agent Orange colors, duration/elapsed time display, quality score (if completed) with color coding, Quick Submit input at top of page (always visible, low friction), empty state message: "No tests yet. Submit a game URL to get started!", click card → Navigate to Agent Focus Mode
5. **Implement Agent Focus Mode (Immersive Single-Test View)**: Full-screen layout with back button (returns to Card Gallery), Agent Status Header component with large status summary ("Agent is discovering controls..."), metrics grid: Progress (1/4), Duration (2m 34s), Screenshots (8), Confidence (85%), live pulsing indicator when active, split view layout (desktop): Left 50%: Live Feed Timeline component, Right 50%: Screenshot Gallery component, Live Feed Timeline with timestamp + brief status updates (Gemini-style concise), auto-scroll to latest, color-coded event types, Screenshot Gallery with grid layout, captions, click to open lightbox (fullscreen, keyboard navigation), load as agent captures them, final report display (when complete): Large quality score with color, individual metric scores with progress bars, AI justifications, Export JSON button
6. **Create custom component library**: Use shadcn/ui components: Button, Card, Badge, Input, create custom components: TestCard (for gallery), AgentStatusHeader (for focus mode), LiveFeedTimeline (event stream), ScreenshotGallery (with lightbox), QuickSubmitInput (URL submission)
7. **Implement navigation and state management**: URL routing: `/` (Card Gallery), `/test/:id` (Agent Focus), back button in Focus Mode returns to `/`, auto-open Agent Focus Mode on new test submission, maintain scroll position when returning to gallery, view preference persistence (localStorage) for Card/Table toggle
8. **Match UX reference mockup styling**: Use `docs/ux-reference-mockup.html` as visual reference, match color scheme exactly (Agent Orange theme), match spacing and component styling, follow three-view architecture as specified in UX Design Specification

[Source: docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md, Story 3.7 Acceptance Criteria]  
[Source: docs/ux-design-specification.md, Section 1: Design System Foundation, Section 4: Design Direction]

## Tasks / Subtasks

### Task 1: Install and Configure shadcn/ui + Tailwind CSS (AC: 1)

- [ ] Install Tailwind CSS: `npm install -D tailwindcss postcss autoprefixer`
- [ ] Initialize Tailwind config: `npx tailwindcss init -p`
- [ ] Install shadcn/ui CLI: `npx shadcn-ui@latest init`
- [ ] Configure shadcn/ui with project settings (TypeScript, Tailwind, CSS variables)
- [ ] Create components directory: `src/components/ui/` for shadcn components
- [ ] Configure Tailwind config file (`tailwind.config.js` or `tailwind.config.ts`):
  - Set content paths: `["./src/**/*.{js,ts,jsx,tsx}"]`
  - Extend theme with Agent Orange colors (see Task 2)
  - Configure typography scale
  - Configure system fonts
- [ ] Add Tailwind directives to main CSS file: `@tailwind base;`, `@tailwind components;`, `@tailwind utilities;`
- [ ] Verify Tailwind compilation works: Run build command, check for errors
- [ ] Test shadcn/ui component installation: Install Button component as test, verify it renders correctly

### Task 2: Implement Agent Orange Color System (AC: 2)

- [ ] Update Tailwind config with custom color palette:
  - Primary: `#f97316` (orange-500)
  - Primary Dark: `#c2410c` (orange-700)
  - Success: `#22c55e` (green-500)
  - Error: `#ef4444` (red-500)
  - Background: `#0a0a0a`
  - Surface: `#161616`
  - Border: `#333333`
- [ ] Add CSS variables for colors in global CSS file (for shadcn/ui compatibility):
  - `--primary: #f97316`
  - `--primary-dark: #c2410c`
  - `--success: #22c55e`
  - `--error: #ef4444`
  - `--background: #0a0a0a`
  - `--surface: #161616`
  - `--border: #333333`
- [ ] Create color usage documentation (inline comments or README section):
  - Document semantic usage: Orange = active/running, Green = success/completed, Red = error/failed
- [ ] Test color application: Create test component with all colors, verify accessibility (WCAG AA contrast)
- [ ] Verify color consistency: Check against UX reference mockup (`docs/ux-reference-mockup.html`)

### Task 3: Configure Typography and System Fonts (AC: 3)

- [ ] Configure typography scale in Tailwind config:
  - h1: `2rem` (32px)
  - h2: `1.5rem` (24px)
  - h3: `1.25rem` (20px)
  - body: `1rem` (16px)
  - small: `0.875rem` (14px)
- [ ] Configure system fonts in Tailwind config:
  - Font family: `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`
  - Monospace: `'Courier New', monospace` (for code, IDs, URLs)
- [ ] Add typography classes to global CSS if needed (for custom heading styles)
- [ ] Test typography rendering: Create test page with all heading levels, verify font rendering
- [ ] Verify font fallbacks: Test on different operating systems (macOS, Windows, Linux)

### Task 4: Create TestCard Component for Card Gallery (AC: 4)

- [ ] Create `src/components/TestCard.tsx` component:
  - Props interface: `testId`, `url`, `status`, `phase?`, `score?`, `duration?`, `screenshotCount?`, `timestamps`
  - Visual status indicator (animated pulse for running tests using CSS animation)
  - Game URL display (truncate with tooltip on hover)
  - Status badge using shadcn/ui Badge component with Agent Orange colors
  - Duration/elapsed time display (relative time formatting)
  - Quality score display (if completed) with color coding (green >70, yellow 50-70, red <50)
  - Click handler to navigate to Agent Focus Mode
- [ ] Add CSS styles for TestCard:
  - Card layout with hover effects
  - Status indicator animation (pulsing dot for running tests)
  - Responsive grid layout support
- [ ] Integrate TestCard into Dashboard Worker HTML:
  - Replace existing test card HTML from Story 3.2 with TestCard component (if using React) OR
  - Update HTML template to use TestCard styling patterns
- [ ] Test TestCard component:
  - Test with running test (pulsing indicator)
  - Test with completed test (score display)
  - Test with failed test (error styling)
  - Test URL truncation and tooltip
  - Test click navigation to Agent Focus Mode

### Task 5: Implement Card Gallery View Layout (AC: 4)

- [ ] Create Card Gallery layout structure:
  - Grid container: `grid-cols-3` (desktop), `md:grid-cols-2` (tablet), `sm:grid-cols-1` (mobile)
  - Responsive breakpoints: desktop (>1024px), tablet (640-1024px), mobile (<640px)
- [ ] Implement Quick Submit input component:
  - Always visible at top of page (low friction)
  - URL input field with validation
  - Submit button triggers existing `submitTest()` RPC method from Story 3.1
  - Auto-open Agent Focus Mode on successful submission (see Task 7)
- [ ] Implement empty state:
  - Message: "No tests yet. Submit a game URL to get started!"
  - Prominent CTA button (optional)
- [ ] Update Dashboard Worker to render Card Gallery:
  - Replace existing test list HTML with Card Gallery grid
  - Integrate TestCard components (or styled HTML equivalent)
  - Maintain existing RPC method calls (`listTests()`, `submitTest()`)
- [ ] Test Card Gallery layout:
  - Test responsive grid (3/2/1 columns)
  - Test empty state display
  - Test Quick Submit input functionality
  - Test card click navigation

### Task 6: Create Agent Focus Mode Components (AC: 5)

- [ ] Create `src/components/AgentStatusHeader.tsx` component:
  - Large status summary text ("Agent is discovering controls...")
  - Metrics grid: 4 columns (Progress, Duration, Screenshots, Confidence)
  - Live pulsing indicator when test is active (CSS animation)
  - Gradient background (Agent Orange theme)
  - Back button (returns to Card Gallery)
- [ ] Create `src/components/LiveFeedTimeline.tsx` component:
  - Timestamp + brief status updates (Gemini-style concise, not full logs)
  - Auto-scroll to latest message
  - Color-coded event types (phase transitions, actions, completion)
  - Uses existing WebSocket updates from Story 3.3
- [ ] Create `src/components/ScreenshotGallery.tsx` component:
  - Grid layout with captions (phase and description)
  - Click to open lightbox (fullscreen modal)
  - Keyboard navigation (arrow keys, ESC to close)
  - Load screenshots as agent captures them (real-time updates)
  - Reuse lightbox implementation from Story 3.4
- [ ] Create final report display component:
  - Large quality score with color coding
  - Individual metric scores with progress bars
  - AI justifications text
  - Export JSON button (reuse from Story 3.4)
- [ ] Test Agent Focus Mode components:
  - Test AgentStatusHeader renders correctly with metrics
  - Test LiveFeedTimeline receives WebSocket updates and displays them
  - Test ScreenshotGallery displays screenshots and opens lightbox
  - Test final report display when test completes

### Task 7: Implement Agent Focus Mode Layout and Navigation (AC: 5, 7)

- [ ] Create Agent Focus Mode layout:
  - Full-screen layout (desktop: split view 50/50, mobile: stacked)
  - Left panel: Live Feed Timeline
  - Right panel: Screenshot Gallery
  - Agent Status Header at top
- [ ] Implement URL routing:
  - Route `/` renders Card Gallery
  - Route `/test/:id` renders Agent Focus Mode for specific test
  - Back button navigates to `/` (Card Gallery)
- [ ] Implement auto-open Agent Focus Mode:
  - On successful test submission (Task 5), navigate to `/test/{testId}`
  - Maintain existing test submission flow from Story 3.1
- [ ] Implement scroll position persistence:
  - Save scroll position when leaving Card Gallery
  - Restore scroll position when returning to Card Gallery
  - Use sessionStorage or state management
- [ ] Test navigation flow:
  - Test submit test → auto-open Agent Focus Mode
  - Test click card → navigate to Agent Focus Mode
  - Test back button → return to Card Gallery
  - Test scroll position restoration

### Task 8: Install and Configure shadcn/ui Components (AC: 6)

- [ ] Install required shadcn/ui components:
  - Button: `npx shadcn-ui@latest add button`
  - Card: `npx shadcn-ui@latest add card`
  - Badge: `npx shadcn-ui@latest add badge`
  - Input: `npx shadcn-ui@latest add input`
- [ ] Configure shadcn/ui components with Agent Orange theme:
  - Update component CSS variables to match Agent Orange colors
  - Test Button component with primary/secondary variants
  - Test Badge component with status colors
  - Test Card component styling
  - Test Input component styling
- [ ] Create custom components using shadcn/ui as base:
  - TestCard: Uses Card + Badge components
  - AgentStatusHeader: Uses Card component for metrics
  - QuickSubmitInput: Uses Input + Button components
- [ ] Test shadcn/ui component integration:
  - Verify all components render correctly
  - Verify components match Agent Orange theme
  - Verify accessibility (keyboard navigation, focus indicators)

### Task 9: Implement View Toggle (Card/Table) Infrastructure (AC: 7)

- [ ] Create view toggle component:
  - Two-option toggle (Card icon, Table icon)
  - Uses shadcn/ui Toggle component or custom implementation
  - State: Card active, Table active
- [ ] Implement view preference persistence:
  - Store preference in localStorage
  - Load preference on page load
  - Apply preference to initial view
- [ ] Add view toggle to Dashboard header:
  - Place toggle button in header (top-right)
  - Show current active view
- [ ] Implement Table View placeholder (for future implementation):
  - Create Table View component structure (empty/placeholder)
  - Add routing: `/table` route renders Table View
  - Toggle switches between Card Gallery and Table View
- [ ] Note: Table View full implementation reserved for UX Phase 2 (Epic 5, Story 5.1)
- [ ] Test view toggle:
  - Test toggle switches between Card and Table views
  - Test preference persistence (localStorage)
  - Test preference loads on page refresh

### Task 10: Match UX Reference Mockup Styling (AC: 8)

- [ ] Load and review `docs/ux-reference-mockup.html`:
  - Extract color values and verify against Tailwind config
  - Extract spacing values (padding, margins, gaps)
  - Extract component styling patterns
  - Extract typography styles
- [ ] Update component styles to match mockup:
  - Card Gallery: Grid layout, card styling, spacing
  - Agent Focus Mode: Split view layout, header styling, panel styling
  - Status badges: Colors, sizing, typography
  - Buttons: Colors, hover states, sizing
- [ ] Verify three-view architecture matches specification:
  - Card Gallery (default) matches mockup
  - Agent Focus Mode matches mockup
  - Table View placeholder structure matches mockup (for future)
- [ ] Test visual consistency:
  - Compare implemented dashboard with mockup
  - Verify color accuracy (Agent Orange theme)
  - Verify spacing and typography match
  - Test responsive breakpoints match mockup behavior

### Task 11: Integration Testing and Validation

- [ ] Test complete user flow:
  - Submit test from Card Gallery → Auto-open Agent Focus Mode
  - Watch live updates in Agent Focus Mode (WebSocket)
  - View screenshots as they're captured
  - Test completes → Final report displays
  - Click back → Return to Card Gallery
  - Verify test appears in Card Gallery with updated status
- [ ] Test responsive behavior:
  - Desktop: 3-column Card Gallery, split view Agent Focus Mode
  - Tablet: 2-column Card Gallery, stacked Agent Focus Mode
  - Mobile: 1-column Card Gallery, stacked Agent Focus Mode
- [ ] Test existing functionality still works:
  - Test submission (Story 3.1)
  - Test list updates (Story 3.2)
  - WebSocket real-time updates (Story 3.3)
  - Detailed test report (Story 3.4)
  - Export JSON (Story 3.4)
- [ ] Test accessibility:
  - Keyboard navigation (Tab, Enter, ESC)
  - Focus indicators (2px orange outline)
  - ARIA labels on interactive elements
  - Screen reader compatibility (test with VoiceOver/NVDA)
  - Color contrast (WCAG AA compliance)
- [ ] Test performance:
  - Page load time (< 2 seconds)
  - Smooth animations (60fps)
  - WebSocket connection stability
  - No memory leaks (check browser DevTools)

## Dev Notes

### Relevant Architecture Patterns and Constraints

- **ADR-001**: Monorepo with RPC-Only Architecture - Dashboard Worker maintains RPC-only communication. All UI logic in same Worker, no separate frontend build. shadcn/ui components must work with inline HTML/CSS/JS approach OR Dashboard Worker must be restructured to support React/TypeScript build pipeline.
- **Frontend Architecture Decision**: Current Dashboard Worker serves inline HTML/CSS/JS. Story 3.7 requires decision:
  - **Option A**: Keep inline HTML, apply Tailwind via CDN or build step, use vanilla JS for components
  - **Option B**: Restructure Dashboard Worker to support React/TypeScript build pipeline, use shadcn/ui with React
  - **Recommendation**: Option A for MVP (faster, maintains existing architecture), Option B for future if component complexity grows
- **Design System Integration**: shadcn/ui + Tailwind CSS must integrate with existing Dashboard Worker HTML structure. Consider Tailwind JIT compilation or CDN approach for inline HTML.
- **WebSocket Real-Time Updates**: Agent Focus Mode uses existing WebSocket connection from Story 3.3. Live Feed Timeline component must consume WebSocket messages and update UI in real-time.
- **RPC Service Bindings**: All existing RPC methods (`submitTest()`, `listTests()`, `getTestReport()`, `exportTestJSON()`) remain unchanged. New UI components call same RPC methods.

[Source: docs/architecture/architecture-decision-records-adrs.md, ADR-001]  
[Source: docs/ux-design-specification.md, Section 9: Implementation Guidance]  
[Source: docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md, Story 3.7 Technical Notes]

### Source Tree Components to Touch

- **`src/workers/dashboard.ts`**: Major updates to HTML/CSS/JS structure:
  - Integrate Tailwind CSS (via CDN or build step)
  - Replace existing test card HTML with Card Gallery layout
  - Add Agent Focus Mode HTML structure
  - Update JavaScript for navigation routing (if using client-side routing)
  - Integrate shadcn/ui components (if using React) OR style HTML to match shadcn/ui patterns
- **`tailwind.config.js`**: Create new file with Agent Orange color palette and typography configuration (NEW)
- **`src/components/`**: Create new directory structure (NEW):
  - `ui/`: shadcn/ui components (if using React)
  - `TestCard.tsx`: Custom TestCard component (NEW)
  - `AgentStatusHeader.tsx`: Custom Agent Status Header component (NEW)
  - `LiveFeedTimeline.tsx`: Custom Live Feed Timeline component (NEW)
  - `ScreenshotGallery.tsx`: Custom Screenshot Gallery component (NEW)
  - `QuickSubmitInput.tsx`: Custom Quick Submit Input component (NEW)
- **`src/shared/types.ts`**: May need new types for component props (MODIFIED, if using TypeScript)
- **`package.json`**: Add dependencies: `tailwindcss`, `postcss`, `autoprefixer` (MODIFIED)
- **`docs/ux-reference-mockup.html`**: Reference for styling implementation (REFERENCE)

### Testing Standards Summary

- **Visual Regression Testing**: Compare implemented dashboard with UX reference mockup (`docs/ux-reference-mockup.html`). Verify color accuracy, spacing, typography match exactly.
- **Component Testing**: Test each custom component (TestCard, AgentStatusHeader, LiveFeedTimeline, ScreenshotGallery) in isolation. Verify props, state, and event handlers work correctly.
- **Integration Testing**: Test complete user flows (submit test → watch in Agent Focus Mode → view report → return to gallery). Verify all existing functionality (Stories 3.1-3.6) still works with new UI.
- **Responsive Testing**: Test on desktop (>1024px), tablet (640-1024px), and mobile (<640px). Verify Card Gallery grid adjusts correctly, Agent Focus Mode layout adapts to screen size.
- **Accessibility Testing**: Test keyboard navigation, focus indicators, ARIA labels, screen reader compatibility. Verify WCAG AA color contrast compliance.
- **Performance Testing**: Measure page load time, animation frame rate, WebSocket connection stability. Check for memory leaks in browser DevTools.

[Source: docs/ux-design-specification.md, Section 8: Responsive Design & Accessibility]  
[Source: docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md, Story 3.7 Technical Notes]

### Project Structure Notes

- **Component Structure**: If using React, components in `src/components/` directory. If using vanilla JS, components as JavaScript modules or inline HTML templates.
- **Tailwind Configuration**: Tailwind config file in project root (`tailwind.config.js` or `tailwind.config.ts`). CSS file location depends on build approach (inline HTML vs. separate CSS file).
- **shadcn/ui Integration**: If using React, shadcn/ui components in `src/components/ui/`. If using vanilla JS, style HTML to match shadcn/ui patterns (copy CSS classes and structure).
- **Asset Organization**: Screenshot lightbox, status indicators, animations may require additional CSS or JavaScript files. Organize in `src/components/` or `src/shared/` directories.

[Source: docs/architecture/project-structure.md]  
[Source: docs/ux-design-specification.md, Section 9.3: Technical Notes for Developers]

### Learnings from Previous Story

**From Story 3.4 (Detailed Test Report View) (Status: done)**

- **Detailed Report Implementation**: Story 3.4 implemented detailed test report with screenshot gallery, lightbox, and export functionality. Story 3.7 should reuse these components (ScreenshotGallery, lightbox) in Agent Focus Mode rather than recreating them.
- **RPC Method Patterns**: Story 3.4 established `getTestReport()` and `exportTestJSON()` RPC methods. Story 3.7 should use these existing methods in Agent Focus Mode final report display.
- **Screenshot Lightbox**: Story 3.4 implemented full-featured lightbox with keyboard navigation (arrow keys, ESC). Story 3.7 should reuse this lightbox implementation in ScreenshotGallery component.
- **Frontend JavaScript Patterns**: Story 3.4 established frontend JavaScript patterns for test report loading and rendering. Story 3.7 should follow similar patterns for Agent Focus Mode components.
- **Type Definitions**: Story 3.4 added `TestReport` and supporting interfaces to `src/shared/types.ts`. Story 3.7 should reuse these types for Agent Focus Mode components.
- **Error Handling**: Story 3.4 implemented error handling for test report fetch failures. Story 3.7 should implement similar error handling for Agent Focus Mode data loading.

**From Story 3.6 (Production Deployment and Documentation) (Status: ready-for-dev)**

- **Deployment Considerations**: Story 3.6 deployed Dashboard Worker to production. Story 3.7 must ensure new UI components and Tailwind CSS work correctly in production environment (build process, asset bundling).
- **Documentation**: Story 3.6 created README.md and USAGE.md. Story 3.7 should update documentation with new UI features and component descriptions.

[Source: docs/stories/3-4-detailed-test-report-view.md#Dev-Agent-Record]  
[Source: docs/stories/3-6-production-deployment-and-documentation.md#Dev-Agent-Record]

### References

- **shadcn/ui Documentation**: https://ui.shadcn.com/
- **Tailwind CSS Documentation**: https://tailwindcss.com/docs
- **UX Design Specification**: `docs/ux-design-specification.md` - Complete design system, component library, and user journey flows
- **UX Reference Mockup**: `docs/ux-reference-mockup.html` - Interactive mockup showing all three views with Agent Orange theme (use as implementation reference)
- **Cloudflare Workers Documentation**: https://developers.cloudflare.com/workers/
- [Source: docs/architecture/architecture-decision-records-adrs.md, ADR-001]  
[Source: docs/ux-design-specification.md]  
[Source: docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md, Story 3.7 Technical Notes]

## Dev Agent Record

### Context Reference

- `docs/stories/3-7-ux-phase-1-three-view-architecture-agent-orange.context.xml`

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2025-01-27: Story drafted (Adam)

