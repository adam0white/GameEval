# Deployment Architecture

**Deployment Model: Direct to Production/Staging**

**Commands:**
```bash
# Deploy to staging
npx wrangler deploy --env staging

# Deploy to production
npx wrangler deploy --env production
```

**Environment Configuration:**
```toml
# wrangler.toml
[env.staging]
name = "gameeval-staging"
# ... staging bindings

[env.production]
name = "gameeval-production"
# ... production bindings
```

**Deployment Flow:**
1. Commit code changes
2. Run `npx wrangler deploy` (deploys to Cloudflare edge)
3. Test with example game
4. No CI/CD pipeline needed (Wrangler handles build + deploy)

**Rollback:**
```bash
# Rollback to previous version
npx wrangler rollback
```

**Global Distribution:**
- Automatic deployment to 300+ Cloudflare edge locations
- TestAgent DOs created near game servers (latency optimization)
- Dashboard served from nearest edge location to user
