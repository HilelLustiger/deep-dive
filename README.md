# Deep Dive

A structured curriculum of small projects in software fundamentals: object-oriented design, data structures, memory management, asynchronous programming, concurrency, networking, databases and security.

Each project is a focused assignment built from an established textbook or university course, implemented from scratch, and verified by tests.

**Languages:** Python · TypeScript · C++
**Current focus:** the Python track (stages 1, 5, 6 and 7)

## How each project works

Every project lives in its own folder with two documents:

- **`ASSIGNMENT.md`**: the task, written before any code, in the style of a university assignment. It states what to build, the required interfaces, and the tests that define "done".
- **`README.md`**: the source the assignment is based on, what the project covers, and, once complete, what I learned and one design decision I made along the way.

A project is complete only when every requirement in its assignment is backed by a passing test.

## Projects

### 1. Object-Oriented Programming

- **[01 · Library System](01-library-system-python/)** — Python · *complete*  
  Classes, encapsulation, inheritance, polymorphism, composition, abstract classes
- **[02 · Library System](02-library-system-ts/)** — TypeScript  
  Access modifiers, abstract classes vs. interfaces, static members, method overloading

### 2. Data Structures From Scratch

- **03 · Linked List** — Python  
  Nodes and pointers, insert/delete/traverse
- **04 · Hash Map** — Python  
  Hashing, collisions, resizing
- **05 · BST** — Python  
  Ordered tree insert/search/delete
- **05b · Generic Linked List** — TypeScript  
  Generics

### 3. Recursion

- **06 · File System Explorer** — Python  
  Recursive tree traversal
- **07 · Maze Solver** — Python  
  Backtracking

### 4. Manual Memory Management

- **08 · Dynamic Array** — C++  
  new/delete, growth, copy semantics
- **09 · Smart Pointer** — C++  
  RAII, ownership, reference counting

### 5. Asynchronous Programming

- **10 · Promise Chain** — TypeScript  
  Promises, async/await, error propagation
- **[11 · Async Site Checker](11-async-site-checker-python/)** — Python · *in progress*  
  Coroutines, tasks, `gather` vs. `TaskGroup`, timeouts and cancellation, concurrency limits, blocking code

### 6. Concurrency

- **[12 · Concurrent Bank](12-concurrent-bank-python/)** — Python  
  Race conditions, locks, deadlock, producer–consumer, semaphores, GIL, threads vs. processes
- **13 · Worker Threads** — TypeScript  
  Parallelism in Node
- **14 · Threads + Mutex** — C++  
  std::thread, mutexes

### 7. Networking

- **[15 · Key-Value Server](15-key-value-server-python/)** — Python  
  TCP sockets, framing, protocol design, threaded and asyncio servers, network errors, HTTP
- **16 · TCP Echo Server/Client** — C++  
  Low-level sockets

### 8. Databases

- **17 · Transactions & Indexing** — Python  
  ACID transactions, indexes

### 9. Software Design & Architecture

- **18 · Notification System** — Python/TS  
  Design patterns

### 10. Security Fundamentals

- **19 · Auth Basics** — Python  
  Password hashing, sessions
- **20 · XSS Demo** — TypeScript  
  Injection and escaping
- **21 · Buffer Overflow Demo** — C++  
  Memory-safety bugs

## Running a project

Each project is self-contained. For a Python project:

```
cd 01-library-system-python
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
python -m pytest
```
