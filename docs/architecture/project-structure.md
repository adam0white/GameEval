# Project Structure

```
gameeval-qa-pipeline/
├── src/
│   ├── index.ts                    # Dashboard Worker entry point
│   ├── workers/
│   │   └── dashboard.ts            # Dashboard Worker (frontend + backend)
│   ├── workflows/
│   │   └── gameTestPipeline.ts     # 4-phase test orchestration workflow
│   ├── agents/
│   │   └── TestAgent.ts            # TestAgent Durable Object
│   ├── shared/
│   │   ├── types.ts                # Shared TypeScript types
│   │   ├── constants.ts            # Error messages, timeouts, config
│   │   ├── helpers/
│   │   │   ├── r2.ts               # R2 upload/retrieval helpers
│   │   │   ├── d1.ts               # D1 query helpers
│   │   │   └── ai-gateway.ts       # AI Gateway request wrapper
│   │   └── schemas/
│   │       ├── input-schema.ts     # Input schema validation
│   │       └── test-events.ts      # Test event types
│   └── static/
│       └── dashboard.html          # Inline HTML/CSS/JS for dashboard
├── migrations/
│   ├── 0001_create_test_runs.sql
│   ├── 0002_create_evaluation_scores.sql
│   └── 0003_create_test_events.sql
├── wrangler.toml                   # Cloudflare configuration
├── tsconfig.json                   # TypeScript configuration
├── package.json
└── README.md
```
