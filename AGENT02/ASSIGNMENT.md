# Assignment AGENT02 — MCP Server (TypeScript)

**Topics:** the Model Context Protocol, hosts, clients and servers, `tools/list` and `tools/call`, the stdio transport, protocol errors vs. tool errors, input validation against a schema, the MCP Inspector, using a server's tools in your own agent

**Before this:** AGENT01. This assignment reuses its code.

## Introduction

In AGENT01 the tools lived inside the agent: `calculator` and the note tools were objects in the same program as the loop. That works for one agent. But the same tools are useful elsewhere: in Claude Code, in an editor, in someone else's agent. Without a standard, each of those apps needs its own integration for each tool.

The **Model Context Protocol (MCP)** is that standard. A **server** is a program that offers tools. A **client** connects to a server, asks it which tools it has (`tools/list`), and calls them (`tools/call`). The app the client lives in, Claude Code or your agent, is the **host**. Write a server once, and every host that speaks MCP can use its tools.

Under the hood, client and server exchange JSON-RPC messages. With the **stdio** transport the host starts the server as a child process, and they talk over its standard input and output. With **Streamable HTTP** the server runs somewhere else and many clients reach it over the network. This assignment uses stdio, and an in-memory transport for tests.

MCP servers can offer more than tools: **resources** (data the app can read, like files) and **prompts** (templates the user picks). This assignment is about tools only.

You'll do two things with AGENT01's tools:

1. Put them in an **MCP server**, so any MCP host can use them.
2. Connect your **AGENT01 agent** to that server, so it uses tools it didn't define. The agent loop doesn't change at all: a tool from a server looks like any other tool.

The assignment has five parts, 0 to 4. Do them in order, and write the tests for each part before moving to the next one.

Names given in **bold code** are required, because the tests and later parts use them. Everything else is up to you.

### What you build

| Part | File | What |
|---|---|---|
| 0 | `package.json`, `src/` from AGENT01, `tests/helpers.ts` | The project |
| 1 | `src/server.ts` | `createServer`: an MCP server that offers a list of tools |
| 2 | `src/serve.ts` | A script that runs the server over stdio, and trying it in the MCP Inspector |
| 3 | `src/mcp-tools.ts` | `toolsFromServer`: a server's tools, as AGENT01 `Tool` objects |
| 4 | `src/main.ts` | The AGENT01 agent, with its tools from the server |

In all, about 70 lines of code, plus tests, and part of it is given.

### Learning outcomes

By the end of this assignment you can:

1. Explain what MCP standardizes, and the roles of host, client and server.
2. Expose tools from an MCP server, and say what `tools/list` and `tools/call` carry.
3. Tell a protocol error from a tool error, and say which one a model can recover from.
4. Run a server over stdio, and inspect it with the MCP Inspector.
5. Use a server's tools in your own agent without changing the agent.

---

## Reading

### Before you start

1. **[MCP — Architecture overview](https://modelcontextprotocol.io/docs/learn/architecture)**, the sections "Participants", "Layers" and "Primitives", and in "Example" the steps "Tool Discovery" and "Tool Execution".
   Host, client and server; the data layer (JSON-RPC) and the transport layer (stdio, Streamable HTTP); and one `tools/list` and one `tools/call`, as the actual JSON that goes over the wire.
   *Parts 1–3.*
2. **[MCP — Understanding MCP servers](https://modelcontextprotocol.io/docs/learn/server-concepts)**, the table "Core Server Features" and the section "Tools".
   Tools, resources and prompts, and who controls each: the model, the app, or the user.
   *Part 1.*
3. **[MCP specification — Tools](https://modelcontextprotocol.io/specification/latest/server/tools)**, the sections "Listing Tools", "Calling Tools", "Tool Result" up to "Text Content", and "Error Handling".
   The exact messages, and the two kinds of errors: a **protocol error** for an unknown tool, and a result with `isError: true` for a tool that failed. Compare the second with AGENT01 Part 4.
   *Parts 1 and 3.*
4. **[MCP — MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector)**, the section "Quickstart".
   The tool you'll use to try your server by hand.
   *Part 2.*

### Going deeper

- **[MCP — Build an MCP server](https://modelcontextprotocol.io/docs/develop/build-server)** and **[Build an MCP client](https://modelcontextprotocol.io/docs/develop/build-client)**. The official tutorials, with a weather server and a chat client.
- **[MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)**. The SDK you use here, with examples for HTTP servers, resources and prompts.
- **[MCP specification — Tools](https://modelcontextprotocol.io/specification/latest/server/tools)**, the whole page: structured output and output schemas, and the section "Stateful Tools" on keeping state between calls.
- **[Claude Code — Connect Claude Code to tools via MCP](https://code.claude.com/docs/en/mcp)**. How a real host adds and manages servers.

---

## Part 0 — Project setup

Finish AGENT01 first. Then, in this folder:

- Copy your AGENT01 code: `src/tools.ts`, `src/run-tools.ts`, `src/agent.ts` and `src/model/`. Not `src/main.ts`; Part 4 writes a new one. Not the tests either.
- `package.json` and `tsconfig.json` like AGENT01's, with two more dependencies: `@modelcontextprotocol/server` and `@modelcontextprotocol/client`. These are the official MCP SDK, version 2. Older tutorials use `@modelcontextprotocol/sdk`, which is version 1, with different imports.
- Run `npm install`.

Tests connect a client and a server inside one process, with no child process and no network: the SDK's **`InMemoryTransport`** gives two linked ends, one for each side. Copy this file as it is to `tests/helpers.ts`. It's test plumbing, not part of the assignment:

```ts
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport, type McpServer } from "@modelcontextprotocol/server";

// Connects a client to a server in the same process, with no subprocess and no network.
export async function connect(server: McpServer): Promise<Client> {
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await server.connect(serverSide);
    const client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(clientSide);
    return client;
}
```

A test then talks to the server the way any host would:

```ts
const client = await connect(createServer([calculator]));
const { tools } = await client.listTools();                                     // tools/list
const result = await client.callTool({ name: "calculator", arguments: { ... } });  // tools/call
await client.close();
```

Check that `npx tsc --noEmit` passes.

---

## Part 1 — The server

**File:** `src/server.ts`

Write **`createServer(tools: Tool[]): McpServer`**:

1. Create the server: `new McpServer({ name: "agent-tools", version: "1.0.0" })`. The name and version are what the server tells clients about itself.
2. For each tool, register it with `server.registerTool(name, config, handler)`:
   - `name`: the tool's `name`.
   - `config`: `{ description: tool.description, inputSchema: fromJsonSchema(tool.inputSchema as JsonSchemaType) }`.
   - `handler`: an `async` function that gets the input and returns a result, described below.
3. Return the server.

Import `McpServer`, `fromJsonSchema` and the type `JsonSchemaType` from `"@modelcontextprotocol/server"`.

**Why `fromJsonSchema`.** The SDK's examples describe input with Zod, a schema library. Your tools already have a JSON Schema, and `fromJsonSchema` wraps it into what the SDK expects. The cast `as JsonSchemaType` is needed because AGENT01 typed `properties` loosely, as `Record<string, unknown>`.

The SDK then uses the schema twice: it sends it to clients in `tools/list`, and it **checks every call's input against it** before your handler runs. A call with `a: "6"` (a string) never reaches the calculator; the client gets an error result instead.

**The handler.** An MCP tool result is `{ content: [...], isError?: boolean }`, where `content` is a list of blocks: text, images and more. Your tools return text, so:

- Run the tool: `await tool.run(input as Record<string, unknown>)`. The cast is for the same reason as above.
- On success, return `{ content: [{ type: "text", text }] }`.
- If it throws, return `{ content: [{ type: "text", text: message }], isError: true }`, where `message` is the error's `message`, or `String(error)` when it isn't an `Error`. Same as AGENT01 Part 4.

You don't handle unknown tools. A call to a tool the server doesn't have is a **protocol error**: the SDK answers it with a JSON-RPC error, and `client.callTool` throws.

### Test that:

In `tests/server.test.ts`, with `connect` from `tests/helpers.ts`, and `await client.close()` at the end of each test:

- **Listing:** with the tools `[calculator, ...createNoteTools()]`, `listTools()` gives the names `["calculator", "add_note", "search_notes"]`, in that order. The first tool's `description` is `calculator.description`, and its `inputSchema` equals `calculator.inputSchema` (`toEqual`).
- **A call:** with `[calculator]`, calling `calculator` with `{ a: 6, b: 7, op: "multiply" }` gives `content` equal to `[{ type: "text", text: "42" }]`, and `isError` is falsy (`toBeFalsy`: the field may be missing).
- **A tool error:** dividing `1` by `0` gives `isError: true` and `content` equal to `[{ type: "text", text: "Cannot divide by zero" }]`.
- **The schema is checked before the tool runs:** make a copy of the calculator whose `run` sets a flag: `let ran = false; const spy = { ...calculator, run: () => { ran = true; return "ran"; } }`. Serve `[spy]` and call it with `{ a: "6", b: 7, op: "multiply" }`. The result has `isError: true`, and `ran` is still `false`.
- **State between calls:** with `createNoteTools()`, call `add_note` with `{ text: "Dentist on Tuesday" }`, then `search_notes` with `{ query: "dentist" }`. The second result's `content` is `[{ type: "text", text: "Dentist on Tuesday" }]`.
- **An unknown tool is a protocol error:** with `[calculator]`, `client.callTool({ name: "weather", arguments: {} })` rejects, and the error message contains `"weather"`: `await expect(...).rejects.toThrow("weather")`.

---

## Part 2 — Running over stdio

**File:** `src/serve.ts`

A host starts a stdio server as a child process and writes JSON-RPC messages to its standard input; the server answers on its standard output. `src/serve.ts`:

```ts
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./server.ts";
import { calculator, createNoteTools } from "./tools.ts";

const server = createServer([calculator, ...createNoteTools()]);
await server.connect(new StdioServerTransport());
console.error("MCP server running on stdio");
```

**Never write to standard output in a stdio server.** Standard output is the protocol channel, and a stray `console.log` puts text that isn't JSON-RPC into it, which breaks the client. Logs go to standard error: `console.error`.

The notes live in the server process's memory. They last as long as the process does, across calls and across clients, and are gone when it stops.

### Try it

The **MCP Inspector** is a host for testing servers by hand. It starts your server and shows its tools in the browser:

```
npx @modelcontextprotocol/inspector node src/serve.ts
```

Connect, open the Tools tab, and:

- List the tools, and compare what you see with your `inputSchema`s.
- Call `calculator` with valid input, then with a division by zero (a tool error), then with `a` set to text (the schema check).
- Add a note, then search for it.

The Inspector also shows the raw JSON-RPC messages, the same `tools/list` and `tools/call` as in the reading.

**In a real host.** If you use Claude Code, you can give it your tools. Run from this folder, with the full path to the file:

```
claude mcp add agent-tools -- node /full/path/to/AGENT02/src/serve.ts
```

Start a new Claude Code session, run `/mcp` to see the server, and ask for something that needs your calculator or notes. `claude mcp remove agent-tools` removes it.

No tests in this part.

---

## Part 3 — Server tools in your agent

**File:** `src/mcp-tools.ts`

The other direction: your AGENT01 agent as an MCP host. The agent takes `Tool` objects, so the job is to turn each of the server's tools into one. Write **`toolsFromServer(client: Client): Promise<Tool[]>`**:

1. Ask the server for its tools: `const { tools } = await client.listTools()`.
2. Turn each listed tool into a `Tool`:
   - `name`: the same.
   - `description`: `listed.description ?? ""`. It's optional in MCP.
   - `inputSchema`: `listed.inputSchema as JsonSchema`, the type from `src/model/types.ts`.
   - `run`: an `async` function that calls the server: `await client.callTool({ name, arguments: input })`. From the result, join the `text` of every block whose `type` is `"text"` with `"\n"`, skipping other blocks. If `result.isError` is true, **throw** an `Error` with that text; otherwise return it.

Import the type `Client` from `"@modelcontextprotocol/client"`.

Why throw on `isError`? Because AGENT01's `runToolCalls` already turns a thrown error into a result with `isError: true`. The server's tool error becomes the model's tool error, with no new code in the agent.

`run` is a closure: each one remembers the `client` and its tool's `name`, the same pattern as `createNoteTools` in AGENT01.

### Test that:

In `tests/mcp-tools.test.ts`, with `connect` and a server from `createServer`:

- **Server tools look like local tools:** with a server of `[calculator, ...createNoteTools()]`, `toolsFromServer` gives the names `["calculator", "add_note", "search_notes"]`. The first one's `description` and `inputSchema` equal the calculator's, and `run({ a: 6, b: 7, op: "multiply" })` gives `"42"`.
- **A tool error becomes a thrown error:** with a server of `[calculator]`, running the tool with `{ a: 1, b: 0, op: "divide" }` rejects with `"Cannot divide by zero"`. `run` may return a plain string, so wrap it: `await expect(Promise.resolve(tool.run(...))).rejects.toThrow(...)`.
- **The AGENT01 agent runs unchanged on server tools:** with a server of `[calculator, ...createNoteTools()]`, run `runAgent` with `await toolsFromServer(client)` and a `ScriptedModel` of: `callTools(["n1", "add_note", { text: "Rent is 4200" }])`, then `callTools(["c1", "calculator", { a: 1, b: 0, op: "divide" }])`, then `answer("Done.")`.
  - The result's `text` is `"Done."`.
  - The first request's tool names are `["calculator", "add_note", "search_notes"]`.
  - The second request's `messages[2]` is `{ role: "tool", results: [{ callId: "n1", content: "Saved note 1", isError: false }] }`.
  - The third request's `messages[4]` is `{ role: "tool", results: [{ callId: "c1", content: "Cannot divide by zero", isError: true }] }`.

---

## Part 4 — The agent with a server

**File:** `src/main.ts`

The AGENT01 script, with one change: the tools come from the server, which the script starts as a child process.

```ts
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { formatTranscript, runAgent } from "./agent.ts";
import { toolsFromServer } from "./mcp-tools.ts";
import { modelFromEnv } from "./model/index.ts";

const prompt = process.argv.slice(2).join(" ");
if (!prompt) {
    console.error('Usage: node src/main.ts "your request"');
    process.exit(1);
}

const client = new Client({ name: "agent", version: "1.0.0" });
await client.connect(new StdioClientTransport({ command: "node", args: ["src/serve.ts"] }));
try {
    const tools = await toolsFromServer(client);
    const result = await runAgent(modelFromEnv(), tools, prompt, {
        system: "You are a helpful assistant. Use the tools when they help.",
    });
    console.log(formatTranscript(result.messages).join("\n"));
    console.log(`(${result.steps} steps, stopped by: ${result.stopReason})`);
} finally {
    await client.close();
}
```

`StdioClientTransport` starts `node src/serve.ts` and talks to it over its standard input and output. `client.close()` stops it; the `finally` makes sure that happens even when the agent throws.

Run it the same way as in AGENT01, with Ollama or Claude:

```
node src/main.ts "Save a note that the dentist is on Tuesday at 10, then find my notes about the dentist."
```

The transcript looks the same as in AGENT01, but every tool call now crosses a process boundary: your agent sends `tools/call` to the server, and the server runs the tool.

No tests in this part.

---

## Running the tests

```
npx tsc --noEmit     # type check
npx vitest run       # all tests; none of them calls a real model or starts a process
```
