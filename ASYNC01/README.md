# Promise Chain (TypeScript)

Based on the [Promises/A+](https://promisesaplus.com/) specification and its [compliance test suite](https://github.com/promises-aplus/promises-tests), chapters 3 ("Promises") and 4 ("Generators") of Kyle Simpson's *You Don't Know JS: Async & Performance*, and the chapter "Promises, async/await" of [javascript.info](https://javascript.info/async).

A Promise implemented from scratch, `MyPromise<T>`, that passes the 872 tests of the Promises/A+ compliance suite. It covers promisifying callbacks, states and the executor, microtask scheduling, `then` chaining and error propagation, the Promise Resolution Procedure and thenables, `finally`, the `all`, `allSettled`, `race` and `any` combinators, async/await rebuilt from generators, and unhandled-rejection tracking.

The full task is in [ASSIGNMENT.md](ASSIGNMENT.md).
