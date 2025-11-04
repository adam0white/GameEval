# Implementation Patterns

## Module Organization
- **Monorepo**: All code in single repository
- **Flat structure**: `/src/workers`, `/src/workflows`, `/src/agents`, `/src/shared`
- **Shared types**: Single `types.ts` for interfaces used across modules
- **No circular dependencies**: Shared code imported from `/src/shared` only

## File Naming
- **TypeScript files**: camelCase for files, PascalCase for classes
  - ✅ `gameTestPipeline.ts`, `TestAgent.ts`
  - ❌ `game-test-pipeline.ts`, `test-agent.ts`
- **SQL migrations**: Numbered prefix, snake_case description
  - ✅ `0001_create_test_runs.sql`
  - ❌ `create-test-runs.sql`

## RPC Service Binding Pattern
- **All internal communication via RPC**: No HTTP REST APIs
- **Binding access**: Through `env` parameter
- **Example**:
  ```typescript
  // Dashboard Worker calling Workflow
  const result = await env.WORKFLOW.create().run({ testRunId, gameUrl });
  
  // Workflow calling TestAgent DO
  const testAgentId = env.TEST_AGENT.idFromString(testRunId);
  const testAgent = env.TEST_AGENT.get(testAgentId);
  const response = await testAgent.fetch("/phase1", { method: "POST" });
  ```

## Async/Await Consistency
- **Always use async/await**: Never use raw Promises or callbacks
- **Error handling**: try-catch at boundaries, throw for unexpected errors
- **Example**:
  ```typescript
  async runPhase1(): Promise<PhaseResult> {
    try {
      const result = await this.browserSession.goto(this.gameUrl);
      return { success: true, data: result };
    } catch (error) {
      throw new UserFriendlyError("Game failed to load", error);
    }
  }
  ```
