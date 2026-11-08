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
