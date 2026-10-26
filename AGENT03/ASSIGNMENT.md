# Assignment AGENT03 — Personal Assistant Agent (Python · LangGraph)

> **Draft.** This is an outline of the parts, not the full assignment. Each part still needs its required interfaces, tests, thresholds and "Done when" list before work on it starts.

**Topics:** the agent loop as a graph, graphs (nodes, edges, state), conditional routing, checkpointers and durable state, threads, human-in-the-loop interrupts, long-term memory stores, subgraphs and multi-agent composition, fine-grained vs. coarse graph design

**Before this:** AGENT01 (Agent From Scratch). Several parts here rebuild something you already wrote by hand there, and the comparison is the point.

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
   *Part 1.*
3. **LangGraph docs — Graph API concepts** (state, nodes, edges, reducers)
   *Parts 1 and 2.*
4. **LangGraph docs — Persistence** (checkpointers, threads)
   *Part 3.*
5. **LangGraph docs — Human-in-the-loop / interrupts**
   *Part 4.*
6. **LangGraph docs — Memory / stores** (long-term memory, semantic search)
   *Part 5.*
7. **LangGraph docs — Subgraphs and multi-agent systems**
   *Part 6.*

### Going deeper

- LangGraph docs — Durable execution
- Anthropic engineering — How we built our multi-agent research system

---

## Part 0 — Project setup

Virtual environment, dependencies (`langgraph`, `langchain-anthropic`, `pytest`), the API key read from the environment, and a `tools.py` with the assistant's tools working as plain functions over a local JSON store: `add_note`, `search_notes`, `add_todo`, `list_todos`, `delete_todo`. Tested without any LLM.

## Part 1 — The tool-calling loop as a graph

A model node and a tool node, connected in a loop: the model asks for tools, the tool node runs them and appends the results, and control returns to the model until it answers without a tool call. A hard limit on iterations. You wrote this loop by hand in AGENT01; compare the two in `LESSONS_LEARNED.md`.

## Part 2 — Conditional routing, the fine-grained way

Split the assistant into explicit nodes for each step (classify the request, route to notes or to-dos, call tools, format the answer) connected by conditional edges. Record the node and edge count after each capability you add: this is the graph you will later throw away.

## Part 3 — Checkpointer and durable state

Add a SQLite checkpointer and conversation threads. Conversations survive a process restart, two threads don't see each other's history, and you can inspect and rewind a thread's past states. Compare with the in-process conversation history from LLM02: what does a checkpointer add?

## Part 4 — Human approval with interrupts

Before any destructive tool (`delete_todo`) runs, the graph pauses and asks for approval. An approval resumes it, a rejection tells the model the action was refused. The pause must survive a restart, which only works because of Part 3.

## Part 5 — Long-term memory with a store

Add a LangGraph store with semantic search so the assistant remembers facts across threads, not only within one. Compare with the memory you built on MongoDB in LLM04: what the store does for you, and what you can no longer see.

## Part 6 — A second agent as a subgraph

Move to-do handling into its own agent, built as a subgraph, and have the main assistant delegate to it. Decide what state the two share and what stays private to each. This is the foundation for a team of assistants.

## Part 7 — The refactor: from fine-grained to coarse

Rebuild the assistant as `assistant_graph`: as few nodes as possible (most likely: model, tools, approval), keeping every behaviour from Parts 1–6. The same behaviour tests from Parts 1–6 must pass against both graphs. In `README.md`, compare the two graphs: what each node in the fine-grained graph turned into, what the framework simplified, and where explicit nodes were actually worth keeping.

## Review questions

*To be written.*
