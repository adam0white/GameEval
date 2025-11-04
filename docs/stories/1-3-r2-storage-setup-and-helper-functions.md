# Story 1.3: R2 Storage Setup and Helper Functions

**Story ID:** 1.3  
**Epic:** Epic 1 - Core Test Infrastructure  
**Status:** ready-for-dev  
**Created:** 2025-11-04  

---

## User Story

**As a** developer,  
**I want** R2 bucket configured with helper functions for evidence storage,  
**So that** I can store screenshots and logs with proper organization.

---

## Business Context

Story 1.3 establishes the R2 object storage infrastructure for test artifacts (screenshots and logs). This builds on the project foundation from Story 1.1 and complements the D1 database from Story 1.2.

R2 storage is essential for the AI Test Agent (Epic 2) to capture visual evidence during the 4-phase test pipeline and for the Dashboard (Epic 3) to display screenshots and logs to users. The storage structure organizes artifacts by test run ID, making retrieval efficient and predictable.

**Value:** Enables evidence capture and retrieval for test reports, unblocking TestAgent implementation and dashboard artifact viewing.

[Source: docs/epics/epic-1-core-test-infrastructure.md, Story 1.3]  
[Source: docs/architecture/data-architecture.md, R2 Storage Structure section]

---

## Acceptance Criteria

1. **R2 bucket created and bound to Workers** - Bucket name: `gameeval-evidence` (configured in wrangler.toml)
2. **Storage path structure for screenshots**: `tests/{test_id}/screenshots/{timestamp}-{phase}-{action}.png`
3. **Storage path structure for logs**: `tests/{test_id}/logs/{log_type}.log` where log_type is `console`, `network`, or `agent-decisions`
4. **Helper function implemented**: `uploadScreenshot(r2: R2Bucket, testId: string, phase: string, action: string, buffer: ArrayBuffer)` returns R2 object key
5. **Helper function implemented**: `uploadLog(r2: R2Bucket, testId: string, logType: string, content: string)` appends to log file
6. **Helper function implemented**: `getTestArtifacts(r2: R2Bucket, testId: string)` returns list of all artifacts with URLs
7. **Proper Content-Type headers set**: `image/png` for screenshots, `text/plain` for logs
8. **R2 objects have public read access** for dashboard viewing (configured via public URL or CORS)

[Source: docs/epics/epic-1-core-test-infrastructure.md, Story 1.3 Acceptance Criteria]  
[Source: docs/architecture/data-architecture.md, R2 Storage Structure]

---

## Tasks and Subtasks

### Task 1: Create R2 Bucket and Configure Binding (AC: 1, 8)
- [x] Create R2 bucket via Cloudflare dashboard or CLI: `wrangler r2 bucket create gameeval-evidence`
- [x] Add R2 binding to `wrangler.toml`:
  ```toml
  [[r2_buckets]]
  binding = "EVIDENCE_BUCKET"
  bucket_name = "gameeval-evidence"
  ```
- [x] Research R2 public access configuration (public URL vs CORS)
- [x] Configure public read access for dashboard viewing (if using public URLs)
- [x] Document bucket ID and access configuration in SETUP.md
- [x] Test binding locally: `wrangler dev` and access `env.EVIDENCE_BUCKET`

### Task 2: Define Storage Path Patterns and Types (AC: 2, 3)
- [x] Update `src/shared/constants.ts` with storage path templates:
  - `SCREENSHOT_PATH_TEMPLATE = "tests/{test_id}/screenshots/{timestamp}-{phase}-{action}.png"`
  - `LOG_PATH_TEMPLATE = "tests/{test_id}/logs/{log_type}.log"`
  - `LogType` enum: 'console' | 'network' | 'agent-decisions'
  - `Phase` enum: 'phase1' | 'phase2' | 'phase3' | 'phase4' (reuse from Story 1.2 if defined)
- [x] Update `src/shared/types.ts` with R2 artifact types:
  - `TestArtifact` interface: { key: string, type: 'screenshot' | 'log', url: string, uploaded_at: number }
  - `ScreenshotMetadata` interface: { phase: string, action: string, timestamp: number }
- [x] Export all types and constants

### Task 3: Implement R2 Helper Functions (AC: 4, 5, 6, 7)
- [x] Create file `src/shared/helpers/r2.ts`
- [x] Implement `uploadScreenshot(r2: R2Bucket, testId: string, phase: string, action: string, buffer: ArrayBuffer)`:
  - Generate R2 key using storage path template with current timestamp
  - Set `httpMetadata: { contentType: 'image/png' }`
  - Upload buffer using `r2.put(key, buffer, { httpMetadata })`
  - Return DbResult<string> with R2 key on success
- [x] Implement `uploadLog(r2: R2Bucket, testId: string, logType: string, content: string)`:
  - Generate R2 key for log file (no timestamp in path)
  - Check if log file exists using `r2.head(key)`
  - If exists, fetch existing content, append new content with newline
  - If not exists, create new log file with content
  - Set `httpMetadata: { contentType: 'text/plain' }`
  - Upload using `r2.put(key, logContent, { httpMetadata })`
  - Return DbResult<string> with R2 key on success
- [x] Implement `getTestArtifacts(r2: R2Bucket, testId: string)`:
  - List all objects under `tests/{testId}/` prefix using `r2.list({ prefix })`
  - Parse keys to extract metadata (screenshot timestamp/phase/action or log type)
  - Generate public URLs for each artifact (use R2 public URL or pre-signed URL)
  - Return DbResult<TestArtifact[]> with sorted list (screenshots by timestamp, logs alphabetically)
- [x] Add proper TypeScript types for all function parameters and return values
- [x] Reuse `DbResult<T>` pattern from Story 1.2 for consistent error handling
- [x] Handle R2 errors gracefully (wrap in try/catch, return meaningful errors)
- [x] Add JSDoc comments to all helper functions

### Task 4: Implement URL Generation for Public Access (AC: 8)
- [x] Research R2 public URL configuration options:
  - Option A: R2.dev subdomain (public URLs enabled on bucket)
  - Option B: Custom domain with CORS
  - Option C: Pre-signed URLs (temporary access)
- [x] Choose approach based on MVP requirements (recommend R2.dev for simplicity)
- [x] Implement `getPublicUrl(bucketName: string, key: string)` helper
- [x] Test URL generation and verify images/logs accessible from browser
- [x] Document URL generation strategy in code comments

### Task 5: Path Generation Utility Functions
- [x] Implement `generateScreenshotPath(testId: string, phase: string, action: string, timestamp?: number)`:
  - Use SCREENSHOT_PATH_TEMPLATE from constants
  - Default timestamp to `Date.now()` if not provided
  - Return complete R2 key path
- [x] Implement `generateLogPath(testId: string, logType: string)`:
  - Use LOG_PATH_TEMPLATE from constants
  - Return complete R2 key path
- [x] Add unit test examples (or test manually in Worker)

### Task 6: Integration Testing (AC: 4, 5, 6, 7)
- [x] Create test endpoint in `src/index.ts` (e.g., GET `/test-r2`) - temporary for testing
- [x] Test uploadScreenshot() - upload a PNG buffer (use sample image or programmatically generated PNG)
- [x] Test uploadLog() - append multiple log entries, verify file appending works
- [x] Test getTestArtifacts() - retrieve all artifacts for a test, verify URLs are accessible
- [x] Verify Content-Type headers in R2 dashboard or via HTTP HEAD request
- [x] Test public URL access - open screenshot URLs in browser, verify images load
- [x] Test log file access - open log URLs in browser, verify text content displays
- [x] Test error handling (invalid testId, R2 upload failures, missing bucket binding)

### Task 7: Local and Remote Deployment
- [x] Test locally with `wrangler dev` using local R2 bucket
- [x] Verify bucket binding works: `env.EVIDENCE_BUCKET.put(...)`
- [x] Deploy to production: `wrangler deploy`
- [x] Test remote R2 bucket in production environment
- [x] Verify remote public URLs work for dashboard access

### Task 8: Documentation and Cleanup
- [x] Document R2 bucket setup in SETUP.md (bucket creation, binding, public access)
- [x] Add JSDoc comments with usage examples for all helper functions
- [x] Remove any temporary test endpoints from `src/index.ts`
- [x] Run `tsc --noEmit` to verify no type errors
- [x] Run `wrangler dev` to verify local environment still works

[Source: docs/epics/epic-1-core-test-infrastructure.md, Story 1.3]  
[Source: docs/architecture/data-architecture.md, R2 Storage Structure]

---

## Dev Notes

### Architecture Alignment

This story implements the **evidence storage layer** for the GameEval QA Pipeline:
- **R2 Object Storage**: Blob storage for screenshots and logs
- **Organized Path Structure**: Predictable paths enable efficient retrieval
- **Helper Functions**: Abstraction layer for R2 operations (matching D1 pattern from Story 1.2)
- **TypeScript Types**: Strict typing for all R2 operations

The storage structure supports the 4-phase test pipeline:
- **Screenshots per Phase**: Captures visual evidence at each stage
- **Log Separation**: Console, network, and agent decision logs stored separately
- **Test-Scoped Organization**: All artifacts grouped by test run ID

[Source: docs/architecture/data-architecture.md, R2 Storage Structure]

### R2 Storage Details

**Bucket Configuration:**
- Bucket Name: `gameeval-evidence`
- Binding Name: `EVIDENCE_BUCKET` (accessible via `env.EVIDENCE_BUCKET` in Workers)
- Access: Public read for dashboard viewing
- Retention: No lifecycle policy initially (30-day retention post-MVP)

**R2 Object Storage Benefits:**
- Zero egress fees (free bandwidth for downloads)
- S3-compatible API (familiar patterns)
- Global edge storage (fast access worldwide)
- No per-operation charges (only storage costs)

[Source: docs/architecture/technology-stack-details.md, Data Persistence section]

### Storage Path Patterns

**Screenshot Naming Convention:**
```
tests/{test_id}/screenshots/{timestamp}-{phase}-{action}.png
```
Example: `tests/550e8400-e29b-41d4-a716-446655440000/screenshots/1699104850000-phase3-click-play-button.png`

**Log File Naming Convention:**
```
tests/{test_id}/logs/{log_type}.log
```
Examples:
- `tests/550e8400-e29b-41d4-a716-446655440000/logs/console.log`
- `tests/550e8400-e29b-41d4-a716-446655440000/logs/network.log`
- `tests/550e8400-e29b-41d4-a716-446655440000/logs/agent-decisions.log`

**Timestamp Convention:**
- All timestamps use Unix epoch in milliseconds (matches D1 schema from Story 1.2)
- Use `Date.now()` in JavaScript/TypeScript
- Ensures chronological sorting in R2 listings

[Source: docs/architecture/data-architecture.md, R2 Storage Structure]

### R2 API Patterns

**Upload Operations:**
```typescript
// Pattern: Use R2Bucket.put() with httpMetadata
await r2.put(key, data, {
  httpMetadata: {
    contentType: 'image/png', // or 'text/plain',
  }
});
```

**List Operations:**
```typescript
// Pattern: Use R2Bucket.list() with prefix for test-scoped queries
const objects = await r2.list({ prefix: `tests/${testId}/` });
```

**Conditional Upload (Append Logs):**
```typescript
// Pattern: Check existence with head(), fetch existing, then put()
const existing = await r2.head(key);
if (existing) {
  const currentLog = await r2.get(key);
  const currentText = await currentLog?.text() || "";
  const newContent = currentText + "\n" + newLogEntry;
  await r2.put(key, newContent, { httpMetadata });
}
```

**Error Handling:**
- Reuse `DbResult<T>` pattern from Story 1.2 for consistency
- Wrap all R2 operations in try/catch
- Return meaningful error messages (not raw R2 errors)

[Source: Cloudflare R2 Documentation]

### Public Access Configuration

**Options for Dashboard Viewing:**

1. **R2.dev Public URL (Recommended for MVP):**
   - Enable public access on bucket via Cloudflare dashboard
   - Auto-generated URLs: `https://<bucket-id>.r2.dev/<key>`
   - No custom domain required
   - Simplest setup for MVP

2. **Custom Domain + CORS:**
   - Configure custom domain (e.g., `evidence.gameeval.com`)
   - Set CORS headers for dashboard access
   - More professional but requires DNS setup

3. **Pre-signed URLs:**
   - Generate temporary URLs with expiration
   - More secure but adds complexity
   - Consider for post-MVP

**MVP Recommendation:** Use R2.dev public URLs for simplicity.

[Source: Cloudflare R2 Documentation - Public Buckets]

### Helper Functions Design

**Consistency with Story 1.2:**
- Use same `DbResult<T>` type for error handling
- Follow same naming convention: specific function names (not generic CRUD)
- Add JSDoc comments with usage examples
- TypeScript strict mode with full type annotations

**Log Append Strategy:**
- Each log file is a single R2 object (not multiple objects)
- Append operations require fetch-modify-put pattern
- For MVP, this approach is acceptable (low write frequency)
- Post-MVP: Consider append-only log streaming (KV or D1)

[Source: docs/architecture/data-architecture.md]

### Testing Strategy

**Local Testing:**
1. Create local R2 bucket with `wrangler dev --local`
2. Test helper functions via temporary test endpoint
3. Verify Content-Type headers using R2 dashboard or HTTP HEAD
4. Test public URL access (may require `--remote` for public URLs)

**Integration Testing:**
- Create temporary test endpoint in `src/index.ts` (e.g., GET `/test-r2`)
- Upload sample screenshot (PNG buffer)
- Append multiple log entries to same log file
- Retrieve artifacts and verify URLs are accessible
- Remove test endpoint before marking story complete

**Remote Deployment:**
- Deploy to production: `wrangler deploy`
- Test with live R2 bucket
- Verify public URLs work from external browser
- Test screenshot and log access from dashboard (in future Epic 3)

[Source: docs/architecture/project-structure.md]

### Project Structure Notes

**File Locations:**
- Helper functions: `/src/shared/helpers/r2.ts` (new file)
- Types: `/src/shared/types.ts` (add R2 artifact interfaces)
- Constants: `/src/shared/constants.ts` (add storage path templates and LogType enum)

**No Naming Conflicts:**
- R2 helper functions use specific naming: `uploadScreenshot`, `uploadLog`, `getTestArtifacts`
- Avoid conflicts with D1 helpers (Story 1.2) and AI Gateway helpers (Story 1.5)

**Dependencies:**
- No external packages required (R2 client built into Workers runtime)
- Use auto-generated types from `worker-configuration.d.ts` for `R2Bucket` type

[Source: docs/architecture/project-structure.md]

### Learnings from Previous Story

**From Story 1-2-d1-database-schema-and-migrations (Status: done)**

- **New Patterns Established**: `DbResult<T>` generic type for consistent error handling - REUSE this pattern for R2 helpers
- **Architectural Standards**: Modern Cloudflare Workers patterns using `wrangler types` for auto-generated type definitions - apply to R2Bucket type
- **TypeScript Configuration**: Strict mode enabled, all operations must be typed - apply to R2 helper functions
- **Files Created**: `src/shared/helpers/d1.ts` (D1 helpers), `src/shared/types.ts` (database types), `src/shared/constants.ts` (enums) - add R2 helpers to this same structure
- **Testing Pattern**: Test locally with `wrangler dev`, verify TypeScript compilation with `tsc --noEmit`, then deploy to remote
- **Documentation Standard**: JSDoc comments on all helper functions, SETUP.md updated with configuration steps

**Reuse Existing Infrastructure:**
- DO NOT recreate shared folders (already exist)
- Extend `src/shared/types.ts` with R2 artifact types
- Extend `src/shared/constants.ts` with storage path templates
- Follow same code style and patterns from D1 helpers

**Apply Same Quality Standards:**
- All functions must use `DbResult<T>` for error handling
- All functions must have JSDoc comments with usage examples
- All functions fully typed with strict mode enabled (zero type errors)
- Test endpoints removed before marking story complete

**Key Interfaces to Reuse:**
- `DbResult<T>` type from `src/shared/types.ts` (already defined in Story 1.2)
- `Phase` enum from `src/shared/constants.ts` (if defined in Story 1.2, otherwise define now)

[Source: stories/1-2-d1-database-schema-and-migrations.md#Dev-Agent-Record]

### References

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 API Reference](https://developers.cloudflare.com/r2/api/)
- [R2 Public Buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [Source: docs/architecture/data-architecture.md - R2 Storage Structure]
- [Source: docs/epics/epic-1-core-test-infrastructure.md - Story 1.3 requirements]
- [Source: docs/stories/1-2-d1-database-schema-and-migrations.md - Helper function patterns]

---

## Definition of Done

- [x] All acceptance criteria met
- [x] R2 bucket created and bound to Workers
- [x] All 3 helper functions implemented and tested
- [x] TypeScript types and constants defined
- [x] Storage path patterns documented
- [x] Public access configured for dashboard viewing
- [x] Integration testing complete with all operations verified
- [x] `tsc --noEmit` shows no type errors
- [x] `wrangler dev` runs without errors
- [x] Documentation updated (R2 setup documented in SETUP.md)
- [x] Temporary test endpoints removed
- [x] Story marked as `drafted` → `ready-for-dev` → `in-progress` → `review` in sprint-status.yaml

---

## Related Documentation

- **Epic Context:** docs/epic-1-context.md (if exists)
- **Epic Details:** docs/epics/epic-1-core-test-infrastructure.md
- **Architecture:** docs/architecture/data-architecture.md
- **Project Structure:** docs/architecture/project-structure.md
- **Previous Story:** docs/stories/1-2-d1-database-schema-and-migrations.md

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-11-04 | Story drafted | Bob (SM) |
| 2025-11-04 | R2 storage helpers implemented, tested, and deployed | Amelia (Dev) |

---

## Dev Agent Record

### Context Reference

- docs/stories/1-3-r2-storage-setup-and-helper-functions.context.xml

### Agent Model Used

Claude Sonnet 4.5 (2025-11-04)

### Debug Log References

**Implementation Plan:**
1. Define TypeScript types and constants for R2 storage paths and artifact types
2. Implement three core R2 helper functions using modern TypeScript patterns
3. Add path generation utilities for screenshots and logs
4. Implement public URL generation using R2.dev subdomain approach
5. Create temporary test endpoint to verify all operations
6. Test locally and remotely, then remove test endpoint

**Modern Patterns Applied:**
- Used `const` objects with `as const` for storage paths and configuration (immutable config pattern)
- Applied strict TypeScript typing with no implicit `any` types
- Reused `DbResult<T>` pattern from Story 1.2 for consistent error handling
- Implemented comprehensive JSDoc comments with usage examples
- Used modern error handling with proper error message extraction
- Applied nullish coalescing operator (`??`) for default timestamp parameter

### Completion Notes List

✅ **R2 Helper Functions Implemented (AC 4, 5, 6)**
- `uploadScreenshot()` - Uploads PNG images with proper Content-Type and timestamp-based paths
- `uploadLog()` - Creates or appends to log files using fetch-modify-put pattern
- `getTestArtifacts()` - Lists and retrieves all artifacts with public URLs, sorted appropriately

✅ **TypeScript Types & Constants (AC 2, 3)**
- Added `STORAGE_PATHS` constant object with screenshot and log path templates
- Defined `LogType` enum for console, network, and agent-decisions logs
- Created `TestArtifact` interface for artifact metadata with public URLs
- Created `ScreenshotMetadata` interface for parsed screenshot metadata
- Reused existing `Phase` enum from Story 1.2

✅ **Path Generation Utilities (Task 5)**
- `generateScreenshotPath()` - Template-based path generation with optional timestamp
- `generateLogPath()` - Template-based log path generation
- `getPublicUrl()` - R2.dev public URL generation with configurable base URL

✅ **Testing & Validation (AC 7, Tasks 6-7)**
- Created temporary `/test-r2` endpoint for comprehensive testing
- Tested screenshot upload with 1x1 PNG buffer
- Verified log appending functionality (multiple writes to same file)
- Tested artifact retrieval with proper sorting (screenshots DESC, logs alphabetical)
- Confirmed Content-Type headers: `image/png` for screenshots, `text/plain; charset=utf-8` for logs
- Tested locally with `wrangler dev` - all operations successful
- Deployed to production and tested remote R2 bucket - all operations successful
- Removed test endpoint after validation

✅ **Documentation (AC 8, Task 8)**
- Updated SETUP.md with comprehensive R2 configuration section
- Documented storage structure, public access configuration, and best practices
- Added JSDoc comments to all helper functions with usage examples
- Documented URL generation strategy in code comments

✅ **Quality Assurance**
- Zero TypeScript errors (`tsc --noEmit` clean)
- All functions use strict typing with no implicit `any`
- Error handling follows established patterns from Story 1.2
- Code deployed successfully to production

**Technical Decisions:**
1. **R2.dev Public URLs**: Chose R2.dev subdomain approach for MVP simplicity over custom domain or pre-signed URLs
2. **Log Append Pattern**: Used fetch-modify-put pattern for log appending (acceptable for MVP with low write frequency)
3. **Artifact Sorting**: Screenshots sorted by timestamp DESC (most recent first), logs sorted alphabetically
4. **Content-Type**: Added charset=utf-8 to text/plain for proper encoding

### File List

**Modified:**
- `src/shared/constants.ts` - Added STORAGE_PATHS, LogType enum, R2_CONFIG
- `src/shared/types.ts` - Added TestArtifact, ScreenshotMetadata interfaces
- `src/shared/helpers/r2.ts` - Replaced placeholder with complete R2 helper implementation (315 lines)
- `SETUP.md` - Added comprehensive R2 Storage Configuration section
- `docs/sprint-status.yaml` - Updated story status: ready-for-dev → in-progress → review

**Created:**
- None (all files updated from Story 1.1 placeholders)

