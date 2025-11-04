# GameEval QA Pipeline

Autonomous game testing pipeline built on Cloudflare Workers platform.

## Quick Start

```bash
# Install dependencies
npm install

# Generate TypeScript types
npm run types

# Start development server
npm run dev

# Deploy to Cloudflare
npm run deploy
```

## Setup Requirements

### 1. Cloudflare Account Configuration

The project is configured to use account: `a20259cba74e506296745f9c67c1f3bc`

To change the account, update `account_id` in `wrangler.toml`.

### 2. Cloudflare Resources

All resources have been created and are ready to use:

- **D1 Database**: `gameeval-db` (ID: `59b4298a-451e-4d40-ba24-82861f7f8721`)
- **R2 Bucket**: `gameeval-evidence` ✅ Created
- **Workflows**: `game-test-pipeline` (GameTestPipeline class) - skeleton for test orchestration

## Project Structure

```
src/
├── index.ts              # Dashboard Worker entry point
├── agents/
│   └── TestAgent.ts      # Durable Object (skeleton)
├── workers/              # Future Worker implementations
├── workflows/
│   └── GameTestPipeline.ts # Workflow orchestration (skeleton)
└── shared/
    ├── types.ts          # Custom TypeScript types
    ├── constants.ts      # Application constants
    └── helpers/          # Helper functions (D1, R2, AI Gateway)
```

## Service Bindings

All Cloudflare services are configured via RPC bindings in `wrangler.toml`:

- **AI Gateway** (`AI`) - AI request routing
- **D1 Database** (`DB`) - Test metadata storage
- **R2 Bucket** (`EVIDENCE_BUCKET`) - Screenshots and logs
- **Browser Rendering** (`BROWSER`) - Serverless browser sessions
- **Durable Objects** (`TEST_AGENT`) - TestAgent instances

## TypeScript Types

Types are auto-generated from `wrangler.toml` configuration:

```bash
npm run types
```

This creates `worker-configuration.d.ts` with all binding types.

## Development

```bash
# Type checking
npm run lint

# Local development
npm run dev
# Access at: http://localhost:8787
```

## Testing

The root endpoint returns:
- **GET /**: `GameEval QA Pipeline - Ready` (200)
- **All other routes**: `Not Found` (404)

## Modern Best Practices

This project follows the latest Cloudflare Workers best practices:

- **ESNext Modules**: Using latest JavaScript features
- **ctx.exports Pattern**: Modern service binding access pattern
- **Generated Types**: Using `wrangler types` instead of deprecated `@cloudflare/workers-types`
- **Native AI Binding**: Using native AI binding instead of deprecated `@cloudflare/ai` package
- **Node.js Compatibility**: Enabled via `nodejs_compat` flag

## Documentation

See `/docs` for comprehensive project documentation:
- Architecture decisions
- Epic and story definitions
- Implementation patterns
- PRD and technical specifications

## License

Private project - All rights reserved

