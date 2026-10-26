// Tests for Part 1: delay and promisify.
import { test, expect } from "vitest";
import { delay, promisify, Callback } from "../src/callbacks";

// An error-first function to promisify: fails when dividing by zero.
function divide(a: number, b: number, callback: Callback<number>): void {
    setTimeout(() => {
        if (b === 0) {
            callback(new Error("division by zero"));
        } else {
            callback(null, a / b);
        }
    }, 5);
}

test("delay waits at least the given time", async () => {
    const start = performance.now();
    await delay(50);
    expect(performance.now() - start).toBeGreaterThanOrEqual(45);
});

test("a promisified function resolves with the callback's result", async () => {
    const divideAsync = promisify(divide);

    await expect(divideAsync(6, 3)).resolves.toBe(2);
});

test("a promisified function rejects with the callback's error", async () => {
    const divideAsync = promisify(divide);

    await expect(divideAsync(1, 0)).rejects.toThrow("division by zero");
});

test("then callbacks run after synchronous code and before timers", async () => {
    const log: string[] = [];

    setTimeout(() => log.push("timeout"), 0);
    Promise.resolve().then(() => log.push("then"));
    log.push("sync");

    await delay(10);
    expect(log).toEqual(["sync", "then", "timeout"]);
});
