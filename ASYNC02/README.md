# Async Site Checker (Python)

Based on chapters 2 ("asyncio basics") and 4 ("Concurrent web requests") of *Python Concurrency with asyncio* by Matthew Fowler, extended with the Python 3.11+ APIs (`TaskGroup`, `asyncio.timeout`).

A command-line tool that checks many websites concurrently and reports each result as it arrives, covering coroutines, tasks, timeouts, cancellation, `gather` vs. `TaskGroup`, concurrency limits and blocking code.

The full task is in [ASSIGNMENT.md](ASSIGNMENT.md).

## Usage

Requires Python 3.11+.

```
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt

python -m checker urls.txt --timeout 3 --max-concurrent 3
```

`urls.txt` holds one URL per line. Blank lines and surrounding spaces are ignored:

```
https://www.python.org

https://www.python.org/this-page-does-not-exist
https://httpbin.org/delay/10
  https://docs.python.org
http://127.0.0.1:1
https://no-such-domain.invalid
```

Each result is printed as soon as it arrives, so fast failures come first and the slow site comes last:

```
✗ ---  0.03s  https://no-such-domain.invalid  (Cannot connect to host no-such-domain.invalid:443 ...)
✗ ---  0.00s  http://127.0.0.1:1  (Cannot connect to host 127.0.0.1:1 ...)
✓ 200  0.18s  https://www.python.org
✓ 200  0.29s  https://docs.python.org
✗ 404  0.45s  https://www.python.org/this-page-does-not-exist
✗ ---  3.00s  https://httpbin.org/delay/10  (timeout)

2 up, 3 down, 1 timed out in 3.22s
```

The site that takes 10 seconds to answer is cut off at the 3-second timeout, and the whole run takes about as long as that one request.

Run the tests with `python -m pytest`. They use a local test server, so they need no internet connection.

## Measured results

Timings from the test scenarios, measured against the local test server (Python 3.12, Apple Silicon):

```
Scenario                                   Time
─────────────────────────────────────────  ───────
3 requests of 1s   check_sequential        3.01s
                   check_with_gather       1.01s
                   check_with_taskgroup    1.01s

4 requests of 0.5s check_limited, max 1    2.01s
                   check_limited, max 2    1.01s
                   check_limited, max 4    0.51s

3 calls of 0.3s    blocking (time.sleep)   0.91s
                   asyncio.to_thread       0.31s
```

- **Sequential vs. concurrent:** awaiting one request after another takes the sum of their times. Running them as tasks takes the time of the slowest one.
- **Concurrency limit:** with a semaphore of *n*, requests run in batches of *n*. A limit of 1 makes the run sequential again.
- **Blocking code:** a blocking call inside a coroutine stops the whole event loop, so three "concurrent" calls still take the sum of their times. Moving the call to a thread with `asyncio.to_thread` lets them overlap.

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

## Still to learn

- **The entry point of an async program.** How `if __name__ == "__main__"`, a regular `main()`, `asyncio.run(...)` and the async `run()` it drives fit together, and why `asyncio.run` is called exactly once. The printing and file-reading parts of the command-line tool were written with help, so this is the next thing to practise on my own.
