// Tests for Parts 2-6 and 8: MyPromise.
import { test, expect } from "vitest";
import { MyPromise } from "../src/my-promise";
import { nextTask } from "./helpers";

// Part 2

test("the executor runs synchronously", () => {
    let ran = false;

    new MyPromise(() => {
        ran = true;
    });

    expect(ran).toBe(true);
});

test("then callbacks run asynchronously, with the value", async () => {
    const log: number[] = [];
    const promise = new MyPromise<number>(resolve => resolve(1));

    promise.then(value => {
        log.push(value);
    });

    expect(log).toEqual([]);
    await nextTask();
    expect(log).toEqual([1]);
});

test("only the first call to resolve or reject counts", async () => {
    const fulfilled: number[] = [];
    let rejectedCalled = false;
    const promise = new MyPromise<number>((resolve, reject) => {
        resolve(1);
        resolve(2);
        reject(new Error("x"));
    });

    promise.then(
        value => {
            fulfilled.push(value);
        },
        () => {
            rejectedCalled = true;
        },
    );

    await nextTask();
    expect(fulfilled).toEqual([1]);
    expect(rejectedCalled).toBe(false);
});

test("an executor that throws rejects the promise with the thrown error", async () => {
    const error = new Error("boom");
    let seen: unknown;
    const promise = new MyPromise(() => {
        throw error;
    });

    promise.then(undefined, reason => {
        seen = reason;
    });

    await nextTask();
    expect(seen).toBe(error);
});

test("callbacks run in the order they were added, also when added after settling", async () => {
    const log: string[] = [];
    let resolveIt!: (value: number) => void;
    const promise = new MyPromise<number>(resolve => {
        resolveIt = resolve;
    });

    promise.then(() => {
        log.push("a");
    });
    promise.then(() => {
        log.push("b");
    });
    resolveIt(1);
    await nextTask();

    promise.then(() => {
        log.push("c");
    });
    await nextTask();

    expect(log).toEqual(["a", "b", "c"]);
});

// Part 3

function rejected(message: string): MyPromise<never> {
    return new MyPromise((_, reject) => reject(new Error(message)));
}

test("then returns a promise for the callback's result", async () => {
    let seen: unknown;

    new MyPromise<number>(resolve => resolve(2))
        .then(value => value * 10)
        .then(value => {
            seen = value;
        });

    await nextTask();
    expect(seen).toBe(20);
});

test("an error skips steps until it's handled, then the chain recovers", async () => {
    const log: string[] = [];

    new MyPromise<number>(resolve => resolve(1))
        .then(() => {
            throw new Error("step 1 failed");
        })
        .then(() => {
            log.push("skipped");
        })
        .then(undefined, (error: Error) => {
            log.push(error.message);
            return "recovered";
        })
        .then(value => {
            log.push(String(value));
        });

    await nextTask();
    expect(log).toEqual(["step 1 failed", "recovered"]);
});

test("missing callbacks pass the value and the reason through", async () => {
    let value: unknown;
    let reason: unknown;

    new MyPromise<number>(resolve => resolve(5))
        .then()
        .then(null, undefined)
        .then(v => {
            value = v;
        });
    rejected("r")
        .then(v => v)
        .then(undefined, (error: Error) => {
            reason = error.message;
        });

    await nextTask();
    expect(value).toBe(5);
    expect(reason).toBe("r");
});

test("catch turns a rejection into a fulfillment", async () => {
    await expect(rejected("x").catch((error: Error) => error.message)).resolves.toBe("x");
});

// Part 5

test("resolve returns a MyPromise as is, wraps other values, and reject rejects", async () => {
    const promise = MyPromise.resolve(1);
    const error = new Error("no");

    expect(MyPromise.resolve(promise)).toBe(promise);
    await expect(MyPromise.resolve("v")).resolves.toBe("v");
    await expect(MyPromise.reject(error)).rejects.toBe(error);
});

test("withResolvers settles its promise from outside the executor", async () => {
    const { promise, resolve } = MyPromise.withResolvers<number>();

    setTimeout(() => resolve(7), 0);

    await expect(promise).resolves.toBe(7);
});

test("finally runs on both outcomes and passes the result through", async () => {
    const log: string[] = [];
    const error = new Error("e");

    const fulfilled = MyPromise.resolve(1).finally(() => {
        log.push("fulfilled");
        return 99;
    });
    const failed = MyPromise.reject(error).finally(() => {
        log.push("rejected");
    });

    await expect(fulfilled).resolves.toBe(1);
    await expect(failed).rejects.toBe(error);
    expect(log).toEqual(["fulfilled", "rejected"]);
});

test("finally waits for a promise that onFinally returns", async () => {
    const start = Date.now();

    await MyPromise.resolve(1).finally(() => new MyPromise(resolve => setTimeout(resolve, 30)));

    expect(Date.now() - start).toBeGreaterThanOrEqual(25);
});

test("an error thrown in onFinally replaces the result", async () => {
    const promise = MyPromise.resolve(1).finally(() => {
        throw new Error("cleanup failed");
    });

    await expect(promise).rejects.toThrow("cleanup failed");
});
