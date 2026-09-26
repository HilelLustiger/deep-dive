# Assignment 12 — Concurrent Bank (Python)

**Topics:** threads, race conditions, mutual exclusion with locks, deadlock and lock ordering, producer–consumer with a bounded queue, semaphores, the GIL, `ThreadPoolExecutor` and `ProcessPoolExecutor`

## Introduction

In this assignment you will build the core of a small bank that processes many operations at the same time: withdrawals, deposits and transfers between accounts.

When several **threads** run at once, they share the same memory. Two threads can read the same balance, both decide there is enough money, and both withdraw it. Each thread on its own is correct, but together they break the bank. This is a **race condition**, and it is the central problem of this assignment. The bug doesn't show up on every run, it doesn't raise an exception, and it's easy to miss in testing.

You will first write code that has these bugs, then write tests that catch them reliably, and only then fix them. Each part shows one classic concurrency problem and the standard tool that solves it.

The last part looks at Python specifically. Because of the **GIL**, Python threads don't run Python code in parallel. You will measure when threads help, when they don't, and when you need processes instead.

The assignment has eight parts. Do them in order, and write the tests for each part before moving to the next one.

Names given in **bold code** are required. Everything else is up to you.

### Making races show up in tests

Race conditions depend on timing, so a naive test may pass by luck. Two techniques make them appear reliably:

1. **Start all threads at the same moment.** A `threading.Barrier(n)` makes each thread wait at `barrier.wait()` until all `n` have arrived, then releases them together. You will write a helper for this in Part 1.
2. **Widen the gap.** A race happens between "check" and "act". Put a short `time.sleep(pause)` between them, where `pause` is a parameter. In production code `pause` is `0`. In tests you set it to something like `0.001` so that other threads get a chance to run in the gap. The bug is the same either way; the pause only makes it visible.

---

## Part 0 — Project setup

Set up the project in this folder:

- `requirements-dev.txt` with `pytest`.
- A `bank/` package for the code, and a `tests/` folder.

Everything else in this assignment uses the standard library: `threading`, `queue` and `concurrent.futures`.

---

## Part 1 — Running threads together

**File:** `bank/runner.py`

A `threading.Thread(target=func, args=(...))` runs `func` in a new thread once you call `.start()`. `.join()` waits until that thread has finished. A thread that isn't joined may still be running when your test checks the result.

Write **`run_concurrently(n, func, *args)`**:

- Creates `n` threads. Each one waits at a shared `threading.Barrier(n)` and then calls `func(*args)`.
- Starts all of them, then joins all of them.
- Returns a list of the `n` return values. If `func` raised an exception in a thread, the exception object goes in the list instead.

A thread can't return a value to the code that started it, so you need to collect results yourself, for example into a list where each thread writes to its own index.

### Test that:

- `run_concurrently(5, func)` calls `func` exactly five times, and returns five results.
- An exception raised inside a thread appears in the returned list, instead of being lost.
- Five calls of a function that sleeps 0.2 seconds take about 0.2 seconds in total, not 1 second.

---

## Part 2 — The race condition

**File:** `bank/account.py`

Write the class **`Account`**:

- **`Account(account_id, balance, pause=0)`**: `account_id` is an `int`. `pause` is the gap described in the introduction.
- **`balance`**: a read-only property.
- **`withdraw(amount)`**: if the balance is at least `amount`, sleeps `pause` seconds, then subtracts `amount`, and returns `True`. Otherwise returns `False`.
- **`deposit(amount)`**: reads the balance into a local variable, sleeps `pause` seconds, then writes back the local value plus `amount`.

Don't use any locks in this part. Write it the straightforward way.

Both methods contain a race:

- `withdraw` is **check-then-act**: between checking the balance and subtracting, another thread can withdraw too. Both checks pass, and the balance goes below zero.
- `deposit` is **read-modify-write**: two threads read the same old balance, each adds its amount, and the second write overwrites the first. One deposit is lost.

### Test that:

- Without concurrency, `withdraw` and `deposit` work correctly.
- An account with balance 100 and `pause=0.001`: 50 threads each withdrawing 10 at once leave a **negative** balance.
- An account with balance 0 and `pause=0.001`: 20 threads each depositing 10 at once leave a balance **below 200**.

These tests pass when the bug is present. That's intended: they prove the race exists. In Part 3 you will turn them around.

---

## Part 3 — Mutual exclusion

**File:** `bank/account.py`

A **lock** (also called a **mutex**) lets only one thread at a time run a section of code. The code between acquiring and releasing the lock is the **critical section**. Any other thread that tries to acquire the lock waits until it is released.

Write **`SafeAccount`**, with the same constructor and methods as `Account`, but each `withdraw` and `deposit` holds a `threading.Lock` for its whole check-then-act or read-modify-write sequence. Use `with self._lock:`, which releases the lock even if an exception is raised.

Also add a `lock` property that exposes the account's lock. You'll need it in Part 4.

### Test that:

- The same concurrent withdrawal as in Part 2 leaves the balance at exactly **0**, and exactly 10 withdrawals return `True`.
- The same concurrent deposit as in Part 2 leaves the balance at exactly **200**.

In `README.md`, explain why the lock has to cover the check **and** the update together, and not each one separately.

---

## Part 4 — Deadlock

**File:** `bank/transfer.py`

A transfer moves money from one account to another. Both balances must change together, so the transfer has to hold **both** accounts' locks at once.

The obvious way is to lock the source, then lock the destination. Now suppose thread 1 transfers from A to B while thread 2 transfers from B to A. Thread 1 holds A's lock and waits for B's. Thread 2 holds B's lock and waits for A's. Neither can continue, ever. This is a **deadlock**.

### 4a. The naive transfer

Write **`transfer_naive(src, dst, amount, pause=0, lock_timeout=1)`**:

- Acquires `src.lock`, sleeps `pause` seconds, then tries to acquire `dst.lock` with `dst.lock.acquire(timeout=lock_timeout)`.
- If the second lock can't be acquired in time, releases what it holds and raises `TimeoutError`. A real deadlock would hang forever, and so would your tests. The timeout lets you detect it instead.
- Otherwise moves the money and releases both locks.

### 4b. Lock ordering

The standard fix is to make every thread acquire locks in **the same global order**. If everyone locks the account with the lower `account_id` first, the circular wait can't happen.

Write **`transfer(src, dst, amount, pause=0)`**, which locks both accounts in order of `account_id`, then moves the money. It raises `ValueError` if `src` has less than `amount`, and moves nothing in that case.

Transfers work directly on the balances while holding both locks, so give `SafeAccount` whatever internal methods you need for that. Don't call `withdraw` and `deposit` from inside `transfer`, since they try to take a lock that's already held, and `threading.Lock` is not reentrant: a thread that tries to acquire a lock it already holds waits for itself forever.

### Test that:

- Two `transfer_naive` calls at once, A→B and B→A, with `pause=0.05` and `lock_timeout=0.5`, raise `TimeoutError`.
- The same pair with `transfer` completes, and the total of both balances is unchanged.
- 100 random transfers between 5 accounts, running at once, never deadlock, and the total money in the bank stays the same.

---

## Part 5 — Producer and consumer

**File:** `bank/processor.py`

Real systems rarely start a thread per request. Instead, **producers** put work into a **queue**, and a fixed number of **consumer** threads (workers) take work out and process it.

Python's `queue.Queue` is already thread-safe: it does its own locking. With `maxsize`, it is a **bounded buffer**. `put` blocks when the queue is full, so a fast producer can't use unlimited memory, and `get` blocks when it's empty, so idle workers wait without spinning.

Write the class **`TransactionProcessor`**:

- **`TransactionProcessor(bank, workers, queue_size)`**: `bank` is a dict from account ID to `SafeAccount`.
- **`start()`** starts `workers` worker threads. Each one repeatedly takes a transaction from the queue and applies it with `transfer`.
- **`submit(src_id, dst_id, amount)`** puts a transaction on the queue.
- **`shutdown()`** waits until every submitted transaction has been processed, stops all the workers, and joins them.
- **`failed`**: a read-only property with the number of transactions that failed with `ValueError`.

How do the workers know when to stop? A common way is a **sentinel**: `shutdown` puts one special value, such as `None`, on the queue for each worker, and a worker that receives it exits its loop. `Queue.task_done()` and `Queue.join()` let you wait until all items have been processed.

### Test that:

- 1,000 transactions submitted to a processor with 4 workers are all applied, and the total money is unchanged.
- Transactions that exceed the balance are counted in `failed` and don't change any balance.
- After `shutdown()`, all worker threads have finished (`thread.is_alive()` is `False`).
- With `queue_size=2` and workers that are slow, `submit` blocks rather than growing the queue. One way to check: `queue.qsize()` never goes above 2.

---

## Part 6 — Limiting access

**File:** `bank/fraud.py`

The bank calls an external fraud-check service before large transfers. The service's contract allows at most 3 requests at a time.

A lock allows one thread in. A **semaphore** allows up to *n*. `threading.Semaphore(n)` is a counter of free slots: `with semaphore:` takes a slot, waiting if none is free, and gives it back at the end.

Write the class **`FraudChecker`**:

- **`FraudChecker(max_concurrent, delay)`**: `delay` is how long one check takes, simulated with `time.sleep`.
- **`check(transaction)`**: holds a semaphore slot, sleeps `delay`, and returns `True`.
- **`peak`**: a read-only property with the highest number of checks that were ever running at the same moment.

Keeping `peak` correct requires shared state that several threads update. Protect it properly.

### Test that:

- 10 checks with `max_concurrent=3` and `delay=0.1`, run at once, give `peak == 3`, and take about 0.4 seconds (4 rounds).
- With `max_concurrent=10`, the same 10 checks take about 0.1 seconds.

---

## Part 7 — The GIL, threads and processes

**File:** `bank/workloads.py`

This part answers a question every Python developer is asked: when do threads make Python code faster?

In CPython, the **Global Interpreter Lock** (GIL) allows only one thread to run Python bytecode at a time. Threads still help with **I/O-bound** work: while a thread waits for the network or the disk, it releases the GIL and another thread runs. That's why Parts 1 and 6 got faster with threads. For **CPU-bound** work, pure Python computation, threads take turns on one core and give no speedup. To use several cores, you need several **processes**, each with its own interpreter and its own GIL.

`concurrent.futures` gives both a single interface: **`ThreadPoolExecutor`** and **`ProcessPoolExecutor`**. `executor.map(func, items)` runs `func` on every item using the pool and returns the results in order.

In `workloads.py`, write:

- **`io_task(seconds)`**: sleeps, then returns `seconds`. Stands in for a network call.
- **`cpu_task(n)`**: does pure-Python computation that takes about half a second, for example summing the squares of the numbers up to `n`, and returns the result. Choose `n` so it takes about that long on your machine.
- **`run_serial(func, items)`**, **`run_threads(func, items, workers)`** and **`run_processes(func, items, workers)`**: each runs `func` on every item and returns the list of results.

Functions sent to a `ProcessPoolExecutor` are pickled and sent to another process, so they must be defined at the top level of a module, not inside a test or another function.

### Test that:

- For 8 `io_task(0.2)` calls: threads are much faster than serial.
- For 4 `cpu_task` calls: threads are **not** meaningfully faster than serial.
- For the same 4 `cpu_task` calls: processes are meaningfully faster than serial (skip this test if `os.cpu_count()` is less than 2).
- All three runners return the same results in the same order.

Record the timings in `README.md`.

> **Note:** Python 3.13 introduced an optional free-threaded build without the GIL (`python3.13t`). It's still experimental, and most code you'll meet at work runs with the GIL. The rules above describe standard CPython.

---

## Wrap up

Complete `README.md` in this folder with short sections:

- **What I learned**: a few sentences.
- **Why the lock covers check and update together**: your answer from Part 3.
- **Threads or processes**: the timings from Part 7, and in your own words, when you'd use each.
- **A design decision**: one choice you made that the assignment didn't dictate, and why.

## Running the tests

From this folder, with the virtual environment active:

```
python -m pytest
```

## Done when

- [ ] Parts 0–7 are complete
- [ ] Every "Test that" item has a passing test
- [ ] The tests pass on several runs in a row, not just once
- [ ] `README.md` is completed
