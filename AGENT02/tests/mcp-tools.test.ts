import { expect, test } from "vitest";
import { runAgent } from "../src/agent.ts";
import { toolsFromServer } from "../src/mcp-tools.ts";
import { answer, callTools, ScriptedModel } from "../src/model/scripted.ts";
import { createServer } from "../src/server.ts";
import { calculator, createNoteTools } from "../src/tools.ts";
import { connect } from "./helpers.ts";

test("server tools look like local tools", async () => {
    const client = await connect(createServer([calculator, ...createNoteTools()]));
    const tools = await toolsFromServer(client);

    expect(tools.map(tool => tool.name)).toEqual(["calculator", "add_note", "search_notes"]);
    expect(tools[0].description).toBe(calculator.description);
    expect(tools[0].inputSchema).toEqual(calculator.inputSchema);
    expect(await tools[0].run({ a: 6, b: 7, op: "multiply" })).toBe("42");
    await client.close();
});

test("a tool error becomes a thrown error", async () => {
    const client = await connect(createServer([calculator]));
    const [tool] = await toolsFromServer(client);

    await expect(Promise.resolve(tool.run({ a: 1, b: 0, op: "divide" }))).rejects.toThrow("Cannot divide by zero");
    await client.close();
});

test("the AGENT01 agent runs unchanged on server tools", async () => {
    const client = await connect(createServer([calculator, ...createNoteTools()]));
    const model = new ScriptedModel([
        callTools(["n1", "add_note", { text: "Rent is 4200" }]),
        callTools(["c1", "calculator", { a: 1, b: 0, op: "divide" }]),
        answer("Done."),
    ]);

    const result = await runAgent(model, await toolsFromServer(client), "Save a note and divide.");

    expect(result.text).toBe("Done.");
    expect(model.requests[0].tools.map(tool => tool.name)).toEqual(["calculator", "add_note", "search_notes"]);
    expect(model.requests[1].messages[2]).toEqual({
        role: "tool",
        results: [{ callId: "n1", content: "Saved note 1", isError: false }],
    });
    expect(model.requests[2].messages[4]).toEqual({
        role: "tool",
        results: [{ callId: "c1", content: "Cannot divide by zero", isError: true }],
    });
    await client.close();
});
