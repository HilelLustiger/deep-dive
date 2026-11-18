import { expect, test } from "vitest";
import { createServer } from "../src/server.ts";
import { calculator, createNoteTools, type Tool } from "../src/tools.ts";
import { connect } from "./helpers.ts";

test("lists every tool with its description and schema", async () => {
    const client = await connect(createServer([calculator, ...createNoteTools()]));
    const { tools } = await client.listTools();

    expect(tools.map(tool => tool.name)).toEqual(["calculator", "add_note", "search_notes"]);
    expect(tools[0].description).toBe(calculator.description);
    expect(tools[0].inputSchema).toEqual(calculator.inputSchema);
    await client.close();
});

test("a call returns the tool's text", async () => {
    const client = await connect(createServer([calculator]));
    const result = await client.callTool({ name: "calculator", arguments: { a: 6, b: 7, op: "multiply" } });

    expect(result.content).toEqual([{ type: "text", text: "42" }]);
    expect(result.isError).toBeFalsy();
    await client.close();
});

test("a tool that throws gives an error result", async () => {
    const client = await connect(createServer([calculator]));
    const result = await client.callTool({ name: "calculator", arguments: { a: 1, b: 0, op: "divide" } });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([{ type: "text", text: "Cannot divide by zero" }]);
    await client.close();
});

test("the input is checked against the schema before the tool runs", async () => {
    let ran = false;
    const spy: Tool = { ...calculator, run: () => { ran = true; return "ran"; } };
    const client = await connect(createServer([spy]));
    const result = await client.callTool({ name: "calculator", arguments: { a: "6", b: 7, op: "multiply" } });

    expect(result.isError).toBe(true);
    expect(ran).toBe(false);
    await client.close();
});

test("tools keep their state between calls", async () => {
    const client = await connect(createServer(createNoteTools()));
    await client.callTool({ name: "add_note", arguments: { text: "Dentist on Tuesday" } });
    const result = await client.callTool({ name: "search_notes", arguments: { query: "dentist" } });

    expect(result.content).toEqual([{ type: "text", text: "Dentist on Tuesday" }]);
    await client.close();
});

test("an unknown tool is a protocol error", async () => {
    const client = await connect(createServer([calculator]));

    await expect(client.callTool({ name: "weather", arguments: {} })).rejects.toThrow("weather");
    await client.close();
});
