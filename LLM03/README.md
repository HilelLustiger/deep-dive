# Prompts and Evals (TypeScript)

Based on Hamel Husain's [Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/) and [Using LLM-as-a-Judge For Evaluation](https://hamel.dev/blog/posts/llm-judge/), and on the prompting guidance in [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) and the [Prompt Engineering Guide](https://www.promptingguide.ai/techniques/fewshot).

A support-reply agent for a made-up parcel locker service, and the eval around it: prompt versions built from a system prompt, a template and few-shot examples; graders written as code; a model as the judge, checked against hand-labelled replies; repeated trials that find flaky cases; and a case-by-case comparison of two prompt versions that catches regressions. It works the same with Claude and with a local model through Ollama.

The full task is in [ASSIGNMENT.md](ASSIGNMENT.md).
