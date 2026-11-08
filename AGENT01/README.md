# Agents From Scratch (TypeScript)

Based on Anthropic's [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents), the tool-use guides of [Claude](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview), [OpenAI](https://developers.openai.com/api/docs/guides/function-calling) and [Ollama](https://docs.ollama.com/capabilities/tool-calling), and the [ReAct](https://arxiv.org/abs/2210.03629) paper.

An agent written without a framework: tools described with JSON Schema, a runner that executes the model's tool calls and matches each result to its call, the agent loop with its stop conditions and step limit, and tool errors returned to the model as results it can recover from. The agent talks to a provider-neutral `ChatModel` interface, with given implementations for Claude and for a local model through Ollama, and is tested against a scripted fake model.

The full task is in [ASSIGNMENT.md](ASSIGNMENT.md).
