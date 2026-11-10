import { expect, test } from "vitest";
import { runToolCalls } from "../src/run-tools.ts";
import { calculator, createNoteTools, type Tool } from "../src/tools.ts";

test("runs every call, keeping the order and the ids", async () => {
    const message = await runToolCalls(
        [
            { id: "c1", name: "calculator", input: { a: 2, b: 3, op: "add" } },
            { id: "c2", name: "add_note", input: { text: "hi" } },
        ],
        [calculator, ...createNoteTools()],
    );

    expect(message).toEqual({
        role: "tool",
        results: [
            { callId: "c1", content: "5", isError: false },
            { callId: "c2", content: "Saved note 1", isError: false },
        ],
    });
});

test("waits for an async tool", async () => {
    const slow: Tool = {
        name: "slow",
        description: "",
        inputSchema: { type: "object", properties: {} },
        run: async () => "done",
    };

    const message = await runToolCalls([{ id: "x", name: "slow", input: {} }], [slow]);

    expect(message.results[0].content).toBe("done");
});

test("an unknown tool becomes an error result", async () => {
    const message = await runToolCalls([{ id: "u", name: "weather", input: {} }], [calculator]);

    expect(message.results[0].isError).toBe(true);
    expect(message.results[0].content).toContain("weather");
    expect(message.results[0].content).toContain("calculator");
});

test("a tool that throws becomes an error result", async () => {
    const message = await runToolCalls(
        [{ id: "d", name: "calculator", input: { a: 1, b: 0, op: "divide" } }],
        [calculator],
    );

    expect(message.results[0]).toEqual({ callId: "d", content: "Cannot divide by zero", isError: true });
});

test("a thrown value that isn't an Error becomes text", async () => {
    const bad: Tool = {
        name: "bad",
        description: "",
        inputSchema: { type: "object", properties: {} },
        run: () => {
            throw "nope";
        },
    };

    const message = await runToolCalls([{ id: "b", name: "bad", input: {} }], [bad]);

    expect(message.results[0]).toEqual({ callId: "b", content: "nope", isError: true });
});
