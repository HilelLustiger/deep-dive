import { expect, test } from "vitest";
import { runAgent } from "../src/agent.ts";
import { answer, callTools, ScriptedModel } from "../src/model/scripted.ts";
import { calculator, createNoteTools } from "../src/tools.ts";

test("one tool round, then an answer", async () => {
    const model = new ScriptedModel([
        callTools(["c1", "calculator", { a: 6, b: 7, op: "multiply" }]),
        answer("6 times 7 is 42."),
    ]);

    const result = await runAgent(model, [calculator], "What is 6 times 7?", { system: "Be brief." });

    expect(result.text).toBe("6 times 7 is 42.");
    expect(result.steps).toBe(2);
    expect(result.stopReason).toBe("end");
    expect(model.requests).toHaveLength(2);
    expect(model.requests[0].system).toBe("Be brief.");
    expect(model.requests[0].tools.map(t => t.name)).toEqual(["calculator"]);
    expect(model.requests[1].messages.map(m => m.role)).toEqual(["user", "assistant", "tool"]);
    expect(model.requests[1].messages[2]).toEqual({
        role: "tool",
        results: [{ callId: "c1", content: "42", isError: false }],
    });
});

test("an answer with no tools takes one step", async () => {
    const model = new ScriptedModel([answer("Hello!")]);

    const result = await runAgent(model, [calculator], "Hi");

    expect(result.text).toBe("Hello!");
    expect(result.steps).toBe(1);
    expect(result.stopReason).toBe("end");
    expect(result.messages).toHaveLength(2);
});

test("the assistant message is added as it came", async () => {
    const reply = callTools(["c1", "calculator", { a: 1, b: 1, op: "add" }]);
    reply.message.raw = { secret: "provider data" };
    const model = new ScriptedModel([reply, answer("2")]);

    const result = await runAgent(model, [calculator], "1 + 1?");

    expect(result.messages[1]).toBe(reply.message);
});

test("the step limit stops a model that never finishes", async () => {
    const loop = () => callTools(["c", "calculator", { a: 1, b: 1, op: "add" }]);
    const model = new ScriptedModel([loop(), loop(), loop(), loop()]);

    const result = await runAgent(model, [calculator], "loop", { maxSteps: 3 });

    expect(result.text).toBe("");
    expect(result.steps).toBe(3);
    expect(result.stopReason).toBe("max_steps");
    expect(model.requests).toHaveLength(3);
});

test("max_tokens stops the loop", async () => {
    const cut = answer("The answer is");
    cut.stopReason = "max_tokens";
    const model = new ScriptedModel([cut]);

    const result = await runAgent(model, [calculator], "Explain");

    expect(result.text).toBe("The answer is");
    expect(result.stopReason).toBe("max_tokens");
});

test("parallel calls come back in one message", async () => {
    const model = new ScriptedModel([
        callTools(["n1", "add_note", { text: "a" }], ["n2", "add_note", { text: "b" }]),
        answer("Saved both."),
    ]);

    await runAgent(model, createNoteTools(), "Save a and b");

    const messages = model.requests[1].messages;
    expect(messages).toHaveLength(3);
    expect(messages[2]).toEqual({
        role: "tool",
        results: [
            { callId: "n1", content: "Saved note 1", isError: false },
            { callId: "n2", content: "Saved note 2", isError: false },
        ],
    });
});
