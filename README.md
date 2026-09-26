# Deep Dive

Focused mini-projects for learning programming and algorithm fundamentals, beyond LeetCode-style exercises. Each project isolates one concept, takes a few hours, and follows a source (book/course). It is done only when every item in its Definition of Done passes.

Each project lives in its own folder with a README holding the full spec. Project specs are written when their stage starts, not up front.

## Rules of thumb

- More than 2 work sessions on one project means the scope drifted. Stop and cut it down.
- Check each project against its Definition of Done item by item, not "it basically works".
- Stage and project order is a suggestion, not a rule.
- This README is the single source of truth for status.

**Status:** ⚪ not started · 🔵 in progress · ✅ done

## Projects

### Stage 1 — OOP 🔵

| # | Project | Language | Covers | Status |
|---|---------|----------|--------|--------|
| 01 | [Library System](01-library-system-python/) | Python | Classes, encapsulation, inheritance, polymorphism, composition, abstract classes | ⚪ |
| 02 | [Library System](02-library-system-ts/) | TypeScript | Same system with compile-time encapsulation; abstract class vs. interface | ⚪ |

### Stage 2 — Data Structures From Scratch ⚪ · after 1

| # | Project | Language | Covers | Status |
|---|---------|----------|--------|--------|
| 03 | Linked List | Python | Nodes and pointers, insert/delete/traverse | ⚪ |
| 04 | Hash Map | Python | Hashing, collisions, resizing | ⚪ |
| 05 | BST | Python | Ordered tree insert/search/delete | ⚪ |
| 05b | Generic Linked List | TypeScript | Generics | ⚪ |

### Stage 3 — Recursion ⚪ · after 2

| # | Project | Language | Covers | Status |
|---|---------|----------|--------|--------|
| 06 | File System Explorer | Python | Recursive tree traversal | ⚪ |
| 07 | Maze Solver | Python | Backtracking | ⚪ |

### Stage 4 — Manual Memory Management ⚪ · after 3

| # | Project | Language | Covers | Status |
|---|---------|----------|--------|--------|
| 08 | Dynamic Array | C++ | new/delete, growth, copy semantics | ⚪ |
| 09 | Smart Pointer | C++ | RAII, ownership, reference counting | ⚪ |

### Stage 5 — Asynchronous Programming ⚪ · after 1

| # | Project | Language | Covers | Status |
|---|---------|----------|--------|--------|
| 10 | Promise Chain | TypeScript | Promises, async/await, error propagation | ⚪ |
| 11 | [Async Site Checker](11-async-site-checker-python/) | Python | Coroutines, tasks, `gather` vs. `TaskGroup`, timeouts and cancellation, concurrency limits, blocking code | ⚪ |

### Stage 6 — Concurrency ⚪ · after 5

| # | Project | Language | Covers | Status |
|---|---------|----------|--------|--------|
| 12 | [Concurrent Bank](12-concurrent-bank-python/) | Python | Race conditions, locks, deadlock, producer–consumer, semaphores, GIL, threads vs. processes | ⚪ |
| 13 | Worker Threads | TypeScript | Parallelism in Node | ⚪ |
| 14 | Threads + Mutex | C++ | std::thread, mutexes | ⚪ |

### Stage 7 — Networking ⚪ · after 6

| # | Project | Language | Covers | Status |
|---|---------|----------|--------|--------|
| 15 | [Key-Value Server](15-key-value-server-python/) | Python | TCP sockets, framing, protocol design, threaded and asyncio servers, network errors, HTTP | ⚪ |
| 16 | TCP Echo Server/Client | C++ | Low-level sockets | ⚪ |

### Stage 8 — Databases ⚪ · after 2

| # | Project | Language | Covers | Status |
|---|---------|----------|--------|--------|
| 17 | Transactions & Indexing | Python | ACID transactions, indexes | ⚪ |

### Stage 9 — Software Design & Architecture ⚪ · after 1

| # | Project | Language | Covers | Status |
|---|---------|----------|--------|--------|
| 18 | Notification System | Python/TS | Design patterns | ⚪ |

### Stage 10 — Security Fundamentals ⚪ · after 4, 8

| # | Project | Language | Covers | Status |
|---|---------|----------|--------|--------|
| 19 | Auth Basics | Python | Password hashing, sessions | ⚪ |
| 20 | XSS Demo | TypeScript | Injection and escaping | ⚪ |
| 21 | Buffer Overflow Demo | C++ | Memory-safety bugs | ⚪ |
