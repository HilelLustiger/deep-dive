# Deep Dive

A structured curriculum of small projects in software fundamentals: object-oriented design, data structures, memory management, asynchronous programming, concurrency, networking, databases, security, and containers and CI/CD.

Each project is a focused assignment built from an established textbook, university course or official documentation, implemented from scratch, and verified by tests.

**Languages:** Python · TypeScript · C++
**Current focus:** the Python track (object-oriented programming, asynchronous programming, concurrency and networking)

## How each project works

Every project lives in its own folder with two documents:

- **`ASSIGNMENT.md`**: the task, written before any code, in the style of a university assignment. It states what to build, the required interfaces, and the tests that define "done". A **Reading** section lists what to read *before you start*, each source tied to the parts it prepares for, and what to read for *going deeper*.
- **`README.md`**: the source the assignment is based on, what the project covers, and, once complete, what I learned and one design decision I made along the way.

A project is complete only when every requirement in its assignment is backed by a passing test. Where a requirement can't be tested in code, such as a cached image layer or a blocked pull request, it is backed by recorded command output instead.

## Projects

### Object-Oriented Programming

- **[OOP01 · Library System](OOP01/)** — Python · *complete*  
  Classes, encapsulation, inheritance, polymorphism, composition, abstract classes
- **[OOP02 · Library System](OOP02/)** — TypeScript  
  Access modifiers, abstract classes vs. interfaces, static members, method overloading

### Data Structures From Scratch

- **DS01 · Linked List** — Python  
  Nodes and pointers, insert/delete/traverse
- **DS02 · Hash Map** — Python  
  Hashing, collisions, resizing
- **DS03 · BST** — Python  
  Ordered tree insert/search/delete
- **DS04 · Generic Linked List** — TypeScript  
  Generics

### Recursion

- **REC01 · File System Explorer** — Python  
  Recursive tree traversal
- **REC02 · Maze Solver** — Python  
  Backtracking

### Manual Memory Management

- **MEM01 · Dynamic Array** — C++  
  new/delete, growth, copy semantics
- **MEM02 · Smart Pointer** — C++  
  RAII, ownership, reference counting

### Asynchronous Programming

- **ASYNC01 · Promise Chain** — TypeScript  
  Promises, async/await, error propagation
- **[ASYNC02 · Async Site Checker](ASYNC02/)** — Python · *complete*  
  Coroutines, tasks, `gather` vs. `TaskGroup`, timeouts and cancellation, concurrency limits, blocking code

### Concurrency

- **[CONC01 · Concurrent Bank](CONC01/)** — Python · *in progress*  
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

- **DB01 · Transactions & Indexing** — Python  
  ACID transactions, indexes

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
- **OPS02 · Deploying to a Server** — Docker · GitHub Actions  
  Linux server over SSH, reverse proxy and TLS, deploying by image SHA, rollback
- **OPS03 · Observability** — Python · Prometheus · Grafana  
  Structured logs, metrics, liveness vs. readiness, alerting
- **OPS04 · Kubernetes Basics** — Kubernetes  
  Deployments, Services, ConfigMaps and Secrets, probes, rolling updates
