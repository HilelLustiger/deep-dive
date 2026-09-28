# Async Site Checker (Python)

Based on chapters 2 ("asyncio basics") and 4 ("Concurrent web requests") of *Python Concurrency with asyncio* by Matthew Fowler, extended with the Python 3.11+ APIs (`TaskGroup`, `asyncio.timeout`).

A command-line tool that checks many websites concurrently and reports each result as it arrives, covering coroutines, tasks, timeouts, cancellation, `gather` vs. `TaskGroup`, concurrency limits and blocking code.

The full task is in [ASSIGNMENT.md](ASSIGNMENT.md).


## Takeaways

### `gather` vs. `TaskGroup`

Calling a coroutine function doesn't run anything on its own. To send several HTTP requests at the same time, each coroutine has to be wrapped in a task, which starts running as soon as it's created. `asyncio.gather` and `asyncio.TaskGroup` both do this, and wait for all the tasks to finish.

**When one task fails, they behave differently:**

- **`gather`**: the first exception is raised to the caller, but the other tasks are not cancelled and keep running in the background. With `return_exceptions=True`, nothing is raised: each exception is returned in the results list, in place of that task's result.
- **`TaskGroup`**: as soon as one task fails, the group cancels all the others, waits for them to stop, and raises an `ExceptionGroup` with the failure. Nothing is left running.

**They are also written differently:**

- **`gather`** is a single call. `await asyncio.gather(...)` returns the list of results, in the order the coroutines were passed.
- **`TaskGroup`** is a block. Inside `async with asyncio.TaskGroup() as tg:`, each task is created with `tg.create_task(...)`. Leaving the block waits for all of them. After the block, each task's result is read with `task.result()`.

**Which one to choose** depends on whether the tasks depend on each other:

- **All or nothing → `TaskGroup`.** When the tasks are parts of one operation, a single failure makes the rest worthless. For example, loading a user's profile, orders and shipping address to render one page. It's better to cancel everything right away, leave nothing running in the background, and report the failure.
- **Keep whatever succeeds → `gather` with `return_exceptions=True`.** When the tasks are independent, partial results are still useful. This site checker is that case: one invalid URL shouldn't cancel the checks of the other 49. Every task finishes, and the results list shows which ones failed and why, next to the results of the ones that succeeded.
