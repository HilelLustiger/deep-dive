import { expect, test } from "vitest";
import { answer, fail, ScriptedModel } from "../src/model/scripted.ts";
import { costUsd, percentile, type Span, summarize, traced } from "../src/trace.ts";

const price = { inputPerMTok: 4, outputPerMTok: 20 };

// A fake clock: each call returns the next value.
function clock(...times: number[]): () => number {
    return () => times.shift()!;
}

test("cost of a reply", () => {
    expect(costUsd({ inputTokens: 1_000_000, outputTokens: 0 }, price)).toBeCloseTo(4);
    expect(costUsd({ inputTokens: 2000, outputTokens: 500 }, price)).toBeCloseTo(0.018);
});

test("a span per successful call", async () => {
    const spans: Span[] = [];
    const model = traced(new ScriptedModel([answer("Hi", { inputTokens: 2000, outputTokens: 500 })]), {
        name: "chat", price, spans, now: clock(100, 350),
    });

    const reply = await model.complete({ messages: [{ role: "user", text: "Hello" }], tools: [] });

    expect(reply.message.text).toBe("Hi");
    expect(spans).toHaveLength(1);
    expect(spans[0]).toMatchObject({ name: "chat", startMs: 100, durationMs: 250, inputTokens: 2000, outputTokens: 500, stopReason: "end" });
    expect(spans[0].costUsd).toBeCloseTo(0.018);
    expect(spans[0].error).toBeUndefined();
});

test("a failed call gets a span too, and still throws", async () => {
    const spans: Span[] = [];
    const model = traced(new ScriptedModel([fail(503)]), { name: "chat", price, spans, now: clock(0, 40) });

    await expect(model.complete({ messages: [], tools: [] })).rejects.toThrow("HTTP 503");
    expect(spans).toEqual([{ name: "chat", startMs: 0, durationMs: 40, inputTokens: 0, outputTokens: 0, costUsd: 0, error: "HTTP 503" }]);
});

test("percentile, nearest rank", () => {
    const values = [50, 10, 40, 20, 30, 100, 60, 70, 80, 90];
    expect(percentile(values, 50)).toBe(50);
    expect(percentile(values, 95)).toBe(100);
    expect(percentile(values, 10)).toBe(10);
    expect(percentile([7], 95)).toBe(7);
    expect(percentile([], 50)).toBe(0);
    expect(values[0]).toBe(50); // not sorted in place
});

test("summary of a trace", () => {
    const span = (durationMs: number, inputTokens: number, outputTokens: number, error?: string): Span => ({
        name: "x", startMs: 0, durationMs, inputTokens, outputTokens,
        costUsd: costUsd({ inputTokens, outputTokens }, price), ...(error ? { error } : {}),
    });
    const summary = summarize([span(100, 1000, 100), span(300, 2000, 200), span(200, 0, 0, "HTTP 529")]);

    expect(summary).toMatchObject({ calls: 3, errors: 1, inputTokens: 3000, outputTokens: 300, p50Ms: 200, p95Ms: 300 });
    expect(summary.costUsd).toBeCloseTo(0.018);
    expect(summarize([])).toEqual({ calls: 0, errors: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, p50Ms: 0, p95Ms: 0 });
});
