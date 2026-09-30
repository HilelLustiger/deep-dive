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

## Reading

### Before you start

The goal here is to know the vocabulary and the shape of each problem before you write code, not to know the solution.

1. **[OSTEP, ch. 26 — Concurrency: An Introduction](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-intro.pdf)**, sections 26.1–26.6. Language-independent, with examples in C.
   What a thread is compared to a process: threads share one address space, and each has its own stack. Why the scheduler makes the order of execution unpredictable, and how that turns `counter = counter + 1` into a race condition. Also defines critical section, mutual exclusion and atomicity.
   *Parts 1–3.*
2. **[Real Python — An Intro to Threading in Python](https://realpython.com/intro-to-python-threading/)**
   The same ideas as the chapter above, shown with Python objects: `Thread`, `start()` and `join()`, daemon threads, `ThreadPoolExecutor`, a race condition fixed with `Lock`, deadlock, producer–consumer with `Queue`, and a short tour of `Semaphore`, `Timer` and `Barrier`.
   *Parts 1–6.*
3. **[OSTEP, ch. 32 — Common Concurrency Problems](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-bugs.pdf)**, section 32.3 "Deadlock Bugs" only.
   The four conditions a deadlock needs (mutual exclusion, hold-and-wait, no preemption, circular wait), and why making every thread take locks in one global order breaks the circular wait.
   *Part 4.*
4. **Python docs — `threading`**: [Thread Objects](https://docs.python.org/3/library/threading.html#thread-objects), [Lock Objects](https://docs.python.org/3/library/threading.html#lock-objects), [Semaphore Objects](https://docs.python.org/3/library/threading.html#semaphore-objects), [Barrier Objects](https://docs.python.org/3/library/threading.html#barrier-objects)
   The exact API: what `target` and `args` are, what `start()` and `join()` do, `acquire(timeout=...)` and what it returns, using a lock with `with`, and how a semaphore counts. Short, and worth having open while you work.
   *Parts 1, 3, 4 and 6.*
5. **[Real Python — Python Inner Functions: What Are They Good For?](https://realpython.com/inner-functions-what-are-they-good-for/)**
   A function defined inside another function, and how it can use the outer function's variables (a **closure**). This is how the function each thread runs reaches the results list.
   *Parts 1 and 5.*
6. **[Python tutorial — Handling Exceptions](https://docs.python.org/3/tutorial/errors.html#handling-exceptions)**
   `try`/`except`, and `except Exception as e` to keep the exception object and store it instead of letting it crash the thread.
   *Parts 1 and 4.*
7. **[Python docs — `queue`, Queue Objects](https://docs.python.org/3/library/queue.html#queue-objects)**
   What `maxsize` does, when `put` and `get` block, and how `task_done()` and `join()` work together.
   *Part 5.*
8. **[Real Python — Speed Up Your Python Program With Concurrency](https://realpython.com/python-concurrency/)**
   I/O-bound vs. CPU-bound work, what the GIL is, and why threads speed up the first but not the second while multiprocessing speeds up both. It also covers asyncio, which you already know from project 11. Compare it with threads.
   *Part 7.*
9. **[Python docs — `concurrent.futures`](https://docs.python.org/3/library/concurrent.futures.html#executor-objects)**: Executor Objects and ProcessPoolExecutor
   `Executor.map`, and the rules a function must follow to be sent to another process.
   *Part 7.*

### Going deeper

The sources this assignment is based on:

- **[The Little Book of Semaphores](https://greenteapress.com/wp/semaphores/)** by Allen B. Downey, ch. 1–4 (free PDF). Synchronization as a set of puzzles you solve with one tool, the semaphore. Useful sections: 3.4 Mutex (Part 3), 3.5 Multiplex (Part 6), 3.6 Barrier (how the `Barrier` you use in Part 1 can be built), 4.1 Producer-consumer (Part 5), and 4.4 Dining philosophers, the classic deadlock problem (Part 4).
- ***Fluent Python*, 2nd ed.** by Luciano Ramalho, ch. 19 "Concurrency Models in Python" and ch. 20 "Concurrent Executors" (not free). The same small program written with threads, processes and asyncio side by side, followed by `concurrent.futures` in depth.

Under the hood:

- **[OSTEP, ch. 4 — The Abstraction: The Process](https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-intro.pdf)**. A refresher on what a process is: its address space, its states, and what the OS keeps track of for it.
- **[OSTEP, ch. 28 — Locks](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-locks.pdf)**. How a lock is actually built. Plain loads and stores aren't enough, so it takes hardware instructions such as test-and-set and compare-and-swap, plus the choice between spinning and sleeping.
- **[OSTEP, ch. 30 — Condition Variables](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-cv.pdf)**. Building a bounded buffer yourself, which is roughly what `queue.Queue` does internally with `threading.Condition`. Also covers why the check must be in a `while` loop and not an `if`.
- **[OSTEP, ch. 31 — Semaphores](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-sema.pdf)**. The semaphore as a general primitive that can act as a lock, a signal or a counter. Section 31.7 "Thread Throttling" is exactly Part 6.
- **[OSTEP, ch. 32 — Common Concurrency Problems](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-bugs.pdf)**, section 32.2. The non-deadlock bugs, atomicity violations and order violations, which a study of real software found to be the most common concurrency bugs.
- **[OSTEP, ch. 27 — Thread API](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-api.pdf)**. The same concepts in C with pthreads. A preview of project 14.

Python-specific:

- **[Real Python — Python Thread Safety: Using a Lock and Other Techniques](https://realpython.com/python-thread-lock/)**. The rest of the `threading` toolbox: `RLock`, `Condition`, `Event` and more.
- **[David Beazley — Understanding the Python GIL](http://www.dabeaz.com/GIL/)** (PyCon 2010, slides and video). How the GIL is actually passed between threads, and why CPU-bound threads can be *slower* than serial code.
- **[Python docs — `sys.setswitchinterval`](https://docs.python.org/3/library/sys.html#sys.setswitchinterval)**. How often CPython asks a running thread to give up the GIL. This is why races show up at all without a `pause`.
- **[Python docs — `multiprocessing`, Contexts and start methods](https://docs.python.org/3/library/multiprocessing.html#contexts-and-start-methods)**. `spawn` vs. `fork`, and why functions have to be pickled. macOS uses `spawn` by default.
- **[Real Python — Bypassing the GIL for Parallel Processing in Python](https://realpython.com/python-parallel-processing/)**. Other ways around the GIL besides processes, such as C extensions that release it.
- **[PEP 703 — Making the Global Interpreter Lock Optional](https://peps.python.org/pep-0703/)** and the **[free-threading HOWTO](https://docs.python.org/3/howto/free-threading-python.html)**. Why the GIL exists, what removing it costs, and the state of the free-threaded build.

---

## Part 0 — Project setup

Set up the project in this folder:

- `requirements-dev.txt` with `pytest`.
- A `bank/` package for the code, and a `tests/` folder.

Everything else in this assignment uses the standard library: `threading`, `queue` and `concurrent.futures`.

---

## Part 1 — Running threads together

**File:** `bank/runner.py`

### What this function is for

To see a race condition, you need many threads calling the same method at the same moment, for example 50 threads each calling `account.withdraw(10)`. `run_concurrently` is the tool that does that. You write it now, and the tests in every later part use it:

```python
results = run_concurrently(50, account.withdraw, 10)
# account.withdraw(10) ran 50 times, in 50 threads, all starting together.
# results is a list of the 50 return values.
```

The parameters:

- **`n`**: how many threads to run.
- **`func`**: any function. `run_concurrently` doesn't know or care what it does; it only calls it. In this part's tests you pass small functions that you define in the test file. In later parts you pass methods like `account.withdraw`.
- **`*args`**: the arguments for `func`. Every thread calls `func(*args)` with the same arguments.

### Background: how a thread runs a function

`threading.Thread(target=f, args=(a, b))` creates a thread. Nothing runs yet. When you call `.start()`, the new thread calls `f(a, b)`. `.join()` makes the calling code wait until that thread has finished.

A thread has two limits that shape this function:

1. **It runs exactly one function**, the `target`. If you want a thread to do several steps (wait at the barrier, then call `func`, then save the result), write a function that does those steps, and make *that* function the `target`.
2. **Whatever the target returns is thrown away, and an exception it raises is printed and lost.** The code that started the thread never sees either one.

The standard way around both limits is a results list with one slot per thread, and a target function that writes into its own slot. Here is the pattern on an unrelated problem, squaring numbers in parallel:

```python
import threading

def square_all(numbers):
    results = [None] * len(numbers)          # one slot per thread

    def worker(index, number):               # the function each thread runs
        results[index] = number * number     # each thread writes only to its own slot

    threads = [threading.Thread(target=worker, args=(i, x))
               for i, x in enumerate(numbers)]
    for t in threads:
        t.start()                            # first start them all...
    for t in threads:
        t.join()                             # ...then wait for them all
    return results

square_all([2, 3, 4])                        # [4, 9, 16]
```

Three things to notice:

- `worker` is defined **inside** `square_all`, so it can use `results`. A function defined inside another function can read the outer function's variables. This is called a **closure**.
- Each thread gets its **index** through `args`, so it knows which slot is its own.
- `start` and `join` are in **two separate loops**. If one loop did `start()` then `join()` for each thread, each thread would finish before the next one started, and nothing would run at the same time.

### What to write

Write **`run_concurrently(n, func, *args)`**. It must:

1. Create one `threading.Barrier(n)` and a results list with `n` slots.
2. Create `n` threads. Each one runs a function that you define inside `run_concurrently`, which:
   1. calls `barrier.wait()`;
   2. calls `func(*args)`;
   3. stores the return value in its own slot. If `func` raised an exception, it catches it with `except Exception as e:` and stores the exception object `e` in its slot instead.
3. Starts all `n` threads, then joins all `n` threads, in two separate loops.
4. Returns the results list. Slot `i` holds the result of thread `i`.

Only the threads call `barrier.wait()`. `run_concurrently` itself must not. `Barrier(n)` releases when exactly `n` callers are waiting. If the main code called `wait()`, it would block right there, before starting the threads, and wait forever.

### Test that:

Write these in `tests/test_runner.py`. Define the small functions they need in the test file.

- `run_concurrently(5, func)` calls `func` exactly five times and returns a list of five results. To count the calls, have `func` append to a list defined in the test. `list.append` is safe to call from several threads at once in CPython.
- The arguments reach `func`: with a function that adds its two arguments, `run_concurrently(3, add, 2, 3)` returns `[5, 5, 5]`.
- An exception raised inside a thread appears in the returned list: with a function that raises `ValueError`, every item in the result is a `ValueError` (check with `isinstance`).
- Five calls of a function that sleeps 0.2 seconds take less than 0.5 seconds in total, not about 1 second. Measure with `time.perf_counter()` before and after the call.

---

## Part 2 — The race condition

**File:** `bank/account.py`

Write the class **`Account`**:

- **`Account(account_id, balance, pause=0)`**: `account_id` is an `int`. Store the balance in a private attribute, such as `self._balance`. `pause` is the gap described in the introduction; store it too.
- **`account_id`** and **`balance`**: read-only properties.
- **`withdraw(amount)`**, in this exact order:
  1. If the balance is less than `amount`, return `False`.
  2. Otherwise, `time.sleep(self._pause)`.
  3. Subtract `amount` from the balance.
  4. Return `True`.
- **`deposit(amount)`**, in this exact order:
  1. Read the balance into a local variable.
  2. `time.sleep(self._pause)`.
  3. Set the balance to that local variable plus `amount`.

Don't use any locks in this part.

Both methods contain a race:

- `withdraw` is **check-then-act**: between checking the balance (step 1) and subtracting (step 3), another thread can withdraw too. All of them pass the check, and the balance goes below zero.
- `deposit` is **read-modify-write**: two threads read the same old balance, each adds its amount, and the second write overwrites the first. One deposit is lost.

### Test that:

Write these in `tests/test_account.py`.

- Without threads, `withdraw` and `deposit` work correctly, and `withdraw` returns `False` when the balance is too low.
- An account with balance 100 and `pause=0.001`: `run_concurrently(50, account.withdraw, 10)` leaves a **negative** balance.
- An account with balance 0 and `pause=0.001`: `run_concurrently(20, account.deposit, 10)` leaves a balance **below 200**.

These tests pass because the bug is present. That's intended: they prove the race exists. In Part 3 you will write the fixed version.

---

## Part 3 — Mutual exclusion

**File:** `bank/account.py`

A **lock** (also called a **mutex**) lets only one thread at a time run a section of code. The code between acquiring and releasing the lock is the **critical section**. Any other thread that tries to acquire the lock waits until it is released.

Write the class **`SafeAccount`**, with the same constructor, properties and methods as `Account`. You can write it as a subclass of `Account` or as a separate class; your choice.

- In the constructor, create a lock: `self._lock = threading.Lock()`.
- In `withdraw` and `deposit`, put **all** the steps inside `with self._lock:`. `with` acquires the lock at the start of the block and releases it at the end, even if an exception is raised.
- Add a read-only property **`lock`** that returns the lock. Part 4 needs it.

### Test that:

Add these to `tests/test_account.py`.

- `run_concurrently(50, account.withdraw, 10)` on a `SafeAccount` with balance 100 and `pause=0.001` leaves the balance at exactly **0**, and exactly 10 of the results are `True` (`results.count(True) == 10`).
- `run_concurrently(20, account.deposit, 10)` on a `SafeAccount` with balance 0 and `pause=0.001` leaves the balance at exactly **200**.

In `README.md`, explain why the lock has to cover the check **and** the update together, and not each one separately.

---

## Part 4 — Deadlock

**File:** `bank/transfer.py`

A transfer moves money from one account to another. Both balances must change together, so the transfer has to hold **both** accounts' locks at once.

The obvious way is to lock the source, then lock the destination. Now suppose thread 1 transfers from A to B while thread 2 transfers from B to A. Thread 1 holds A's lock and waits for B's. Thread 2 holds B's lock and waits for A's. Neither can continue, ever. This is a **deadlock**.

### Before you start: changing a balance while holding the lock

A transfer can't call `src.withdraw()` and `dst.deposit()`, because those methods acquire the account's lock, and the transfer already holds it. `threading.Lock` is not reentrant: a thread that tries to acquire a lock it already holds waits for itself, forever.

So add two methods to `SafeAccount` that change the balance **without** taking the lock, for example `_debit(amount)` and `_credit(amount)`. The leading underscore says they are internal. Only code that already holds the account's lock may call them.

### 4a. The naive transfer

Write **`transfer_naive(src, dst, amount, pause=0, lock_timeout=1)`**, in this order:

1. Acquire `src.lock` with `src.lock.acquire()`.
2. `time.sleep(pause)`. This gives the other thread time to take its first lock, which is what makes the deadlock happen reliably in the test.
3. Try to acquire `dst.lock` with `dst.lock.acquire(timeout=lock_timeout)`. It returns `True` if it got the lock, and `False` if the time ran out.
4. If it returned `False`: release `src.lock` and raise `TimeoutError`. A real deadlock would hang forever, and so would your tests. The timeout lets you detect it instead.
5. Otherwise, move the money with `_debit` and `_credit`, and release both locks. Use `try`/`finally` so the locks are released even if something fails.

`transfer_naive` doesn't need to check the balance.

### 4b. Lock ordering

The standard fix is to make every thread acquire locks in **the same global order**. If everyone locks the account with the lower `account_id` first, the circular wait can't happen: a thread holding A's lock and a thread holding B's lock can't each be waiting for the other.

Write **`transfer(src, dst, amount, pause=0)`**:

1. If `src` and `dst` are the same account, raise `ValueError`. Locking the same lock twice would deadlock on its own.
2. Of the two accounts, call the one with the lower `account_id` `first` and the other one `second`.
3. Acquire `first.lock`, `time.sleep(pause)`, then acquire `second.lock`. Use nested `with` blocks.
4. While holding both: if `src` has less than `amount`, raise `ValueError` and change nothing. Otherwise, move the money with `_debit` and `_credit`.

### Test that:

Write these in `tests/test_transfer.py`.

- **The naive transfer deadlocks.** `run_concurrently` can't run this test, because the two threads need different arguments (A→B and B→A). Create the two threads yourself: each one runs a small function that calls `transfer_naive` with `pause=0.05` and `lock_timeout=0.5`, and appends any exception it catches to a shared list. Start both, join both, and check that the list contains **at least one** `TimeoutError`. Only one is guaranteed: after one thread times out and releases its lock, the other can get it and complete.
- **Lock ordering fixes it.** The same two threads calling `transfer` instead complete without any exception, and the total of both balances is unchanged.
- **Many random transfers.** Create 5 `SafeAccount`s with 1,000 each. Write a function with no arguments that picks two *different* random accounts and a random amount, and calls `transfer`, ignoring `ValueError`. Run it with `run_concurrently(100, that_function)`. The total money in the bank must still be 5,000. If there is a deadlock, this test will hang instead of failing. That's acceptable here: a test that hangs means a deadlock.

---

## Part 5 — Producer and consumer

**File:** `bank/processor.py`

Real systems rarely start a thread per request. Instead, **producers** put work into a **queue**, and a fixed number of **consumer** threads (workers) take work out and process it.

Python's `queue.Queue` is already thread-safe: it does its own locking. With `maxsize`, it is a **bounded buffer**. `put` blocks when the queue is full, so a fast producer can't use unlimited memory, and `get` blocks when it's empty, so idle workers wait without using the CPU.

Write the class **`TransactionProcessor`**:

- **`TransactionProcessor(bank, workers, queue_size, pause=0)`**:
  - `bank` is a dict from account ID to `SafeAccount`.
  - `workers` is the number of worker threads.
  - `queue_size` is the `maxsize` of the queue.
  - `pause` is passed to every `transfer` call. Tests use it to make the workers slow.
  - Store the queue in a public attribute **`queue`**, and the worker threads, once created, in a list attribute **`threads`**. The tests use both.
- **`submit(src_id, dst_id, amount)`** puts the tuple `(src_id, dst_id, amount)` on the queue. When the queue is full, `put` blocks until there's room.
- **`start()`** creates and starts `workers` threads. Each one runs a loop:
  1. Take an item from the queue with `get()`.
  2. If the item is the sentinel `None` (see below), call `task_done()` and exit the loop.
  3. Otherwise, apply it with `transfer(bank[src_id], bank[dst_id], amount, pause)`. If `transfer` raises `ValueError`, count it as failed.
  4. Call `task_done()` for the item, whether the transfer succeeded or failed.
- **`shutdown()`** stops the processor, in this order:
  1. `queue.join()`: blocks until `task_done()` has been called for every item that was put on the queue.
  2. Put one `None` on the queue for each worker. A worker that gets `None` exits its loop. This is called a **sentinel**.
  3. Join all the worker threads.
- **`failed`**: a read-only property with the number of transactions that failed with `ValueError`.

Several workers increment the failed count, so updating it is a read-modify-write race, exactly like `deposit` in Part 2. Protect it with a lock.

### Test that:

Write these in `tests/test_processor.py`.

- 1,000 random transactions between 5 accounts, submitted to a processor with 4 workers and then `shutdown()`, leave the total money unchanged.
- Transactions larger than the source's balance are counted in `failed`, and the balances stay exactly as they were.
- After `shutdown()`, every thread in `processor.threads` has finished (`thread.is_alive()` is `False`).
- **`submit` blocks when the queue is full.** A processor with `workers=1`, `queue_size=2` and `pause=0.2`: submitting 10 transactions takes **at least 1 second**, because `submit` has to wait for the slow worker to make room. Without the bound, all 10 would be submitted almost instantly.

---

## Part 6 — Limiting access

**File:** `bank/fraud.py`

The bank calls an external fraud-check service before large transfers. The service's contract allows at most 3 requests at a time.

A lock allows one thread in. A **semaphore** allows up to *n*. `threading.Semaphore(n)` is a counter of free slots: `with semaphore:` takes a slot, waiting if none is free, and gives it back at the end of the block.

Write the class **`FraudChecker`**:

- **`FraudChecker(max_concurrent, delay)`**: creates a `threading.Semaphore(max_concurrent)`. `delay` is how long one check takes.
- **`check(transaction)`**: `transaction` can be any value. The checker ignores it; it's there so the method looks like a real API. Inside `with self._semaphore:`:
  1. Add 1 to a counter of checks running right now, and if that counter is higher than `peak`, update `peak`.
  2. `time.sleep(delay)`, which stands in for the call to the service.
  3. Subtract 1 from the running counter.

  Then return `True`.
- **`peak`**: a read-only property with the highest number of checks that were ever running at the same moment.

The semaphore and the counter need **different** tools. The semaphore limits how many threads are inside at once, but with `max_concurrent=3`, three threads update the counter at the same time, a read-modify-write race again. Protect the counter and `peak` with a separate `threading.Lock`.

### Test that:

Write these in `tests/test_fraud.py`.

- `run_concurrently(10, checker.check, None)` with `max_concurrent=3` and `delay=0.1`: `checker.peak == 3`, and the call takes between 0.35 and 0.6 seconds (4 rounds of 0.1 seconds: 3 + 3 + 3 + 1).
- The same with `max_concurrent=10` takes less than 0.2 seconds.

---

## Part 7 — The GIL, threads and processes

**File:** `bank/workloads.py`

This part answers a question every Python developer is asked: when do threads make Python code faster?

In CPython, the **Global Interpreter Lock** (GIL) allows only one thread to run Python bytecode at a time. Threads still help with **I/O-bound** work: while a thread waits for the network or the disk, it releases the GIL and another thread runs. That's why Parts 1 and 6 got faster with threads. For **CPU-bound** work, pure Python computation, threads take turns on one core and give no speedup. To use several cores, you need several **processes**, each with its own interpreter and its own GIL.

`concurrent.futures` gives both a single interface: **`ThreadPoolExecutor`** and **`ProcessPoolExecutor`**. `executor.map(func, items)` runs `func` on every item using the pool, and returns the results in the same order as `items`. It returns an iterator, so wrap it in `list(...)`.

In `workloads.py`, write:

- **`io_task(seconds)`**: `time.sleep(seconds)`, then returns `seconds`. Stands in for a network call.
- **`cpu_task(n)`**: sums the squares of the numbers from 0 to `n` with plain Python (a loop or `sum` over a generator, no libraries), and returns the sum.
- **`CPU_N`**: a module constant, the `n` for which `cpu_task` takes about half a second on your machine. Find it by timing `cpu_task` with a few values of `n` in the Python shell.
- **`run_serial(func, items)`**: calls `func` on each item in turn, in a normal loop. Returns the list of results.
- **`run_threads(func, items, workers)`**: the same, using `ThreadPoolExecutor(max_workers=workers)` and `executor.map`.
- **`run_processes(func, items, workers)`**: the same, using `ProcessPoolExecutor(max_workers=workers)`.

A `ProcessPoolExecutor` sends the function to another process by **pickling** it: it sends its name and module, and the other process imports it. So the function must be defined at the top level of a module. Always pass `io_task` and `cpu_task` from `bank.workloads`, never a function defined inside a test or a `lambda`.

On macOS, each new process starts a fresh Python interpreter and re-imports the main script (the `spawn` start method). Under pytest this just works. But if you try `run_processes` from your own script, put the call under `if __name__ == "__main__":`. Otherwise every new process runs your script again. Code piped into `python -` fails with `BrokenProcessPool`, because the new processes can't re-import it.

### Test that:

Write these in `tests/test_workloads.py`. Time each run with `time.perf_counter()`.

- **I/O, threads help:** for 8 calls of `io_task(0.2)`, `run_threads` with 8 workers takes less than **half** the time of `run_serial`.
- **CPU, threads don't help:** for 4 calls of `cpu_task(CPU_N)`, `run_threads` with 4 workers takes at least **0.8 times** the time of `run_serial`.
- **CPU, processes help:** for the same 4 calls, `run_processes` with 4 workers takes less than **0.75 times** the time of `run_serial`. Skip this test if `os.cpu_count()` is less than 2 (`pytest.mark.skipif`).
- All three runners return the same results, in the same order.

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
