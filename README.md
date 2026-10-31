# Deep Dive

A structured curriculum of small projects in software fundamentals: object-oriented design, data structures, memory management, asynchronous programming, concurrency, networking, databases, security, containers and CI/CD, AI agents, and developer tooling.

Each project is a focused assignment built from an established textbook, university course or official documentation, implemented from scratch, and verified by tests.

**Languages:** Python · TypeScript · C++ · Java · Bash

## How each project works

Every project lives in its own folder with two documents:

- **`ASSIGNMENT.md`**: the task, written before any code, in the style of a university assignment. It states what to build, the required interfaces, and the tests that define "done". A **Reading** section lists what to read *before you start*, each source tied to the parts it prepares for, and what to read for *going deeper*.
- **`README.md`**: the source the assignment is based on, what the project covers, and, once complete, what I learned and one design decision I made along the way.

## Projects

### Object-Oriented Programming

- **[OOP01 · Library System](OOP01/)** — Python · *<ins>complete</ins>*  
  Classes, encapsulation, inheritance, polymorphism, composition, abstract classes
- **[OOP02 · Library System](OOP02/)** — TypeScript · *<ins>complete</ins>*  
  Access modifiers, abstract classes vs. interfaces, static members, method overloading

### Data Structures From Scratch

- **DS01 · Linked List** — C++  
  Nodes and raw pointers, insert/delete/traverse, freeing nodes in the destructor
- **DS02 · Hash Map** — Python  
  Hashing, collisions, resizing, the mapping protocol (`__getitem__`, `__setitem__`)
- **[DS03 · Binary Search Tree](DS03/)** — TypeScript · *<ins>complete</ins>*  
  Ordered tree insert/search/delete, generics and comparator functions
- **DS04 · Priority Queue** — Java  
  Binary heap in an array, sift-up and sift-down, bounded generics, `Iterable`

### Recursion

- **REC01 · File System Explorer** — Python  
  Recursive tree traversal
- **REC02 · Maze Solver** — TypeScript  
  Backtracking

### Manual Memory Management

- **MEM01 · Dynamic Array** — C++  
  new/delete, growth, copy semantics
- **MEM02 · Smart Pointer** — C++  
  RAII, ownership, reference counting

### Asynchronous Programming

- **[ASYNC01 · Promise Chain](ASYNC01/)** — TypeScript  
  A Promise from scratch to the Promises/A+ spec, microtasks, chaining and error propagation, thenables, combinators, async/await built from generators, unhandled rejections
- **[ASYNC02 · Async Site Checker](ASYNC02/)** — Python · *<ins>complete</ins>*  
  Coroutines, tasks, `gather` vs. `TaskGroup`, timeouts and cancellation, concurrency limits, blocking code

### Concurrency

- **[CONC01 · Concurrent Bank](CONC01/)** — Python · *<ins>complete</ins>*  
  Race conditions, locks, deadlock, producer–consumer, semaphores, GIL, threads vs. processes
- **CONC02 · Worker Threads** — TypeScript  
  Parallelism in Node
- **CONC03 · Threads + Mutex** — C++  
  std::thread, mutexes

### Networking

- **[NET01 · Key-Value Server](NET01/)** — Python  
  TCP sockets, framing, protocol design, threaded and asyncio servers, network errors, HTTP
- **NET02 · TCP Echo Server/Client** — C++  
  Low-level sockets

### Databases

- **DB01 · Transactions & Isolation** — Python · PostgreSQL  
  ACID transactions, isolation levels, dirty reads, lost updates and write skew, locking vs. MVCC
- **DB02 · Indexes & Query Plans** — PostgreSQL  
  B-tree indexes, reading `EXPLAIN` and `EXPLAIN ANALYZE`, when an index isn't used, composite and covering indexes
- **DB03 · Schema Design** — PostgreSQL  
  Normalization, keys and foreign keys, constraints, when to denormalize on purpose
- **DB04 · Databases from Application Code** — TypeScript · PostgreSQL  
  ORMs and the N+1 problem, connection pools, schema migrations

### Software Design & Architecture

- **ARCH01 · Notification System** — Python/TS  
  Design patterns

### Security Fundamentals

- **SEC01 · Auth Basics** — Python  
  Password hashing, sessions
- **SEC02 · XSS Demo** — TypeScript  
  Injection and escaping
- **SEC03 · Buffer Overflow Demo** — C++  
  Memory-safety bugs

### DevOps

- **[OPS01 · Containers and CI/CD](OPS01/)** — Python · Docker · GitHub Actions  
  Images and layers, build cache, Compose networking and volumes, healthchecks, CI pipelines, service containers, publishing to a registry
- **OPS02 · Deploying to a Server** — Bash · Docker · GitHub Actions  
  Linux server over SSH, reverse proxy and TLS, deploying by image SHA, rollback
- **OPS03 · Observability** — TypeScript · Prometheus · Grafana  
  Structured logs, metrics, liveness vs. readiness, alerting
- **OPS04 · Kubernetes Basics** — Python · TypeScript · Kubernetes  
  Deployments, Services, ConfigMaps and Secrets, probes, rolling updates

### LLM Fundamentals

- **[LLM01 · How a Model Produces Text](LLM01/)** — Python  
  Tokenization and byte-pair encoding from scratch, why models struggle with spelling and counting, a bigram model built by counting, smoothing and perplexity, logits and softmax, sampling (temperature, greedy, top-k, top-p), GPT-2 run locally, no API
- **[LLM02 · Talking to an LLM](LLM02/)** — TypeScript · *to be revised*  
  One interface you define, implemented for two providers (Claude and a local model), the stateless API, tokens and cost, system prompts, conversation history and the context window, streaming (SSE), errors, retries and timeouts, structured output, provider-specific features kept apart
- **LLM03 · Prompts and Evals** — TypeScript  
  System prompts, few-shot examples, prompt templates, test sets for non-deterministic output, graders and LLM-as-judge, catching regressions when a prompt or model changes
- **LLM04 · Embeddings and Retrieval** — TypeScript · MongoDB Atlas  
  Embeddings and cosine similarity, brute-force vs. indexed search, vector indexes, chunking, retrieval evals (recall@k), context injection (RAG), long-term memory
- **LLM05 · Fine-tuning** — Python  
  When fine-tuning beats prompting and retrieval, preparing a dataset, LoRA on a small open model, measuring before and after with the evals from LLM03

### AI Agents

- **AGENT01 · Agents From Scratch** — TypeScript  
  Tool definitions and tool calling, a hand-written agent loop, tool errors, workflow patterns (prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer) vs. autonomous agents, memory as tools, transcript logging, task-success evals
- **AGENT02 · MCP Server** — TypeScript  
  The Model Context Protocol, exposing tools and resources, connecting a server to any agent
- **[AGENT03 · Personal Assistant Agent](AGENT03/)** — Python · LangGraph · *draft*  
  The agent loop as a graph, conditional routing, checkpointers and durable state, human-in-the-loop interrupts, long-term memory stores, subgraphs and multi-agent composition, refactoring a fine-grained graph into a coarse one
- **AGENT04 · Security of LLM Apps** — TypeScript  
  Prompt injection, direct and through retrieved documents or tool output, least-privilege tools, human approval for destructive actions, separating data from instructions, testing attacks with evals

### Tooling

- **TOOL01 · C++ Build and Test Setup** — C++ · CMake  
  Headers and source files, compiling and linking, CMake, GoogleTest, compiler warnings, sanitizers
- **TOOL02 · Git Internals** — Git  
  Objects, commits and refs, the index, branches as pointers, rebase, reset and reflog, rewriting history
- **TOOL03 · Debugging** — Python · TypeScript · C++  
  Breakpoints, stepping, inspecting variables and the call stack, the VS Code debugger
