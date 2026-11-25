import { expect, test } from "vitest";
import { TimeoutError } from "../src/model/errors.ts";
import { answer, fail, ScriptedModel } from "../src/model/scripted.ts";
import type { ChatModel, ModelRequest } from "../src/model/types.ts";
import { isRetryable, type RetryOptions, withRetry } from "../src/retry.ts";
import { type Span, traced } from "../src/trace.ts";

const request: ModelRequest = { messages: [{ role: "user", text: "Hi" }], tools: [] };

// Options whose sleep records each delay instead of waiting it.
function setup(overrides: Partial<RetryOptions> = {}): { options: RetryOptions; delays: number[] } {
    const delays: number[] = [];
    const options: RetryOptions = {
        maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 3000, timeoutMs: 1000,
        sleep: async ms => { delays.push(ms); },
        random: () => 0.5,
        ...overrides,
    };
    return { options, delays };
}

test("which errors are worth retrying", () => {
    for (const status of [408, 409, 429, 500, 503, 529]) {
        expect(isRetryable(fail(status))).toBe(true);
    }
    for (const status of [400, 401, 403, 404, 413]) {
        expect(isRetryable(fail(status))).toBe(false);
    }
    expect(isRetryable(fail())).toBe(true);
    expect(isRetryable(new TimeoutError("slow"))).toBe(true);
    expect(isRetryable(new Error("a bug in our code"))).toBe(false);
});

test("retries until it succeeds, with growing delays", async () => {
    const inner = new ScriptedModel([fail(529), fail(500), answer("Hi")]);
    const { options, delays } = setup();

    const reply = await withRetry(inner, options).complete(request);

    expect(reply.message.text).toBe("Hi");
    expect(inner.requests).toHaveLength(3);
    expect(delays).toEqual([500, 1000]);
});

test("the delay is capped", async () => {
    const inner = new ScriptedModel([fail(529), fail(529), fail(529), fail(529), answer("Hi")]);
    const { options, delays } = setup({ maxAttempts: 5 });

    await withRetry(inner, options).complete(request);

    expect(delays).toEqual([500, 1000, 1500, 1500]);
});

test("Retry-After wins", async () => {
    const inner = new ScriptedModel([fail(429, 7000), answer("Hi")]);
    const { options, delays } = setup();

    await withRetry(inner, options).complete(request);

    expect(delays).toEqual([7000]);
});

test("gives up after maxAttempts", async () => {
    const inner = new ScriptedModel([fail(503), fail(503), fail(529)]);
    const { options, delays } = setup();

    await expect(withRetry(inner, options).complete(request)).rejects.toThrow("HTTP 529");
    expect(inner.requests).toHaveLength(3);
    expect(delays).toHaveLength(2);
});

test("a permanent error is thrown at once", async () => {
    const inner = new ScriptedModel([fail(400), answer("never reached")]);
    const { options, delays } = setup();

    await expect(withRetry(inner, options).complete(request)).rejects.toThrow("HTTP 400");
    expect(inner.requests).toHaveLength(1);
    expect(delays).toEqual([]);
});

test("a slow reply times out, and the timeout is retried", async () => {
    let calls = 0;
    const inner: ChatModel = {
        complete: async () => {
            calls++;
            if (calls === 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            return answer("Hi");
        },
    };
    const { options } = setup({ timeoutMs: 20 });

    const reply = await withRetry(inner, options).complete(request);

    expect(reply.message.text).toBe("Hi");
    expect(calls).toBe(2);
});

test("a model that never answers ends in a TimeoutError", async () => {
    const inner: ChatModel = { complete: () => new Promise(() => {}) };
    const { options } = setup({ timeoutMs: 20, maxAttempts: 2 });

    await expect(withRetry(inner, options).complete(request)).rejects.toBeInstanceOf(TimeoutError);
});

test("where the tracing goes decides what a span measures", async () => {
    const attemptSpans: Span[] = [];
    const requestSpans: Span[] = [];
    const price = { inputPerMTok: 0, outputPerMTok: 0 };
    const inner = new ScriptedModel([fail(529), fail(529), answer("Hi")]);
    const { options } = setup();

    const model = traced(
        withRetry(traced(inner, { name: "attempt", price, spans: attemptSpans }), options),
        { name: "request", price, spans: requestSpans },
    );
    await model.complete(request);

    expect(attemptSpans.map(span => span.error)).toEqual(["HTTP 529", "HTTP 529", undefined]);
    expect(requestSpans).toHaveLength(1);
    expect(requestSpans[0].error).toBeUndefined();
});
