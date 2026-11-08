// Tests for Part 7: run.
import { test, expect } from "vitest";
import { MyPromise } from "../src/my-promise";
import { run } from "../src/run";

function later<T>(ms: number, value: T): MyPromise<T> {
    return new MyPromise(resolve => setTimeout(() => resolve(value), ms));
}

test("each fulfilled value comes back from its yield", async () => {
    const result = run(function* () {
        const a = (yield later(10, 2)) as number;
        const b = (yield later(5, 3)) as number;
        return a * b;
    });

    await expect(result).resolves.toBe(6);
});

test("a plain yielded value comes straight back", async () => {
    const result = run(function* () {
        return (yield 5) as number;
    });

    await expect(result).resolves.toBe(5);
});

test("a rejection is thrown into the generator", async () => {
    const result = run(function* () {
        try {
            yield MyPromise.reject(new Error("failed"));
            return "not caught";
        } catch (error) {
            return `caught ${(error as Error).message}`;
        }
    });

    await expect(result).resolves.toBe("caught failed");
});

test("an error the generator doesn't catch rejects the promise, after finally runs", async () => {
    const log: string[] = [];
    const error = new Error("uncaught");

    const result = run(function* () {
        try {
            yield MyPromise.reject(error);
        } finally {
            log.push("finally");
        }
    });

    await expect(result).rejects.toBe(error);
    expect(log).toEqual(["finally"]);
});

test("run gives the same result as the equivalent async function", async () => {
    async function withAwait() {
        const a = await later(5, 1);
        try {
            await MyPromise.reject(new Error("x"));
            return 0;
        } catch {
            return a + 1;
        }
    }

    const withRun = run(function* () {
        const a = (yield later(5, 1)) as number;
        try {
            yield MyPromise.reject(new Error("x"));
            return 0;
        } catch {
            return a + 1;
        }
    });

    await expect(withAwait()).resolves.toBe(2);
    await expect(withRun).resolves.toBe(2);
});

test("the body starts synchronously, like an async function", () => {
    let started = false;

    run(function* () {
        started = true;
        yield later(5, 0);
    });

    expect(started).toBe(true);
});
