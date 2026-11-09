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
