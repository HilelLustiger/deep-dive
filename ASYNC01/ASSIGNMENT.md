# Assignment ASYNC01 — Promise Chain (TypeScript)

**Topics:** callbacks and promisification, promise states and fates, the executor, `then` and chaining, error propagation, microtasks vs. tasks, the Promise Resolution Procedure and thenables, the Promises/A+ specification, `catch` and `finally`, `Promise.all`, `allSettled`, `race` and `any`, `AggregateError`, async/await built from generators, unhandled rejections

## Introduction

In this assignment you will build a **Promise** from scratch: a class `MyPromise<T>` that behaves like the built-in `Promise`, and passes the same official test suite that real promise libraries are checked against.

A promise is an object that stands for a result that isn't there yet. The code that starts some work returns a promise right away, and the code that needs the result asks the promise to call it back when the result arrives. Before promises, JavaScript passed callbacks directly into each asynchronous function. That works for one step, but for several steps in a row it nests one callback inside another, every step has to check for errors itself, and nothing stops a buggy function from calling your callback twice, or never. A promise fixes this with a small set of strict rules:

- A promise settles **once**. It goes from *pending* to either *fulfilled* with a value, or *rejected* with a reason, and never changes again.
- Callbacks always run **asynchronously**, after the code that registered them has finished, even if the promise was already settled.
- `then` returns a **new promise**, so steps form a chain, and an error thrown anywhere in the chain skips the remaining steps until something handles it. This is **error propagation**, and it's what makes `try`/`catch` work with `await`.

These rules are written down precisely in the **Promises/A+ specification**, a two-page document that every JavaScript promise follows, the built-in one included. You will implement it rule by rule, then run its **compliance suite** of 872 tests against your class.

On top of your promise you will then build the rest of what JavaScript offers: `catch`, `finally`, the four combinators (`all`, `allSettled`, `race`, `any`), and **async/await itself**. An `async` function is a generator driven by promises, and you will write the driver. Last, you will make your promise report rejections that nobody handles, the way Node does.

You know the ideas behind async code from ASYNC02 in Python. The difference to keep in mind: Python's `await` works on coroutines, futures and tasks, and the event loop is something you start with `asyncio.run`. In JavaScript, `await` works on any object with a `then` method, and the event loop is already running when your file starts.

The assignment has nine parts, 0 to 8. Do them in order, and write the tests for each part before moving to the next one.

Names given in **bold code** are required, because the tests, the compliance suite and later parts use them. Everything else is up to you.

### Learning outcomes

By the end of this assignment you can:

1. Wrap a callback-based function in a promise, and explain what promises guarantee that callbacks don't.
2. Explain the three states of a promise, and the difference between *resolved* and *fulfilled*.
3. Explain the difference between a microtask and a task, and predict the order in which promise callbacks and timers run.
4. Implement `then` so that values and errors travel through a chain, and say what happens at each step when a callback is missing, returns a value, returns a promise or throws.
5. Implement the Promise Resolution Procedure, and explain why any object with a `then` method can be awaited.
6. Implement `all`, `allSettled`, `race` and `any`, including what each does with an empty input.
7. Explain how `async`/`await` is built from generators and promises, by implementing it.
8. Explain when a rejection counts as unhandled, and why the report is about the end of the chain.

### Conventions

- **`src/my-promise.ts` never uses the built-in `Promise`.** Not `new Promise`, not `Promise.resolve`, not `async` functions or `await`, which create built-in promises. The point is to build every part yourself. Tests and test helpers may use the built-in `Promise` freely.
- **Callbacks are scheduled with `queueMicrotask`.** It's a global function in Node that runs a function as a microtask. Part 2 explains what that means.
- **Reasons are `unknown`.** Anything can be thrown or used to reject a promise, not only `Error` objects, so a rejection reason has the type `unknown` (or `any` where TypeScript's own declarations use it).

### Test helpers

Promise callbacks run later, so a test has to wait before it checks what happened. Copy this file as it is to `tests/helpers.ts`. It's a test utility, not part of the assignment:

```ts
// Resolves after every microtask queued so far, and every microtask those queue, has run.
// A setTimeout callback is a task, and the event loop runs a task only when the microtask queue is empty.
export function nextTask(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
}

// Waits the given number of milliseconds.
export function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
```

A typical test registers callbacks that record what they see, then waits, then checks the record:

```ts
const log: string[] = [];
somePromise.then(value => { log.push(value); });
await nextTask();
expect(log).toEqual(["expected value"]);
```

Vitest can also wait for a promise directly, and this works on `MyPromise` once `then` returns a promise (Part 3): `await expect(p).resolves.toBe(1)` and `await expect(p).rejects.toThrow("message")`.

---

## Reading

### Before you start

The goal here is to know the vocabulary and the shape of each problem before you write code, not to know the solution.

1. **[javascript.info — Promises, async/await](https://javascript.info/async)**, the articles [Introduction: callbacks](https://javascript.info/callbacks), [Promise](https://javascript.info/promise-basics), [Promises chaining](https://javascript.info/promise-chaining) and [Error handling with promises](https://javascript.info/promise-error-handling).
   The built-in `Promise` from the user's side: the problem with nested callbacks, the executor, `resolve` and `reject`, what `then` returns, and how an error skips steps until a `catch`. This is the behavior you will reproduce.
   *Parts 1–3.*
2. **[javascript.info — Promisification](https://javascript.info/promisify)**
   How to turn a function that takes a callback into one that returns a promise.
   *Part 1.*
3. **[Promises/A+](https://promisesaplus.com/)**
   The main reading, and short. Section 1 defines the terms, 2.1 the three states, 2.2 the `then` method and 2.3 the Promise Resolution Procedure. Read it before Part 2, and keep it open: Parts 2–4 implement it rule by rule, and the parts refer to its rule numbers (2.2.4, 2.3.1, …).
   *Parts 2–4.*
4. **[Domenic Denicola — States and Fates](https://github.com/domenic/promises-unwrapping/blob/master/docs/states-and-fates.md)**
   One page that separates two words people mix up: *fulfilled* (a state) and *resolved* (a fate). A promise resolved with another promise is resolved but still pending.
   *Parts 2 and 4.*
5. **[javascript.info — Microtasks](https://javascript.info/microtask-queue)**
   Why `then` callbacks always run after the current code, what the microtask queue is, and the section "Unhandled rejection", which is Part 8.
   *Parts 2 and 8.*
6. **[MDN — `Promise`, the section "Thenables"](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise#thenables)**
   Why the language treats any object with a `then` method as a promise, and what that's for.
   *Part 4.*
7. **[javascript.info — Promise API](https://javascript.info/promise-api)**
   `Promise.all`, `allSettled`, `race`, `any`, `resolve` and `reject`, with what each returns.
   *Parts 5 and 6.*
8. **[You Don't Know JS: Async & Performance, ch. 4 "Generators"](https://github.com/getify/You-Dont-Know-JS/blob/1st-ed/async%20%26%20performance/ch4.md)** by Kyle Simpson (1st edition, free), the section "Generators + Promises", up to and including "Promise-Aware Generator Runner". And **[javascript.info — Async/await](https://javascript.info/async-await)**, including the section "await accepts thenables".
   How a generator that yields promises, plus a small function that drives it, is exactly an `async` function. You met generators in DS03.
   *Part 7.*
9. **[Node.js docs — `process`, the `'unhandledRejection'` event](https://nodejs.org/api/process.html#event-unhandledrejection)**
   What Node does with a rejected promise that has no handler "within a turn of the event loop".
   *Part 8.*

### Going deeper

The sources this assignment is based on:

- **[Promises/A+](https://promisesaplus.com/)** and its **[compliance test suite](https://github.com/promises-aplus/promises-tests)**. The suite's tests are readable, one file per rule, and show the corner cases each rule is about.
- **[You Don't Know JS: Async & Performance, ch. 3 "Promises"](https://github.com/getify/You-Dont-Know-JS/blob/1st-ed/async%20%26%20performance/ch3.md)**. The sections "Thenable Duck Typing" and "Promise Trust" explain what each rule protects against: callbacks called too early, too late, too many times, or errors swallowed.
- **[javascript.info — Promises, async/await](https://javascript.info/async)**, the whole chapter.

How the language defines it:

- **[ECMAScript — 27.5 Promise Objects](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise-objects)**. The built-in `Promise`, step by step. Compare **27.5.2.2 NewPromiseResolveThenableJob** with your Part 4, and **27.5.1.9 HostPromiseRejectionTracker** with your Part 8. Section numbers are from the current draft and move between editions.
- **[V8 blog — Faster async functions and promises](https://v8.dev/blog/fast-async)** (2018). What `await` does under the hood, in microtask ticks, and why it used to take three of them.

The event loop:

- **[Jake Archibald — Tasks, microtasks, queues and schedules](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/)**. Tasks and microtasks with animated, step-by-step examples. Written for browsers, but the promise and `setTimeout` parts are the same in Node.
- **[MDN — Using microtasks in JavaScript with queueMicrotask()](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide)**. The function you use in Part 2, and when to use it outside a promise library.
- **[Node.js — The Node.js Event Loop](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)**. The phases of Node's loop: timers, poll, check, and where `process.nextTick` fits.
- **[MDN — Using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)**, the sections [Timing](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises#timing) and [Promise rejection events](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises#promise_rejection_events).

---

## Part 0 — Project setup

Set up a TypeScript project in this folder, the same way as in DS03:

- `package.json` with `typescript`, `vitest` and `promises-aplus-tests` as dev dependencies. The last one is the compliance suite, used from Part 4.
- `tsconfig.json` with `"strict": true` and `"target": "ES2022"`, covering both `src/` and `tests/`. The target matters: `AggregateError` (Part 6) and top-level `await` (the compile-error checks) need ES2021 or later.
- Two folders: `src/` for the code and `tests/` for the tests.
- `tests/helpers.ts`, copied from **Test helpers** above.

Check that `npx tsc --noEmit` and `npx vitest run` both run.

---

## Part 1 — The built-in Promise

**File:** `src/callbacks.ts`

Before building a promise, use the real one, and turn a callback-based function into a promise-based one.

A promise is created with `new Promise(executor)`. The **executor** is a function you write, and the constructor calls it **right away**, passing it two functions: `resolve`, to call with the value when the work succeeds, and `reject`, to call with the reason when it fails. On an unrelated example:

```ts
function readFirstLine(text: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const line = text.split("\n")[0];
        if (line === "") {
            reject(new Error("empty text"));
        } else {
            resolve(line);
        }
    });
}

readFirstLine("hello\nworld").then(line => console.log(line)); // hello
```

Node's older APIs take a callback as their **last** argument, and call it with an error first and the result second: `callback(error, result)`. When there is no error, `error` is `null`. This is called an *error-first callback*:

```ts
export type Callback<R> = (error: Error | null, result?: R) => void;
```

Write:

- **`type Callback<R>`**: as above. Export it.
- **`delay(ms): Promise<void>`**: resolves after `ms` milliseconds. Use `setTimeout`.
- **`promisify(fn)`**: takes a function whose last parameter is a `Callback<R>`, and returns a function that takes the other arguments and returns a `Promise<R>`. The new function calls `fn` with its arguments plus a callback of its own. That callback rejects the promise if it gets an error, and resolves it with the result otherwise.

  The type is the hard part, so here it is:

  ```ts
  export function promisify<A extends unknown[], R>(
      fn: (...args: [...A, Callback<R>]) => void,
  ): (...args: A) => Promise<R>
  ```

  `[...A, Callback<R>]` is a tuple type: "the arguments `A`, followed by one callback". TypeScript works out `A` and `R` from the function you pass in. Node has the same function built in, `util.promisify`. Don't use it here.

### Test that:

Write these in `tests/callbacks.test.ts`. For `promisify`, write a small error-first function in the test file, for example `divide(a, b, callback)`, which calls `callback(new Error("division by zero"))` when `b` is 0 and `callback(null, a / b)` otherwise, from inside a `setTimeout(..., 5)`.

- `await delay(50)` takes at least 45 milliseconds. Measure with `performance.now()`.
- The promisified `divide(6, 3)` resolves to `2`.
- The promisified `divide(1, 0)` rejects with the error. Use `await expect(...).rejects.toThrow("division by zero")`.
- **`then` callbacks run after synchronous code and before timers.** Schedule `setTimeout(() => log.push("timeout"), 0)`, then `Promise.resolve().then(() => log.push("then"))`, then `log.push("sync")`. After `await delay(10)`, the log is `["sync", "then", "timeout"]`. Part 2 explains why, and your promise will do the same.

---

## Part 2 — States, the executor and `then`

**File:** `src/my-promise.ts`

Read Promises/A+ sections 1, 2.1 and 2.2 before this part.

### States

A promise is in one of three **states**:

- **pending**: no result yet. It can move to one of the other two.
- **fulfilled**: it has a **value**, and never changes again.
- **rejected**: it has a **reason**, and never changes again.

*Settled* means fulfilled or rejected. In this part, `resolve(value)` simply fulfills the promise with `value`. Part 4 makes it smarter, which is where *resolved* and *fulfilled* stop meaning the same thing.

### Microtasks

Rule 2.2.4 says that `onFulfilled` and `onRejected` must not run until the code that is currently running has finished. So a `then` callback never runs inside the call to `then`, even when the promise is already settled.

Node keeps two queues of work to do later:

- **Tasks** (also called macrotasks): a `setTimeout` callback, an incoming network response, a file read that finished. The event loop takes **one** task at a time.
- **Microtasks**: promise callbacks, and anything passed to `queueMicrotask`. After each task, and before the next one, the event loop runs **every** microtask in the queue, including microtasks queued while it does so, until the queue is empty.

So a microtask runs as soon as the current code finishes, before any timer or I/O. That's the order your Part 1 test saw. On an unrelated example:

```ts
console.log("1");
setTimeout(() => console.log("4"), 0);
queueMicrotask(() => console.log("3"));
console.log("2");
// prints 1, 2, 3, 4
```

A promise library schedules its callbacks as microtasks so that they run as early as allowed: never during the current code, but before anything else gets a chance. Promises/A+ allows either kind (its note 3.1). The built-in `Promise` uses microtasks, and so will yours.

### Remembering callbacks for later

When `then` is called on a pending promise, the callback can't run yet. The promise has to keep it, and run it when it settles. Store **reactions**: small functions with no arguments that, when called, do whatever that `then` asked for. A list of functions you call later, on an unrelated example:

```ts
class Door {
    private isOpen = false;
    private waiting: Array<() => void> = [];

    whenOpen(fn: () => void): void {
        if (this.isOpen) {
            queueMicrotask(fn);
        } else {
            this.waiting.push(fn);
        }
    }

    open(): void {
        this.isOpen = true;
        for (const fn of this.waiting) {
            queueMicrotask(fn);
        }
        this.waiting = [];
    }
}
```

Both paths queue a microtask, so the callback never runs synchronously, whichever happens first.

### Write

**`class MyPromise<T>`**, exported, with:

- Three **`private`** fields: the state, the result (the value or the reason, one field for both), and the list of reactions.
- **`constructor(executor)`**, where the executor has the type
  ```ts
  export type Executor<T> = (resolve: (value: T) => void, reject: (reason?: unknown) => void) => void;
  ```
  - The constructor creates `resolve` and `reject` as arrow functions, so they can use `this`, and calls the executor with them **synchronously**.
  - Only the **first** call to either `resolve` or `reject` counts. Later calls to either do nothing (rule 2.1).
  - If the executor throws, the promise is rejected with what it threw, unless `resolve` or `reject` was already called.
  - Settling sets the state and the result, then queues every stored reaction with `queueMicrotask`, in the order they were added, and clears the list.
- **`then(onFulfilled?, onRejected?): void`**. For now it returns nothing. Part 3 changes that.
  - If the promise is pending, store a reaction. If it's already settled, queue the reaction right away with `queueMicrotask`.
  - The reaction calls `onFulfilled(value)` if the promise was fulfilled, or `onRejected(reason)` if it was rejected, but only if that argument is a function (rule 2.2.1). A missing callback is simply skipped, for now.

Each callback is called at most once, because each reaction is queued once.

### Test that:

Write the tests for Parts 2–6 and 8 in `tests/my-promise.test.ts`.

- **The executor runs synchronously:** a flag set inside the executor is already `true` on the line after `new MyPromise(...)`.
- **`then` callbacks run asynchronously:** with `new MyPromise<number>(resolve => resolve(1))`, a `then` callback that pushes the value to a log has not run on the line after `then`, and has run, with `1`, after `await nextTask()`.
- **Only the first call counts:** an executor that calls `resolve(1)`, `resolve(2)` and `reject(new Error("x"))` gives a promise whose `onFulfilled` sees `1`, and whose `onRejected` is never called.
- **An executor that throws rejects:** `onRejected` gets the exact error object that was thrown (`toBe`, not just an equal message).
- **Callbacks run in the order they were added, also after settling:** keep the `resolve` function outside the executor (`let resolveIt!: (v: number) => void;` and assign it inside), register `then` callbacks `a` and `b`, call `resolveIt(1)`, `await nextTask()`, register `c`, `await nextTask()`. The log is `["a", "b", "c"]`.

---

## Part 3 — Chaining and error propagation

**File:** `src/my-promise.ts`

Rule 2.2.7: **`then` must return a promise.** Call it `promise2`. What happens to `promise2` depends on what the callback does:

| The original promise | The callback for that outcome | `promise2` |
|---|---|---|
| fulfilled with `v` | returns `x` | fulfilled with `x` |
| fulfilled with `v` | throws `e` | rejected with `e` |
| fulfilled with `v` | is missing | fulfilled with `v` |
| rejected with `r` | returns `x` | **fulfilled** with `x` |
| rejected with `r` | throws `e` | rejected with `e` |
| rejected with `r` | is missing | rejected with `r` |

The last row is **error propagation**. A rejection passes through every `then` that has no `onRejected`, until it reaches one that has. The fourth row is **recovery**: once an `onRejected` returns normally, the chain is back on the success path. This is the promise version of `try`/`catch`:

```ts
fetchUser(id)                                   // try {
    .then(user => loadOrders(user))             //     const orders = loadOrders(fetchUser(id));
    .then(orders => render(orders))             //     render(orders);
    .then(undefined, error => showError(error)); // } catch (error) { showError(error); }
```

If `fetchUser` fails, neither `loadOrders` nor `render` runs.

### How to build it

`then` creates `promise2` with `new MyPromise(...)`, and its executor gets `promise2`'s own `resolve` and `reject`. The reaction for the original promise is created **inside that executor**, so it can see them. When it runs, it picks the callback for the outcome and follows the table: call it inside `try`/`catch`, pass a returned value to `resolve`, pass a thrown error to `reject`, and when the callback is missing, pass the original value or reason straight on.

The same shape, a new object whose fate is decided by a function that runs later, on an unrelated example:

```ts
class Cell<T> {
    private listeners: Array<(value: T) => void> = [];
    set(value: T): void { for (const l of this.listeners) l(value); }
    onSet(l: (value: T) => void): void { this.listeners.push(l); }

    // A new cell that always holds f(value) of this one.
    map<U>(f: (value: T) => U): Cell<U> {
        const next = new Cell<U>();
        this.onSet(value => next.set(f(value)));  // the listener can see `next`
        return next;
    }
}
```

### The type of `then`

From this part on, the class is declared **`class MyPromise<T> implements PromiseLike<T>`**. `PromiseLike` is TypeScript's built-in interface for "anything with a `then`", and implementing it is what lets TypeScript type `await myPromise` correctly. Its `then` has this signature, copied from TypeScript's own declarations, with your class as the return type:

```ts
then<TResult1 = T, TResult2 = never>(
    onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
): MyPromise<TResult1 | TResult2>
```

`TResult1` is what `onFulfilled` returns, and `TResult2` what `onRejected` returns, so `promise2` holds one or the other. The defaults cover a missing callback: without `onFulfilled` the value passes through unchanged (`T`), and without `onRejected` there is no recovery value (`never`). The callbacks may also return a promise (`PromiseLike<TResult1>`). That case comes in Part 4.

Inside, you will need a cast or two, for example when passing the original value straight on as a `TResult1`. That's expected: the table guarantees it's right, and TypeScript can't see that. Keep the casts in one place.

### Write

- Change **`then`** to the signature above. It returns `promise2` and follows the table.
- **`catch(onRejected?)`**: the same as `then(undefined, onRejected)`. Its type is `catch<TResult = never>(onRejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null): MyPromise<T | TResult>`.

### Test that:

- `then` returns a promise for the callback's result: `new MyPromise<number>(r => r(2)).then(v => v * 10)`, then `then` again to record the value, which is `20`.
- **An error skips steps until it's handled, then the chain recovers:** starting from `new MyPromise<number>(r => r(1))`, a chain of `then(() => { throw new Error("step 1 failed"); })`, then a `then` whose callback pushes `"skipped"`, then `then(undefined, e => { log.push(e.message); return "recovered"; })`, then a `then` that pushes the value. The log is `["step 1 failed", "recovered"]`.
- **Missing callbacks pass the result through:** `then()` and `then(null, undefined)` on a promise fulfilled with `5` give `5` further down. A rejection passes through `then(v => v)` and reaches the next `onRejected`. Record each in its own variable. Two separate chains don't finish in a fixed order relative to each other.
- `catch` turns a rejection with `new Error("x")` into a fulfillment with the message, `"x"`. From this part on you can use `await expect(...).resolves` and `.rejects`.

`MyPromise.resolve` and `MyPromise.reject` come in Part 4. Until then, create a rejected promise with `new MyPromise((_, reject) => reject(new Error("x")))`.

---

## Part 4 — The Resolution Procedure, and the compliance suite

**File:** `src/my-promise.ts`, `tests/aplus.test.ts`

Read Promises/A+ section 2.3 and "States and Fates" before this part.

### Resolved is not fulfilled

What should happen when a callback returns a promise?

```ts
getUserId().then(id => fetchUser(id)).then(user => ...)
```

`fetchUser` returns a promise, and the next step wants the user, not the promise. So `promise2` must **adopt** the returned promise: wait for it, and settle the same way. The same goes for `resolve(otherPromise)` in an executor.

Once a promise has been resolved with another promise, calling `resolve` or `reject` on it again has no effect: it is **resolved**. But it is still **pending** until the other promise settles. *Resolved* is about whether its fate is locked in, *fulfilled* about whether it has a value.

### Thenables

The rule doesn't check for "a promise of the same class". It checks for a **thenable**: any object or function with a `then` method. That's how promises from different libraries work together, and it's why `await` works on your `MyPromise`, and why your `MyPromise` can adopt a built-in `Promise`. It's also a risk: the thenable is someone else's code, and might call its callbacks twice, call both, or throw. The procedure guards against all of that.

### The procedure

**[[Resolve]](promise, x)** decides what resolving `promise` with `x` means. From section 2.3, for your class:

1. If `x` is the promise itself, **reject** with a `TypeError` (2.3.1). A promise waiting for itself would wait forever.
2. If `x` is an object (not `null`) or a function:
   1. Read `x.then` **once**, into a variable. If reading it throws, reject with the error (2.3.3.2). Read it only once because a getter could return something different each time.
   2. If it's a function, call it with `x` as `this` (`then.call(x, resolvePromise, rejectPromise)`), where:
      - `resolvePromise(y)` runs **[[Resolve]](promise, y)** again, recursively, because `y` can be a thenable too (2.3.3.3.1),
      - `rejectPromise(r)` rejects with `r` (2.3.3.3.2),
      - only the **first** call to either one counts (2.3.3.3.3),
      - if calling `then` throws, reject with the error, unless one of the two was already called (2.3.3.3.4).
   3. If it's not a function, fulfill with `x` (2.3.3.4).
3. Otherwise, fulfill with `x` (2.3.4).

Rule 2.3.2, "if `x` is a promise, adopt its state", is a shortcut for your own class. Step 2 already does the same thing, so you don't need a separate case.

Write it as a **`private`** method, for example `private resolveWith(x: unknown): void`, and use it in two places:

- **`resolve`** in the constructor calls it, instead of fulfilling directly. The "only the first call counts" flag from Part 2 is still set when `resolve` is called, not when the promise settles: that's what makes the promise *resolved* while it waits.
- **Change `Executor<T>`** so that `resolve` accepts `T | PromiseLike<T>`. In `then`, passing the callback's return value to `promise2`'s `resolve` now runs the procedure too, so callbacks can return promises.

Promises/A+ lets you call the thenable's `then` synchronously, inside the procedure. The built-in `Promise` instead queues it as a microtask (ECMAScript's *NewPromiseResolveThenableJob*). Either is correct. Call it synchronously: it's simpler, and the suite accepts it.

### Static helpers for the suite

The compliance suite needs to create promises in three ways. Add these three static methods now. Part 5 has their tests.

- **`static resolve<T>(value: T | PromiseLike<T>): MyPromise<T>`**: if `value` is already a `MyPromise`, return it as it is. Otherwise return a new `MyPromise` resolved with it.
- **`static reject<T = never>(reason?: unknown): MyPromise<T>`**: a new `MyPromise` rejected with `reason`.
- **`static withResolvers<T>(): { promise: MyPromise<T>; resolve: (value: T | PromiseLike<T>) => void; reject: (reason?: unknown) => void }`**: creates a promise and returns it together with its `resolve` and `reject`, so code outside the executor can settle it. Keep them in variables declared before the constructor call, and assign them inside the executor. The built-in `Promise.withResolvers` does the same.

### The compliance suite

The suite is a [Mocha](https://mochajs.org/) test suite of 872 tests. It talks to your class through an **adapter**, an object with three functions, and calls a function of yours with the number of failures when it's done. Copy these two files as they are.

`tests/promises-aplus-tests.d.ts` tells TypeScript that the package exists, since it ships without types:

```ts
declare module "promises-aplus-tests";
```

`tests/aplus.test.ts` runs the whole suite as one vitest test:

```ts
import { test, expect } from "vitest";
import promisesAplusTests from "promises-aplus-tests";
import { MyPromise } from "../src/my-promise";

const adapter = {
    resolved: (value: unknown) => MyPromise.resolve(value),
    rejected: (reason: unknown) => MyPromise.reject(reason),
    deferred: () => MyPromise.withResolvers<unknown>(),
};

test("passes the Promises/A+ compliance suite", async () => {
    const failures = await new Promise<number>(resolve => {
        promisesAplusTests(adapter, { reporter: "dot" }, (err: unknown) => resolve(err ? Number(err) || 1 : 0));
    });
    expect(failures).toBe(0);
}, 120_000);
```

It takes about 15 seconds. When it fails, vitest prints Mocha's report, with the name of each failing test, for example `2.3.1: If promise and x refer to the same object, reject promise with a TypeError as the reason`. Each name is a rule number, and the suite's source has one file per rule, in [`lib/tests/`](https://github.com/promises-aplus/promises-tests/tree/master/lib/tests), if you want to see exactly what it checked.

### Test that:

In `tests/my-promise.test.ts`:

- `await` works on a `MyPromise` that resolves inside a `setTimeout`.
- Returning a `MyPromise` from `then` waits for it: `MyPromise.resolve(1).then(v => new MyPromise<number>(r => setTimeout(() => r(v + 1), 5)))` gives `2`.
- Resolving with a plain object thenable, `{ then(onFulfilled) { onFulfilled(42); } }`, gives `42`. TypeScript's `PromiseLike` requires the full generic `then` signature, so a hand-written thenable needs a cast to be accepted: `{ ... } as unknown as PromiseLike<number>`. The cast changes only the type, not the object.
- Resolving with a built-in `Promise.reject(new Error("native"))` rejects with that error.
- **Resolving a promise with itself rejects with a `TypeError`:** `const p: MyPromise<unknown> = MyPromise.resolve(1).then(() => p);`. The type annotation is needed because `p` is used inside its own initializer.
- A thenable whose `then` calls `onFulfilled(1)`, then `onRejected(new Error("ignored"))`, then `onFulfilled(2)`, gives `1`.
- A thenable whose `then` is a **getter that throws** rejects with the thrown error. Create it with `Object.defineProperty({}, "then", { get() { throw error; } })`.

And `tests/aplus.test.ts` passes, with 0 failures.

---

## Part 5 — `resolve`, `reject`, `withResolvers` and `finally`

**File:** `src/my-promise.ts`

`MyPromise.resolve`, `reject` and `withResolvers` exist from Part 4. Add:

- **`finally(onFinally?)`**: runs `onFinally` when the promise settles, whatever the outcome, like a `finally` block. Its type is `finally(onFinally?: (() => unknown) | null): MyPromise<T>`.
  - `onFinally` gets **no arguments**. Cleanup code doesn't need the result.
  - The result **passes through**: the returned promise fulfills with the original value, or rejects with the original reason. What `onFinally` returns is ignored.
  - Two exceptions: if `onFinally` **throws**, or returns a promise that **rejects**, that error replaces the result. And if it returns a promise, the result waits for it.
  - If `onFinally` isn't a function, `finally` is the same as `then()`.

  Build it from `then`. Each of the two callbacks calls `onFinally()`, wraps what it returns in `MyPromise.resolve` so that a returned promise is waited for, and then passes the original value on, or throws the original reason again. On an unrelated example of "run something, then pass the original value on":

  ```ts
  const logged = <T>(value: T) => MyPromise.resolve(writeLog("got a value")).then(() => value);
  ```

### Test that:

- `MyPromise.resolve(p)` returns `p` itself (`toBe`) when `p` is a `MyPromise`. `MyPromise.resolve("v")` gives `"v"`, and `MyPromise.reject(new Error("no"))` rejects with it.
- `withResolvers`: calling its `resolve(7)` from a `setTimeout` fulfills its `promise` with `7`.
- `finally` runs on both outcomes and passes the result through: on `MyPromise.resolve(1)` with an `onFinally` that returns `99`, the result is still `1`. On a rejection with `new Error("e")`, the result still rejects with it. A log shows that `onFinally` ran both times.
- `finally` waits for a returned promise: with an `onFinally` that returns a `MyPromise` resolving after 30 ms, the whole thing takes at least 25 ms. And an `onFinally` that throws `new Error("cleanup failed")` turns a fulfilled promise into a rejection with that error.

---

## Part 6 — Combinators

**File:** `src/my-promise.ts`

A **combinator** takes many promises and returns one. Write four static methods. Each takes an `Iterable<T | PromiseLike<T>>`, so it accepts an array, a `Set`, or a generator, of promises, thenables and plain values mixed. Turn the iterable into an array first (`[...values]`), and turn each item into a `MyPromise` with `MyPromise.resolve(item)`, which also wraps plain values.

| | Fulfills | Rejects | Empty input |
|---|---|---|---|
| **`all`** | when all fulfill, with an array of the values **in input order** | as soon as **one** rejects, with its reason | fulfills with `[]` |
| **`allSettled`** | when all settle, with an array of results in input order | never | fulfills with `[]` |
| **`race`** | like the **first** to settle | like the first to settle | stays pending forever |
| **`any`** | as soon as **one** fulfills, with its value | when **all** reject, with an `AggregateError` | rejects with an `AggregateError` |

- **`static all<T>(values): MyPromise<T[]>`**. Results go into an array by **index**, not pushed in the order they arrive: the third promise may finish first, and its value still goes in position 2. Keep a counter of how many are still missing, and resolve when it reaches 0. The empty case needs its own check, because no callback will ever bring the counter to 0.
- **`static allSettled<T>(values): MyPromise<SettledResult<T>[]>`**, with
  ```ts
  export type SettledResult<T> =
      | { status: "fulfilled"; value: T }
      | { status: "rejected"; reason: unknown };
  ```
  It can be built from `all`: turn each promise into one that always fulfills, with a `SettledResult`.
- **`static race<T>(values): MyPromise<T>`**. Pass the new promise's own `resolve` and `reject` to every item's `then`. The first call wins, and the rest are ignored, because only the first call counts (Part 2). With no items, nothing ever calls them.
- **`static any<T>(values): MyPromise<T>`**: the mirror of `all`. Reasons go into an array by index, and when the last one rejects, reject with `new AggregateError(errors, "All promises were rejected")`. `AggregateError` is a built-in `Error` with an `errors` array.

The built-in versions have more precise types: `Promise.all([1, "a"])` is typed as a tuple `[number, string]`. A plain `T[]` is enough here.

### Test that:

Write two helpers in the test file: `later(ms, value)`, a `MyPromise` that fulfills with `value` after `ms` milliseconds, and `failLater(ms, message)`, one that rejects with `new Error(message)` after `ms`.

- `all([later(30, "a"), later(10, "b"), "c"])` gives `["a", "b", "c"]`, even though `"b"` finished first and `"c"` isn't a promise. `all([])` gives `[]`.
- `all([later(30, "a"), failLater(10, "first"), failLater(20, "second")])` rejects with `"first"`.
- `allSettled([later(10, 1), failLater(5, "x")])` gives `{ status: "fulfilled", value: 1 }` first, and a result with status `"rejected"` second.
- `race` of `later(30, "slow")` and `later(10, "fast")` gives `"fast"`, and of `later(30, "slow")` and `failLater(10, "fast error")` rejects with `"fast error"`.
- `race([])` is still pending after `await wait(20)`: neither callback of its `then` has run.
- `any([failLater(5, "x"), later(20, "ok")])` gives `"ok"`. `any([failLater(20, "a"), failLater(5, "b")])` rejects with an `AggregateError` whose `errors` have the messages `["a", "b"]`, in input order, not in the order they failed. `any([])` rejects with an `AggregateError`. Catch the error with `.then(() => null, e => e)` to inspect it.

---

## Part 7 — async/await from generators

**File:** `src/run.ts`

An `async` function pauses at every `await`, and continues with the value when the promise fulfills, or with an exception thrown at the `await` when it rejects. A generator can do the same. It pauses at every `yield`, and whoever drives it decides what happens next:

- `gen.next(value)` resumes it, and `value` becomes the result of the `yield` expression.
- `gen.throw(error)` resumes it by throwing `error` **at the `yield`**, where a `try`/`catch` in the generator can catch it.
- Both return `{ value, done }`: the next yielded value with `done: false`, or the generator's return value with `done: true`. If the generator lets an exception escape, the call to `next` or `throw` throws it.

So a generator that yields promises, plus a driver that waits for each one and sends the outcome back, behaves exactly like an `async` function:

```ts
// with async/await                         // with run
async function load() {                     run(function* () {
    const user = await fetchUser(1);            const user = yield fetchUser(1);
    return user.name;                           return user.name;
}                                           });
```

An unrelated example of driving a generator by hand, sending values in:

```ts
function* adder(): Generator<number, number, number> {
    let total = 0;
    while (true) {
        const n = yield total;   // pauses here; n is what the next call to next() sends
        if (n < 0) return total;
        total += n;
    }
}

const g = adder();
g.next();      // starts it: runs to the first yield, { value: 0, done: false }
g.next(5);     // { value: 5, done: false }
g.next(3);     // { value: 8, done: false }
g.next(-1);    // { value: 8, done: true }
```

### Write

**`run<T>(makeGenerator: () => Generator<unknown, T, any>): MyPromise<T>`**:

1. Return a new `MyPromise`. In its executor, call `makeGenerator()` to get the generator.
2. Write an inner function `step(advance)`, where `advance` is a function with no arguments that calls `gen.next(...)` or `gen.throw(...)`. `step` calls `advance()` inside `try`/`catch`:
   - If it throws, the generator didn't catch an error: reject the promise with it.
   - If the result is `done`, resolve the promise with the result's `value`, which is the generator's return value.
   - Otherwise the generator yielded something: wrap it with `MyPromise.resolve`, and `then` it with two callbacks. On fulfillment, `step(() => gen.next(value))`. On rejection, `step(() => gen.throw(reason))`.
3. Start it with `step(() => gen.next())`.

Passing `advance` as a function, instead of calling `next` or `throw` before `step`, puts both cases inside the same `try`/`catch`.

`run` uses `MyPromise` and no built-in promises, like `src/my-promise.ts`.

The type of a `yield` expression can't depend on what was yielded, so in TypeScript it's `any` here, and each `yield` needs a cast: `const a = (yield later(10, 2)) as number;`. That's one practical reason `await` was added to the language: `await p` has the type of `p`'s value.

### Test that:

Write these in `tests/run.test.ts`, with a `later(ms, value)` helper like in Part 6.

- Each fulfilled value comes back from its `yield`: a generator that yields `later(10, 2)` and `later(5, 3)` and returns their product gives `6`.
- A plain yielded value comes straight back: `function* () { return (yield 5) as number; }` gives `5`.
- **A rejection is thrown into the generator:** a generator that yields `MyPromise.reject(new Error("failed"))` inside `try`, and returns `` `caught ${error.message}` `` from `catch`, gives `"caught failed"`.
- **An error the generator doesn't catch rejects the promise, after `finally` runs:** a generator that yields a rejected promise inside `try { ... } finally { log.push("finally"); }` gives a promise that rejects with that error, and the log is `["finally"]`.
- `run` gives the same result as the equivalent `async` function. Write both versions of a function that awaits `later(5, 1)` into `a`, then awaits a rejected promise inside `try`, and returns `a + 1` from `catch`. Both give `2`.
- **The body starts synchronously, like an `async` function:** a flag set at the start of the generator is already `true` on the line after calling `run`. (Compare LLM02 Part 1: an `async` function runs up to its first `await` as soon as it's called.)

---

## Part 8 — Unhandled rejections

**File:** `src/my-promise.ts`

A rejection that nobody handles is almost always a bug: an error happened, and the program carried on as if it hadn't. Usually a forgotten `await` or `catch`. Node reports it with the `'unhandledRejection'` event, and by default crashes the process.

The question is *when* to decide that nobody will handle it. A handler can be added after the promise rejects:

```ts
const p = MyPromise.reject(new Error("x"));
doSomethingElse();
p.catch(handle);   // handled: the same synchronous code adds a handler
```

Node's answer, and yours: a rejection is unhandled if it still has no handler once the current code **and every microtask** have run. A `setTimeout(..., 0)` callback runs at exactly that point, so it's a simple way to check.

Every way of handling a promise, `catch`, `finally` and `await`, calls `then`. So "has a handler" means "`then` was called on this promise".

### Write

- **`static onUnhandledRejection: ((reason: unknown, promise: MyPromise<unknown>) => void) | null`**, public, `null` by default. When it's `null`, nothing is reported. Leave it `null` outside the tests that set it, or the compliance suite, which rejects promises on purpose, would trigger it.
- A **`private`** flag that is set when `then` is called on the promise.
- When the promise **rejects** and the flag isn't set yet, schedule a check with `setTimeout(..., 0)`. When the check runs, if the flag is still not set and the hook isn't `null`, call the hook with the reason and the promise.

The setTimeout inside `src/my-promise.ts` is allowed. The convention is about built-in promises, and a timer isn't one.

Look at what this means for a chain:

```ts
const first = MyPromise.reject(new Error("e"));
const last = first.then(v => v);
```

`first` has a handler: `then` was called on it. The `then` has no `onRejected`, so the error passes through to `last` (Part 3), and **nobody handles `last`**. The report is about `last`, the end of the chain, and not about `first`, where the error started. An error is handled only when it reaches a promise that something handles.

### Test that:

In `tests/my-promise.test.ts`, with the hook set to a function that records what it gets. Reset the hook to `null` after each test, with `afterEach(() => { MyPromise.onUnhandledRejection = null; })` from vitest. Wait with `await wait(20)` before checking, not `nextTask()`: the check for a promise that rejects inside a microtask is scheduled later than a `nextTask()` that the test started first.

- **A rejection without a handler is reported once:** `MyPromise.reject(error)` with nothing else. The hook was called once, with `error`.
- **A handler added in the same turn prevents the report**, even when it's added in a microtask: `const p = MyPromise.reject(...)`, then `queueMicrotask(() => { p.catch(() => {}); })`. The hook is never called.
- **The report is about the end of the chain:** for `first` and `last` as above, the hook is called once, with `last` as the promise.

---

## Compile-error checks

**File:** `tests/compile-errors.ts`

As in DS03, prove that the compiler rejects wrong code: put each line on its own, with `// @ts-expect-error` directly above it.

- `new MyPromise<number>(resolve => resolve("x"))`: a `MyPromise<number>` can't be resolved with a string.
- `MyPromise.resolve(1).then(n => n.toUpperCase())`: the callback gets a `number`.
- `const s: string = await MyPromise.resolve(1)`: awaiting a `MyPromise<number>` gives a `number`. This checks that `implements PromiseLike<T>` gives `await` the right type. Top-level `await` works here because the project is an ES module (`"type": "module"`).
- `MyPromise.resolve(1).state`: the state is private. Use your field's name.

---

## Running the tests

```
npx tsc --noEmit                              # type check, including the compile-error checks
npx vitest run                                # all tests, including the compliance suite (~15 s)
npx vitest run --exclude tests/aplus.test.ts  # everything except the compliance suite
```
