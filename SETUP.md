# Setup Instructions

## Prerequisites

- Node.js 18+ installed
- Cloudflare account with R2 enabled
- Wrangler CLI (installed via npm)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate TypeScript Types

```bash
npm run types
```

This generates `worker-configuration.d.ts` with all Cloudflare binding types.

### 3. Verify R2 Storage

R2 is already enabled and the bucket has been created:

```bash
# List R2 buckets to verify
npx wrangler r2 bucket list
# You should see: gameeval-evidence
```

### 4. Verify Resources

Check that all resources are created:

```bash
# List D1 databases
npx wrangler d1 list

# List R2 buckets (after enabling R2)
npx wrangler r2 bucket list
```

### 5. Test Locally

```bash
npm run dev
```

Visit `http://localhost:8787` - you should see:
```
GameEval QA Pipeline - Ready
```

### 6. Deploy to Cloudflare

```bash
npm run deploy
```

## Troubleshooting

### R2 Not Enabled Error

If you see:
```
Please enable R2 through the Cloudflare Dashboard
```

Follow step 3 above to enable R2 in the dashboard.

### Account ID Issues

If you need to change the Cloudflare account, update `account_id` in `wrangler.toml`:

```toml
account_id = "your-account-id-here"
```

### Type Errors

If you see TypeScript errors about missing types:

```bash
npm run types
npm run lint
```

### Missing Database ID

If the D1 database_id is empty in `wrangler.toml`:

```bash
npx wrangler d1 create gameeval-db
```

Copy the `database_id` from the output to `wrangler.toml`.

## Next Steps

After successful setup:

1. ✅ All services configured
2. ✅ TypeScript types generated
3. ✅ Local development working
4. ✅ Resources created in Cloudflare

Ready to implement Story 1.2: D1 Database Schema and Migrations!

