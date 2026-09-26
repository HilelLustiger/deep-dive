# Async Site Checker (Python)

Based on chapters 2 ("asyncio basics") and 4 ("Concurrent web requests") of *Python Concurrency with asyncio* by Matthew Fowler, extended with the Python 3.11+ APIs (`TaskGroup`, `asyncio.timeout`).

A command-line tool that checks many websites concurrently and reports each result as it arrives, covering coroutines, tasks, timeouts, cancellation, `gather` vs. `TaskGroup`, concurrency limits and blocking code.

The full task is in [ASSIGNMENT.md](ASSIGNMENT.md).
