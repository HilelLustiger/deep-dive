# Assignment 11 — Async Site Checker (Python)

**Topics:** coroutines, the event loop, tasks, `gather` vs. `TaskGroup`, timeouts and cancellation, `as_completed` and `wait`, async context managers, async generators, limiting concurrency, blocking code in async programs

## Introduction

In this assignment you will build a command-line tool that checks whether a list of websites is up. For each URL it reports the HTTP status code and how long the response took, or the error if the request failed.

Checking 50 sites one after another means waiting for each response before sending the next request. Most of that time the program does nothing: it just waits for the network. **Asynchronous programming** lets one thread send all the requests, and handle each response when it arrives. With `asyncio`, checking 50 sites takes about as long as the slowest one, not the sum of all of them.

You will build the checker step by step. Each part adds one asyncio tool, and the tests measure what it actually changes. By the end you will have used the tools you'll meet in real Python code: `asyncio.run`, tasks, `TaskGroup`, `asyncio.timeout`, `Semaphore` and `asyncio.to_thread`.

The assignment has eight parts. Do them in order, and write the tests for each part before moving to the next one.

Names given in **bold code** are required. Everything else is up to you.

### How the tests work

Tests that depend on real websites are slow and unreliable. Instead, `tests/conftest.py` (provided) starts a small local web server for each test and passes its address to the test. It has three routes:

- `/ok`: responds `200` immediately.
- `/slow/{seconds}`: waits the given number of seconds, then responds `200`.
- `/status/{code}`: responds immediately with the given status code, for example `/status/500`.

Use this server in all tests from Part 2 on. Tests that check timing should allow some slack. For example, "three 1-second requests at once finish in under 1.5 seconds".

---

## Part 0 — Project setup

Set up the project in this folder:

- `requirements-dev.txt` with `aiohttp`, `pytest` and `pytest-asyncio`.
- A `checker/` package for the code, and a `tests/` folder.
- A `pytest.ini` with `asyncio_mode = auto`, so that `async def test_...` functions run without extra decorators.

Python 3.11 or newer is required. `TaskGroup` and `asyncio.timeout` were added in 3.11.

---

## Part 1 — Coroutines and tasks

**File:** `checker/basics.py`

Before touching the network, get a feel for how asyncio runs code.

A function defined with **`async def`** is a **coroutine function**. Calling it does not run it. It returns a *coroutine object*, which runs only when something `await`s it. `await` also marks the points where the function may pause and let other code run.

Awaiting coroutines one after another still runs them one after another. To run them at the same time, you wrap each one in a **task** with `asyncio.create_task()`. The event loop then runs all the tasks, switching between them whenever one is waiting.

Write:

- **`async def delayed(value, seconds)`**: waits `seconds` using `asyncio.sleep`, then returns `value`.
- **`async_timed`**: a decorator for coroutine functions. It measures how long the call took and stores it in an attribute on the wrapper, `last_elapsed`, in seconds. The wrapper itself must be an `async def`.
- **`async def run_one_by_one(seconds_list)`**: awaits `delayed` for each value, one after the other, and returns the list of results.
- **`async def run_as_tasks(seconds_list)`**: creates a task for each value first, then awaits all of them, and returns the list of results.

Decorate both `run_...` functions with `@async_timed`.

### Test that:

- Calling `delayed(1, 0)` without `await` returns a coroutine object, not `1`.
- `await delayed("x", 0)` returns `"x"`.
- `run_one_by_one([0.2, 0.2, 0.2])` takes about 0.6 seconds, and `run_as_tasks` with the same input takes about 0.2 seconds.

---

## Part 2 — Checking one URL

**Files:** `checker/models.py`, `checker/fetch.py`

This part practices **async context managers** and **timeouts**.

### 2a. The result

In `models.py`, write a dataclass **`CheckResult`** with these fields:

- **`url`**: `str`
- **`status`**: `int | None`, the HTTP status code, or `None` if no response arrived
- **`elapsed`**: `float`, seconds
- **`error`**: `str | None`, a short description of what went wrong, or `None`

Add a property **`ok`** that is `True` when a response arrived with a status code below 400.

### 2b. The request

In `fetch.py`, write **`async def check_url(session, url, timeout)`**.

- `session` is an `aiohttp.ClientSession`. Creating one session and sharing it between all requests is how aiohttp is meant to be used, because the session reuses connections.
- Send a GET request with `async with session.get(url) as response:`. This is an **async context manager**: like a normal `with`, it guarantees the connection is released at the end, but opening and closing it can await.
- Limit the whole request to `timeout` seconds using **`async with asyncio.timeout(timeout):`**. When the time runs out, asyncio cancels the request and raises `TimeoutError`.
- Always return a `CheckResult`. A timeout or a connection error is a normal outcome for a site checker, not a crash: catch `TimeoutError` and `aiohttp.ClientError`, and put a description in `error`.
- One exception: if `url` doesn't start with `http://` or `https://`, raise `ValueError` before sending anything. A malformed URL is a mistake in the input, not a site that is down.

### Test that:

- `/ok` returns a result with status 200 and `ok == True`.
- `/status/500` returns status 500 and `ok == False`.
- `/slow/2` with a timeout of 0.5 returns an error, `status is None`, and takes about 0.5 seconds, not 2.
- A URL like `"ftp://example.com"` raises `ValueError`.

---

## Part 3 — Checking many URLs

**File:** `checker/runner.py`

This part compares three ways of running many requests: one by one, `gather`, and `TaskGroup`.

Write three functions. Each takes `(urls, timeout)`, opens one `ClientSession` for all requests, and returns a list of `CheckResult` in the same order as `urls`.

- **`check_sequential`**: awaits `check_url` for each URL in turn. This is the baseline.
- **`check_with_gather`**: runs all checks at once with **`asyncio.gather`**.
- **`check_with_taskgroup`**: runs all checks at once inside **`async with asyncio.TaskGroup() as tg:`**, creating each task with `tg.create_task(...)`.

`gather` and `TaskGroup` both run tasks concurrently. The difference shows up when one of them fails:

- **`gather`**: the first exception is raised to the caller, but the other tasks **keep running** in the background. With `return_exceptions=True`, exceptions are returned in the results list instead of raised.
- **`TaskGroup`**: when one task fails, the group **cancels all the others**, waits for them to stop, and raises an `ExceptionGroup` containing the failure. You catch it with `except* ValueError:`. Nothing is left running.

`TaskGroup` was added in Python 3.11, and it is the recommended way in new code. You will see both in real projects.

To make a check fail, include a malformed URL: `check_url` raises `ValueError` for it.

### Test that:

- For three `/slow/1` URLs, `check_sequential` takes about 3 seconds, and the other two take about 1 second.
- The results of all three functions are in the same order as the input URLs.
- With a malformed URL in the list, `check_with_taskgroup` raises an `ExceptionGroup` that contains a `ValueError`.
- With a malformed URL in the list, `check_with_gather` raises `ValueError`.

In `README.md`, explain in your own words when you would choose `gather` with `return_exceptions=True` over `TaskGroup`.

---

## Part 4 — Results as they arrive

**File:** `checker/runner.py`

This part practices **`asyncio.as_completed`** and **async generators**.

`gather` and `TaskGroup` return only when every request is done. For a checker that shows results on screen, it's better to show each one as soon as it's ready, so fast sites appear right away and slow ones appear later.

Write **`async def check_as_completed(urls, timeout)`** as an **async generator**: an `async def` function that uses `yield`. It yields each `CheckResult` as soon as that request finishes. Use `asyncio.as_completed` to get the results in completion order.

The caller consumes it with `async for`:

```python
async for result in check_as_completed(urls, timeout=5):
    print(result)
```

### Test that:

- For URLs `/slow/1`, `/ok`, `/slow/0.5`, results arrive in the order `/ok`, `/slow/0.5`, `/slow/1`.
- The first result arrives almost immediately, not after the slowest request finished.

---

## Part 5 — A deadline for the whole run

**File:** `checker/runner.py`

This part practices **`asyncio.wait`** and **cancellation**.

Sometimes you have a budget for the whole run: "check what you can in 2 seconds, and tell me which ones didn't answer in time". A per-request timeout doesn't express that. `asyncio.wait` does: given a set of tasks and a `timeout`, it returns two sets, the tasks that finished (`done`) and those still running (`pending`).

`asyncio.wait` doesn't stop the pending tasks. They keep running until you cancel them. Forgetting to cancel is a common source of leaked work.

Write **`async def check_with_deadline(urls, timeout, deadline)`**. It returns a tuple `(results, unfinished)`:

- `results`: `CheckResult` for every URL that finished within `deadline` seconds
- `unfinished`: the list of URLs that didn't

Before returning, cancel every unfinished task, and wait for the cancellations to complete.

To know which URL each unfinished task belonged to, keep a mapping from task to URL when you create the tasks.

### Test that:

- With `/ok`, `/slow/0.2` and `/slow/3`, and `deadline=1`, `results` contains the first two, `unfinished` contains the third, and the call returns after about 1 second.
- After the call, the unfinished task is cancelled (`task.cancelled()` is `True`). To check this, you may need to return or expose the tasks. Your choice.

---

## Part 6 — Limiting concurrency

**File:** `checker/runner.py`

This part practices **`asyncio.Semaphore`**.

Firing thousands of requests at once can overload the target servers, hit rate limits, or exhaust your machine's open connections. Real code usually caps how many requests run at the same time.

A **semaphore** is a counter of available slots. `async with semaphore:` takes a slot, waiting if none is free, and gives it back at the end of the block.

Write **`async def check_limited(urls, timeout, max_concurrent)`**. It works like `check_with_taskgroup`, but no more than `max_concurrent` requests run at the same time.

### Test that:

- Four `/slow/0.5` URLs with `max_concurrent=2` take about 1 second: two batches of two.
- The same four URLs with `max_concurrent=4` take about 0.5 seconds.

---

## Part 7 — Blocking code

**File:** `checker/blocking.py`

This part practices the most common asyncio bug, and its fix.

asyncio runs everything on **one thread**. Tasks take turns: a task runs until it hits an `await` that has to wait, and only then can another task run. A function that blocks without awaiting, like `time.sleep`, reading a large file, or a slow computation, stops **every** task until it finishes. Nothing in Python warns you when this happens. The program just becomes slow.

The fix is **`asyncio.to_thread(func, *args)`**. It runs a regular blocking function in a separate thread and gives you something to await, so the event loop stays free.

In `blocking.py`, write:

- **`def slow_lookup(seconds)`**: a regular function, not `async`, that calls `time.sleep(seconds)` and returns `seconds`. It stands in for any blocking library call.
- **`async def lookup_blocking(seconds)`**: calls `slow_lookup` directly.
- **`async def lookup_in_thread(seconds)`**: calls `slow_lookup` through `asyncio.to_thread`.

### Test that:

- Three `lookup_blocking(0.3)` calls run with `gather` take about 0.9 seconds. Even though they are tasks, they don't overlap.
- Three `lookup_in_thread(0.3)` calls run with `gather` take about 0.3 seconds.

---

## Part 8 — The command-line tool

**File:** `checker/__main__.py`

Put it all together. Running:

```
python -m checker urls.txt --timeout 5 --max-concurrent 10
```

reads one URL per line from the file, checks them all, and prints one line per result **as it arrives**. For example:

```
✓ 200  0.12s  https://www.python.org
✗ 503  0.40s  https://example.com/down
✗ ---  5.00s  https://slow.example.com  (timeout)
```

At the end, print a summary line, for example `12 up, 2 down, 1 timed out in 5.03s`.

- The program's entry point is a regular function that calls **`asyncio.run(...)`** once. `asyncio.run` creates the event loop, runs your main coroutine, and closes the loop. Real programs call it exactly once, at the top.
- Combine what you built: results as they arrive (Part 4) and a concurrency limit (Part 6). How you combine them is up to you.
- Use `argparse` for the command-line options.

There are no required tests for this part. Run it on a real list of sites and check the output makes sense.

---

## Wrap up

Complete `README.md` in this folder with short sections:

- **What I learned**: a few sentences.
- **`gather` vs. `TaskGroup`**: your answer from Part 3.
- **A design decision**: one choice you made that the assignment didn't dictate, and why.
- **Measured results**: the timings from your tests. Sequential vs. concurrent, and blocking vs. `to_thread`.

## Running the tests

From this folder, with the virtual environment active:

```
python -m pytest
```

## Done when

- [ ] Parts 0–8 are complete
- [ ] Every "Test that" item has a passing test
- [ ] `python -m checker` works on a real list of URLs
- [ ] `README.md` is completed
