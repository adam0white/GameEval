# Project Initialization

**Create project using Cloudflare CLI:**

```bash
npm create cloudflare@latest gameeval-qa-pipeline
# Select: "Hello World" Worker
# Select: TypeScript
# Select: Yes to Git

cd gameeval-qa-pipeline
npm install --save-dev @cloudflare/workers-types
npm install stagehand
```

**Generate TypeScript definitions:**

```bash
npx wrangler types
```

**Configure Wrangler (`wrangler.toml`):**

```toml
name = "gameeval-qa-pipeline"
main = "src/index.ts"
compatibility_date = "2024-11-04"
compatibility_flags = [ "nodejs_compat", "enable_ctx_exports" ]
workers_dev = true

[observability]
enabled = true
head_sampling_rate = 1

# Service bindings configured during development
```

This establishes the base monorepo with TypeScript, Cloudflare Workers, and observability enabled.
