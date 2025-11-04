# Development Environment

## Prerequisites

- **Node.js**: 25.x or later
- **npm**: 11.x or later
- **Wrangler CLI**: 4.x or later
- **Cloudflare Account**: With Workers, D1, R2, Browser Rendering, AI Gateway enabled
- **Git**: For version control

## Setup Commands

**1. Initialize project:**
```bash
npm create cloudflare@latest gameeval-qa-pipeline
cd gameeval-qa-pipeline
npm install --save-dev @cloudflare/workers-types typescript
npm install stagehand
```

**2. Generate TypeScript types:**
```bash
npx wrangler types
```

**3. Configure wrangler.toml:**
```bash
# Edit wrangler.toml
# Add service bindings, D1, R2, Browser Rendering, AI Gateway configuration
```

**4. Create D1 database:**
```bash
npx wrangler d1 create gameeval-db
npx wrangler d1 execute gameeval-db --file=migrations/0001_create_test_runs.sql
npx wrangler d1 execute gameeval-db --file=migrations/0002_create_evaluation_scores.sql
npx wrangler d1 execute gameeval-db --file=migrations/0003_create_test_events.sql
```

**5. Create R2 bucket:**
```bash
npx wrangler r2 bucket create gameeval-evidence
```

**6. Set secrets:**
Manually set in the AI Gateway configuration as needed.

**7. Local development:**
```bash
npx wrangler dev
# Dashboard accessible at http://localhost:8787
```

**8. Deploy to staging:**
```bash
npx wrangler deploy --env staging
```

**9. Deploy to production:**
```bash
npx wrangler deploy --env production
```
