# Assignment AGENT01 — Personal Assistant Agent (Python · LangGraph)

> **Draft.** This is an outline of the parts, not the full assignment. Each part still needs its required interfaces, tests, thresholds and "Done when" list before work on it starts.

**Topics:** the agent loop, tool calling, graphs (nodes, edges, state), conditional routing, checkpointers and durable state, threads, human-in-the-loop interrupts, subgraphs and multi-agent composition, fine-grained vs. coarse graph design

## Introduction

In this assignment you will build a small personal assistant: an LLM that can read and write your notes and to-do list through tools, remembers a conversation across restarts, asks before doing anything destructive, and hands specialised work to a second agent.

You will build it with [LangGraph](https://langchain-ai.github.io/langgraph/), but the goal is not to learn one more framework. Every LangGraph concept maps onto a general idea in agent design (the loop, control flow, memory, human control, communication between agents), and each part asks the same question: **what does this give me that plain Python didn't?**

The assignment deliberately goes the long way round. Parts 1–6 build a **fine-grained** graph, with an explicit node for every step, so you feel the graph grow every time you add a capability. Part 7 throws it away and rebuilds the assistant as a **coarse** graph. That refactor is the real lesson: it is where you see why the framework exists and what it actually simplifies.

### Two artifacts, one codebase

By the end there are two graphs in this folder:

- **`learning_graph`**: the fine-grained, explicit graph from Parts 1–6. It is kept as it is, for reference.
- **`assistant_graph`**: the coarse graph from Part 7. This is the one you would actually use.

### Lessons log

Keep a **`LESSONS_LEARNED.md`** in this folder and add to it during every part, not at the end: each time something clicks, write down what it was and what made it click. Each part's "Done when" list includes at least one new entry.

### Testing without a real model

Tests must not call a real LLM. Use a fake chat model from `langchain_core` that returns scripted messages (including scripted tool calls), so every test is deterministic, free and fast. A real model (Claude, through `langchain-anthropic`) is used only for manual runs.

---

## Reading

*To be completed and links verified in the full write-up.*

### Before you start

1. **Anthropic — [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)**
   The difference between workflows and agents, the agent loop, and the advice to start simple and add structure only when it pays for itself. The whole assignment is an experiment in that advice.
   *All parts, Part 7 especially.*
2. **Anthropic docs — Tool use overview**
   What a tool definition is, what a `tool_use` block looks like, and how its result goes back to the model.
   *Part 2.*
3. **LangGraph docs — Graph API concepts** (state, nodes, edges, reducers)
   *Parts 1 and 3.*
4. **LangGraph docs — Persistence** (checkpointers, threads)
   *Part 4.*
5. **LangGraph docs — Human-in-the-loop / interrupts**
   *Part 5.*
6. **LangGraph docs — Subgraphs and multi-agent systems**
   *Part 6.*

### Going deeper

- LangGraph docs — Durable execution
- Anthropic engineering — How we built our multi-agent research system

---

## Part 0 — Project setup

Virtual environment, dependencies (`langgraph`, `langchain-anthropic`, `pytest`), the API key read from the environment, and a `tools.py` with the assistant's tools working as plain functions over a local JSON store: `add_note`, `search_notes`, `add_todo`, `list_todos`, `delete_todo`. Tested without any LLM.

## Part 1 — A graph with one node

A graph with a single node that calls the model once and returns its answer. Then write the same thing as a plain function. Compare them in `LESSONS_LEARNED.md`: at this size the framework gives you nothing. That is the point of this part.

## Part 2 — The tool-calling loop

A model node and a tool node, connected in a loop: the model asks for tools, the tool node runs them and appends the results, and control returns to the model until it answers without a tool call. A hard limit on iterations. This is the core of every agent.

## Part 3 — Conditional routing, the fine-grained way

Split the assistant into explicit nodes for each step (classify the request, route to notes or to-dos, call tools, format the answer) connected by conditional edges. Record the node and edge count after each capability you add: this is the graph you will later throw away.

## Part 4 — Checkpointer and durable state

Add a SQLite checkpointer and conversation threads. Conversations survive a process restart, two threads don't see each other's history, and you can inspect and rewind a thread's past states. This is how agent "memory" actually works: saved state, not something inside the model.

## Part 5 — Human approval with interrupts

Before any destructive tool (`delete_todo`) runs, the graph pauses and asks for approval. An approval resumes it, a rejection tells the model the action was refused. The pause must survive a restart, which only works because of Part 4.

## Part 6 — A second agent as a subgraph

Move to-do handling into its own agent, built as a subgraph, and have the main assistant delegate to it. Decide what state the two share and what stays private to each. This is the foundation for a team of assistants.

## Part 7 — The refactor: from fine-grained to coarse

Rebuild the assistant as `assistant_graph`: as few nodes as possible (most likely: model, tools, approval), keeping every behaviour from Parts 2–6. The same behaviour tests from Parts 2–6 must pass against both graphs. In `README.md`, compare the two graphs: what each node in the fine-grained graph turned into, what the framework simplified, and where explicit nodes were actually worth keeping.

## Review questions

*To be written.*
