# Workflow Patterns (TypeScript)

Based on Anthropic's [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) by Erik Schluntz and Barry Zhang.

A support inbox for a made-up parcel locker service, handled with each of the five workflow patterns on top of a provider-neutral model client: prompt chaining with checks between steps, routing to specialist prompts or cheaper models, parallel sectioning and majority voting with a concurrency limit, orchestrator-workers with a bounded plan, and an evaluator-optimizer loop. It ends with when a fixed workflow is the better choice than an autonomous agent.

The full task is in [ASSIGNMENT.md](ASSIGNMENT.md).
