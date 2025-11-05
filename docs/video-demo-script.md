# GameEval Demo Script (2-3 minutes)

## Opening (0:00-0:20)
*[Screen shows GameEval dashboard + camera feed]*

**"Hi, I'm Adam. This is GameEval - an autonomous AI-powered QA pipeline for browser games, built entirely on Cloudflare's Developer Platform."**

**"The concept: submit any game URL, watch an AI agent play it in real-time, and get a comprehensive quality report - all without touching infrastructure."**

## Demo: Starting a Test Run (0:20-0:45)
*[Navigate to dashboard, submit game URL]*

**"Let me show you. I'll submit this game URL..."**

*[Click 'Start Test']*

**"...and within seconds, a TestAgent spins up. Notice the real-time updates via WebSocket - you're watching the AI discover controls, explore gameplay, and evaluate quality as it happens."**

## Technical Deep Dive (0:45-2:00)
*[While test runs, gesture to architecture/code]*

**"What makes this interesting technically:**

**First - it's 100% serverless. No EC2, no Kubernetes, no infrastructure management. Just globally distributed edge compute."**

**Second - the architecture pattern. Each test run is a Durable Object - a persistent, stateful AI agent that lives as long as needed. Everything communicates via RPC service bindings - no exposed API endpoints."**

**Third - true autonomous testing. This isn't using the latest, most expensive LLM models. It's a cheap vision model hosted on the edge that actually sees and understands the game UI. Not following scripts - playing games like a human would, making decisions based on what it observes."**

## Results + Wrap-up (2:00-2:30)
*[Check test results if complete, or show previous test report]*

**"And here's the output: multi-dimensional quality scores, visual evidence for every evaluation, detailed execution logs. Everything you need to understand what worked and what broke."**

## Closing (2:30-2:45)

**"This demonstrates a few things I'm passionate about: building with modern platform primitives instead of reinventing infrastructure, leveraging AI for practical automation, and creating systems that scale without complexity."**

**"Built in about 24 hours. The entire backend is TypeScript, runs globally on the edge, and costs pennies per test run."**

*[Pause, smile]*

**"Happy to walk through any part in detail. Thanks for watching."**

---

## Director's Notes

### Timing Targets
- Opening: 20s
- Demo Start: 25s
- Technical Discussion: 75s (longest segment - your expertise shines here)
- Results: 30s
- Closing: 15s
- **Total: ~2:45**

### Key Technical Terms to Emphasize
- "Durable Objects" (persistent, stateful agents)
- "Edge compute" / "Globally distributed"
- "No exposed API endpoints"
- "Cheap vision model hosted on the edge"
- "Serverless" / "No infrastructure"
- "Built in 24 hours"

### Visual Suggestions
- Keep dashboard visible during technical discussion
- Perhaps picture-in-picture with code editor showing key files (TestAgent.ts, GameTestPipeline.ts)
- Point to real-time WebSocket updates as they appear
- Show test results page at the end

### Tone Notes
- Confident but not arrogant
- Technical depth without jargon overload
- Showcase problem-solving and architectural thinking
- Let the live demo prove it works (less "trust me," more "watch this")

