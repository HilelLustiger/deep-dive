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
