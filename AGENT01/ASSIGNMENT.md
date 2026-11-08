# Assignment AGENT01 — Agents From Scratch (TypeScript)

**Topics:** tools and tool definitions, JSON Schema for tool input, tool calls and tool results, call ids, parallel tool calls, the agent loop, stop reasons, step limits, tool errors as results, provider-neutral interfaces

## Introduction

A language model on its own can only write text. It can't look anything up, can't do reliable arithmetic, and can't change anything in the world. An **agent** is a model that can act: you give it **tools**, and it decides on its own which ones to use, in what order, until the task is done.

A tool is a function in your program. The model never runs it. What happens is a conversation:

1. You send the model the user's request, plus a description of each tool: its name, what it's for, and the shape of its input as a **JSON Schema**.
2. The model answers with a **tool call** instead of text: "call `calculator` with `{ a: 6, b: 7, op: "multiply" }`".
3. Your code runs the function and sends the output back to the model as a **tool result**.
4. The model reads the result and either calls more tools or writes its final answer.

Steps 2 to 4 repeat in a loop, the **agent loop**, until the model stops asking for tools. That loop is the whole idea. Frameworks hide it, and most of what they add is built around it. In this assignment you write it yourself, in about twenty lines.

Every provider supports tool calling, and every provider formats it differently. Claude returns `tool_use` blocks with an `id`, and takes `tool_result` blocks back in a *user* message. OpenAI returns `arguments` as a JSON *string* and takes `function_call_output` items. Ollama gives calls no id at all, and matches results by tool name. The ideas are the same everywhere, so your agent talks to one small interface, **`ChatModel`**, and the provider details live behind it.

That interface and two implementations of it are **given**: one for Claude, and one for a local model through Ollama. You write the agent. In LLM02 you build a client like this yourself, and you'll see what's inside.

The assignment has six parts, 0 to 5. Do them in order, and write the tests for each part before moving to the next one.

### What you build

| Part | File | What |
|---|---|---|
| 0 | `package.json`, `tsconfig.json` | The project |
| 1 | `src/tools.ts` | The `Tool` type, `toSpecs`, and three tools: `calculator`, `add_note`, `search_notes` |
| 2 | `src/run-tools.ts` | `runToolCalls`: runs the model's tool calls and collects their results |
| 3 | `src/agent.ts` | `runAgent`: the agent loop |
| 4 | `src/run-tools.ts` | Changes to `runToolCalls`: unknown tools and thrown errors become error results |
| 5 | `src/agent.ts`, `src/main.ts` | `formatTranscript`, and a script that runs the agent on a real model |

In all, about 200 lines of code, plus tests.

Names given in **bold code** are required, because the tests and later parts use them. Everything else is up to you.

### Learning outcomes

By the end of this assignment you can:

1. Define a tool for a model: a name, a description and a JSON Schema for its input, and explain why the description matters as much as the code.
2. Explain the round trip of a tool call: what the model sends, what your code runs, and what goes back, and how a result is matched to its call.
3. Write the agent loop, and say when it stops: an answer, a step limit, a cut-off answer or a refusal.
4. Handle several tool calls in one reply.
5. Turn tool failures into results the model can read and recover from, instead of crashes.
6. Explain why the agent talks to a provider-neutral interface, and what each provider does differently behind it.

### The given code

These files are in `src/model/`. Don't change them.

| File | What it is |
|---|---|
| `types.ts` | The interface: `ChatModel`, `Message`, `ToolSpec`, `ToolCall`, `ToolResult` and the rest. Read it first, it's short and every type has a comment. |
| `anthropic.ts` | `AnthropicModel`, a `ChatModel` for Claude, through the official SDK. |
| `ollama.ts` | `OllamaModel`, a `ChatModel` for a local model, over Ollama's HTTP API. |
| `scripted.ts` | `ScriptedModel`, a fake `ChatModel` for tests, with two helpers: `answer` and `callTools`. |
| `index.ts` | `modelFromEnv()`, which picks a provider from environment variables. Used in Part 5. |

A conversation is a list of three kinds of messages:

```ts
{ role: "user", text: "What is 6 times 7?" }
{ role: "assistant", text: "", toolCalls: [{ id: "c1", name: "calculator", input: { a: 6, b: 7, op: "multiply" } }] }
{ role: "tool", results: [{ callId: "c1", content: "42", isError: false }] }
```

`model.complete({ system, messages, tools })` sends the whole list and returns a **`ModelReply`**: the new assistant message, and a `stopReason` that says why the model stopped: `"end"`, `"tool_calls"`, `"max_tokens"` or `"refusal"`. The model keeps no memory between calls. Each request carries the full conversation.

### Testing without a real model

A real model is slow, costs money (or a local GPU), and answers differently each time, so the tests use `ScriptedModel`. You give it the replies it should return, in order, and afterwards you check what the agent sent it:

```ts
import { answer, callTools, ScriptedModel } from "../src/model/scripted.ts";

const model = new ScriptedModel([
    callTools(["c1", "calculator", { a: 6, b: 7, op: "multiply" }]),  // first reply: one tool call
    answer("6 times 7 is 42."),                                       // second reply: the answer
]);

// ... run your agent with `model` ...

model.requests;                  // every request the agent sent, in order
model.requests[1].messages;      // the conversation as the model saw it on the second call
```

`callTools` takes any number of calls, each as `[id, name, input]`. If the agent asks for more replies than the script has, `complete` throws.

You need a real model only in Part 5.

---

## Reading

### Before you start

The goal here is to know the vocabulary and the shape of the problem before you write code.

1. **[Anthropic — Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)**, the sections "What are agents?", "Building block: The augmented LLM" and "Agents", and "Appendix 2: Prompt engineering your tools".
   What an agent is, a model that "dynamically directs its own processes and tool usage", and why a tool's name, description and input deserve as much care as its code. Written by a provider, but nothing in these sections is specific to one.
   *Parts 1 and 3.*
2. **[Claude docs — Tool use with Claude](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)**, the section "How tool use works".
   One full round trip in code: a tool definition, the `tool_use` block that comes back, running it, and the `tool_result` that goes back with the same id. This is what `AnthropicModel` does for you.
   *Parts 1–3.*
3. **[OpenAI — Function calling](https://developers.openai.com/api/docs/guides/function-calling)**, the sections "How it works" and "Handling function calls".
   The same round trip with another provider's names: `call_id`, `function_call_output`, and arguments that arrive as a JSON string. Read it next to the previous one and notice what's the same.
   *Parts 1–3.*
4. **[JSON Schema — Creating your first schema](https://json-schema.org/learn/getting-started-step-by-step)**, up to and including "Define properties".
   `type`, `properties`, `required` and `description`: all you need to describe a tool's input.
   *Part 1.*
5. **[Ollama — Tool calling](https://docs.ollama.com/capabilities/tool-calling)**
   How a local model takes tools and returns calls. Compare it with what `src/model/ollama.ts` does: calls without ids, and results matched by `tool_name`.
   *Part 5.*

### Going deeper

- **[Anthropic — Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)**, the whole article. The workflow patterns in it are AGENT04.
- **[Claude docs — Handle tool calls](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)** and **[Parallel tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/parallel-tool-use)**. How results are formatted, how errors are signaled with `is_error`, and why all results of one turn go back in one message.
- **[Claude docs — Tutorial: Build a tool-using agent](https://platform.claude.com/docs/en/agents-and-tools/tool-use/build-a-tool-using-agent)**. The same loop you write here, grown step by step with one provider's SDK.
- **[Lilian Weng — LLM Powered Autonomous Agents](https://lilianweng.github.io/posts/2023-06-23-agent/)** (2023). An overview of agents as planning, memory and tool use, with the research behind each.
- **[Yao et al. — ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)** (2022). The paper behind the loop: the model alternates reasoning and actions, and reads each action's result before the next step.

---

## Part 0 — Project setup

Set up a TypeScript project in this folder, with Node 24, the same way as LLM02:

- `package.json` with `"type": "module"`.
  - Dependency: `@anthropic-ai/sdk`. The given `anthropic.ts` uses it.
  - Dev dependencies: `typescript`, `vitest` and `@types/node`.
  - Two scripts: `"typecheck": "tsc --noEmit"` and `"test": "vitest run"`.
- `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "target": "esnext",
      "module": "nodenext",
      "noEmit": true,
      "rewriteRelativeImportExtensions": true,
      "erasableSyntaxOnly": true,
      "verbatimModuleSyntax": true,
      "skipLibCheck": true,
      "types": ["node"]
    },
    "include": ["src", "tests"]
  }
  ```
- A `tests/` folder. `src/model/` is already there.

Run `npm install` to install the packages.

Node 24 runs `.ts` files directly (`node src/main.ts`) by deleting the types, without checking them. That's why imports between your own files name the file with its extension, `import { runAgent } from "./agent.ts"`, and an import used only as a type says so: `import type { Message } from "./model/types.ts"`. The `tsconfig.json` above makes `tsc` report both mistakes.

Check that `npx tsc --noEmit` passes. That also checks the given code.

---

## Part 1 — Tools

**File:** `src/tools.ts`

A tool has two halves. The model sees the **spec**: a name, a description and an input schema (`ToolSpec` in `types.ts`, imported with `import type { ToolSpec } from "./model/types.ts"`). Your program keeps the **function** that does the work. Write:

- **`interface Tool extends ToolSpec`**, with one more member: **`run(input: Record<string, unknown>): string | Promise<string>`**. A tool returns text, because text is what goes back to the model. `run` may be `async`.
- **`toSpecs(tools: Tool[]): ToolSpec[]`**: each tool's `name`, `description` and `inputSchema`, without `run`. This is what the model is sent: a function can't be sent anywhere.

`input` is whatever the model wrote. The schema tells the model what to send, but nothing forces it to, so `run` checks what it needs and **throws an `Error`** with a clear message when the input is wrong. Part 4 turns those errors into results the model can read.

A whole tool, on an unrelated example:

```ts
const shout: Tool = {
    name: "shout",
    description: "Turn text into capital letters.",
    inputSchema: {
        type: "object",
        properties: {
            text: { type: "string", description: "The text to shout" },
        },
        required: ["text"],
    },
    run(input) {
        if (typeof input.text !== "string") {
            throw new Error("text must be a string");
        }
        return input.text.toUpperCase();
    },
};
```

Inside `run`, `input.text` has the type `unknown`, so TypeScript makes you check it before you use it. That check is the input validation.

### The calculator

Models are bad at exact arithmetic, so this is the classic first tool. **`calculator: Tool`**, a constant:

- `name`: `"calculator"`.
- `description`: say what it does and when to use it, for example "Do one arithmetic operation on two numbers. Use it for any arithmetic instead of computing in your head." The model decides whether to call a tool from its description alone.
- `inputSchema`: three required properties, each with a `description`: `a` and `b` of type `"number"`, and `op` of type `"string"` with `enum: ["add", "subtract", "multiply", "divide"]`.
- `run`: returns the result as a string, `String(a * b)`. It throws when `a` or `b` isn't a number (`typeof a !== "number"`), when `op` isn't one of the four, with a message that lists the valid ones, and when dividing by zero, with the message `"Cannot divide by zero"`.

### Notes

Two tools that share a list of notes: the first tool with **state**. **`createNoteTools(notes: string[] = []): Tool[]`** returns two tools, in this order:

- **`add_note`**, input `{ text: string }`: adds `text` to `notes` and returns `` `Saved note ${notes.length}` ``. Throws if `text` isn't a non-empty string.
- **`search_notes`**, input `{ query: string }`: returns every note that contains `query`, ignoring case, joined with `"\n"`, or `"No notes match."` when none do. Throws if `query` isn't a string.

Both tools use the same `notes` array, the one passed in or the default. That works because each `run` is a function created *inside* `createNoteTools`, so it can use the function's parameters even after `createNoteTools` has returned. This is a **closure**. On an unrelated example:

```ts
function createCounter() {
    let count = 0;
    return {
        increment: () => ++count,
        current: () => count,
    };
}

const a = createCounter();
a.increment();
a.increment();
a.current();                    // 2
createCounter().current();      // 0: a second call gets its own count
```

The `notes` parameter lets a test pass its own array and look inside it afterwards.

### Test that:

In `tests/tools.test.ts`:

- `calculator.run` with `{ a: 6, b: 7, op: "multiply" }` returns `"42"`, and with `{ a: 1, b: 4, op: "divide" }` returns `"0.25"`.
- It throws on division by zero, on `a: "1"` (a string), and on `op: "power"`, and that last message contains `"power"`.
- `add_note` returns `"Saved note 1"`, then `"Saved note 2"`. `search_notes` finds a note with a different case (`"dentist"` finds `"Dentist on Tuesday"`), and returns `"No notes match."` for a word that isn't there. The array you passed in has 2 notes.
- Two calls to `createNoteTools()` without an argument don't share notes: a note added with the first set isn't found by the second.
- `toSpecs([calculator])` equals `[{ name, description, inputSchema }]` of the calculator, and `"run" in specs[0]` is `false`.

---

## Part 2 — Running tool calls

**File:** `src/run-tools.ts`

When the model asks for tools, its message has a list of **`ToolCall`**s: `{ id, name, input }`. Write:

- **`runToolCalls(calls: ToolCall[], tools: Tool[]): Promise<ToolResultsMessage>`**:
  1. For each call, in order, find the tool with that `name` in `tools`.
  2. Run it with `call.input`, and wait for the output: `await tool.run(call.input)` works whether `run` returns a string or a promise.
  3. Make a **`ToolResult`**: `{ callId: call.id, content: output, isError: false }`.
  4. Return one message with all the results, in the same order as the calls: `{ role: "tool", results }`.

The `callId` is how the model knows which result belongs to which call. A model can ask for several tools in one reply, **parallel tool calls**, and all of their results go back in **one** message.

For now, assume every call names a tool that exists and that no tool throws. Part 4 handles both.

The calls run one after another. They could also run at the same time, with `Promise.all`, since you'd still put the results in call order. One after another is simpler, and safer when tools change shared state, like the notes.

### Test that:

In `tests/run-tools.test.ts`:

- With the tools `[calculator, ...createNoteTools()]`, two calls, `calculator` with `{ a: 2, b: 3, op: "add" }` as `"c1"` and `add_note` with `{ text: "hi" }` as `"c2"`, give `{ role: "tool", results: [...] }` with `"5"` for `"c1"` and `"Saved note 1"` for `"c2"`, in that order, both with `isError: false`.
- An `async` tool's output is in the result. Write a small tool inside the test: `{ name: "slow", description: "", inputSchema: { type: "object", properties: {} }, run: async () => "done" }`.

---

## Part 3 — The agent loop

**File:** `src/agent.ts`

Write:

- **`interface AgentOptions`**: **`system?: string`**, the system prompt, and **`maxSteps?: number`**, default `10`.
- **`interface AgentResult`**:
  - **`text: string`**: the final answer.
  - **`messages: Message[]`**: the whole conversation, from the user's message to the last one.
  - **`steps: number`**: how many times the model was called.
  - **`stopReason`**: why the loop stopped: `"end"`, `"max_tokens"`, `"refusal"` or `"max_steps"`. Its type is `Exclude<StopReason, "tool_calls"> | "max_steps"`: every `StopReason` except `"tool_calls"`, which never ends the loop, plus `"max_steps"`.
- **`runAgent(model: ChatModel, tools: Tool[], prompt: string, options: AgentOptions = {}): Promise<AgentResult>`**:
  1. Start the conversation with one message: `{ role: "user", text: prompt }`.
  2. Repeat, at most `maxSteps` times, where `maxSteps` is `options.maxSteps ?? 10`. A `for (let step = 1; step <= maxSteps; step++)` loop gives you the step number for the result:
     1. Call `model.complete({ system: options.system, messages, tools: toSpecs(tools) })`.
     2. Add `reply.message` to the conversation.
     3. If `reply.stopReason` isn't `"tool_calls"`, the model is done: return `{ text: reply.message.text, messages, steps, stopReason: reply.stopReason }`.
     4. Otherwise run the calls with `runToolCalls(reply.message.toolCalls, tools)` and add the results message to the conversation.
  3. If the loop ran `maxSteps` times without an answer, return `{ text: "", messages, steps: maxSteps, stopReason: "max_steps" }`.

Three rules hide in these steps:

- **The conversation grows by two messages per tool round**: the assistant's calls, then their results. The model needs both to know what it asked for and what came back.
- **Add the assistant message exactly as it came**, the same object, not one you built from its fields. It may carry provider data in `raw` that the provider needs back unchanged. Claude, for example, sends its reasoning as *thinking blocks*, and rejects a conversation where they were changed or dropped.
- **The step limit is a safety net.** A model can keep calling tools forever, for example when a tool keeps failing and it keeps retrying. Without a limit, that's an endless loop that costs money on every turn.

Stopping on `"max_tokens"` and `"refusal"` matters too: a reply cut off at the output limit may contain half a tool call, and a refusal is final.

### Test that:

In `tests/agent.test.ts`, with `ScriptedModel`:

Unless a test says otherwise, the tools are `[calculator]` and the prompt can be anything.

- **One tool round, then an answer:** the script is `callTools(["c1", "calculator", { a: 6, b: 7, op: "multiply" }])` then `answer("6 times 7 is 42.")`, with `system: "Be brief."`.
  - The result's `text` is `"6 times 7 is 42."`, `steps` is `2` and `stopReason` is `"end"`.
  - `model.requests` has 2 requests. In the first, `system` is `"Be brief."` and the tool names (`tools.map(t => t.name)`) are `["calculator"]`.
  - In the second, the message roles (`messages.map(m => m.role)`) are `["user", "assistant", "tool"]`, and the `tool` message equals `{ role: "tool", results: [{ callId: "c1", content: "42", isError: false }] }`.
- **No tools needed:** a script of `answer("Hello!")` gives `text: "Hello!"`, `steps: 1` and `stopReason: "end"`, and `messages` has 2 messages.
- **The assistant message is added as it came:** `const reply = callTools(["c1", "calculator", { a: 1, b: 1, op: "add" }])`, set `reply.message.raw = { secret: "provider data" }`, and use a script of `reply` then `answer("2")`. `result.messages[1]` is `reply.message` itself (`toBe`, not `toEqual`).
- **The step limit:** a script of four replies, each `callTools(["c", "calculator", { a: 1, b: 1, op: "add" }])`, with `maxSteps: 3`, gives `text: ""`, `steps: 3` and `stopReason: "max_steps"`, and `model.requests` has exactly 3 requests.
- **`max_tokens` stops the loop:** `const cut = answer("The answer is")`, set `cut.stopReason = "max_tokens"`, and use a script of `cut` alone. The result has `text: "The answer is"` and `stopReason: "max_tokens"`.
- **Parallel calls:** with the tools `createNoteTools()`, a script of `callTools(["n1", "add_note", { text: "a" }], ["n2", "add_note", { text: "b" }])` then `answer("Saved both.")`. The second request has 3 messages, and the last one is a `tool` message with both results: `"Saved note 1"` for `"n1"` first, then `"Saved note 2"` for `"n2"`.

---

## Part 4 — Tool errors

**File:** `src/run-tools.ts`

Two things can go wrong when running a call, and neither should stop the agent:

- The model names a tool that doesn't exist. Models do this, especially small ones.
- The tool throws: bad input, division by zero, a failed network request.

If `runToolCalls` throws, the whole run fails and the conversation is lost. If it instead sends the error back as a result, the model can read it and fix its call: use the right tool name, change the input, or tell the user it can't be done. That's why `ToolResult` has `isError`: every provider has a way to mark a result as failed.

Change `runToolCalls` so that each call always produces a result:

- **Unknown tool:** `isError: true`, and a `content` that names the tool that was asked for and lists the ones that exist, for example `Unknown tool "weather". Available tools: calculator, add_note`.
- **The tool throws:** catch it. `isError: true`, and `content` is the error's `message`. Anything can be thrown, not only an `Error`, so when the caught value isn't an `Error` (`error instanceof Error` is false), use `String(error)`.

Write error messages for the model, the same way you'd write them for a person: say what was wrong and what would be right. "Unknown op "power". Use one of: add, subtract, multiply, divide" lets the model fix its call; "Invalid input" doesn't.

### Test that:

In `tests/run-tools.test.ts`:

- A call to `"weather"` with the tools `[calculator]` gives a result with `isError: true`, whose `content` contains `"weather"` and `"calculator"`.
- A call `{ id: "d", name: "calculator", input: { a: 1, b: 0, op: "divide" } }` gives `{ callId: "d", content: "Cannot divide by zero", isError: true }`.
- A tool whose `run` does `throw "nope"` (a string, not an `Error`) gives `content: "nope"`.

In `tests/agent.test.ts`:

- **The model sees the error and recovers:** the script divides `10` by `0` as `"c1"`, then divides `10` by `2` as `"c2"`, then answers `"10 / 2 = 5"`. The result's `text` is that answer, and the second request's `tool` message has `{ callId: "c1", content: "Cannot divide by zero", isError: true }`.

---

## Part 5 — Running it for real

**Files:** `src/agent.ts`, `src/main.ts`

### The transcript

To see what an agent did, print its conversation. In `src/agent.ts`, write **`formatTranscript(messages: Message[]): string[]`**, one line per item:

- A user message: `user: <text>`.
- An assistant message: `assistant: <text>`, only when `text` isn't empty, then one line per tool call: two spaces, `-> `, the name, and the input as JSON in parentheses: `  -> calculator({"a":1,"b":0,"op":"divide"})`. Use `JSON.stringify(call.input)`.
- A tool message: one line per result: two spaces, `<- `, then `error: ` if `isError`, then the content: `  <- error: Cannot divide by zero`.

### Test that:

In `tests/agent.test.ts`:

- Run the agent with the tools `[calculator]`, the prompt `"1/0?"`, and a script of `callTools(["c1", "calculator", { a: 1, b: 0, op: "divide" }])` then `answer("Can't.")`. `formatTranscript(result.messages)` equals exactly these four lines:
  ```
  user: 1/0?
    -> calculator({"a":1,"b":0,"op":"divide"})
    <- error: Cannot divide by zero
  assistant: Can't.
  ```

### The script

`src/main.ts` runs the agent from the command line. It isn't tested, and it's this short:

```ts
import { formatTranscript, runAgent } from "./agent.ts";
import { modelFromEnv } from "./model/index.ts";
import { calculator, createNoteTools } from "./tools.ts";

const prompt = process.argv.slice(2).join(" ");
if (!prompt) {
    console.error('Usage: node src/main.ts "your request"');
    process.exit(1);
}

const result = await runAgent(modelFromEnv(), [calculator, ...createNoteTools()], prompt, {
    system: "You are a helpful assistant. Use the tools when they help.",
});
console.log(formatTranscript(result.messages).join("\n"));
console.log(`(${result.steps} steps, stopped by: ${result.stopReason})`);
```

`await` at the top level of a file works because the project is an ES module.

### A model to run it with

`modelFromEnv()` reads two environment variables: `PROVIDER`, `"ollama"` (the default) or `"anthropic"`, and `MODEL`, the model name, which has a default for each provider. You need at least one of the two providers.

**A local model, with Ollama.** Free, runs on your machine, and needs no account.

```
brew install ollama
ollama serve                 # in its own terminal; leave it running
ollama pull qwen3            # once: downloads the default model, about 5 GB
node src/main.ts "What is 17 times 23?"
```

`MODEL=<name>` runs another model, as long as it supports tools: the [Ollama library](https://ollama.com/search?c=tools) has a filter for that.

**Claude.** Needs an API key from the [Claude Console](https://platform.claude.com), and every run costs money: a run of this agent costs a fraction of a cent on the default model, `claude-opus-5-5`.

- Put the key in `.env`, which `.gitignore` at the repository root already keeps out of git:
  ```
  PROVIDER=anthropic
  ANTHROPIC_API_KEY=sk-ant-...
  ```
- Node reads the file when you pass `--env-file`: `node --env-file=.env src/main.ts "What is 17 times 23?"`.

Try requests that need more than one step, and watch the transcript:

- `"Save a note that the dentist is on Tuesday at 10, and another that rent is 4200 a month."`: two calls in one reply, or one per step. Models differ.
- `"Divide 10 by 0, and if that fails, divide it by 4."`: an error result, and the model's next step.
- `"How much is rent for a year?"`: the notes are gone, since each run starts with an empty list. What does the model do with `"No notes match."`?

---

## Running the tests

```
npx tsc --noEmit     # type check, including the given code
npx vitest run       # all tests; none of them calls a real model
```

---

## Cleaning up

What this assignment installed, and how to remove it when you're done:

- **The packages:** `rm -rf node_modules` in this folder. `npm install` brings them back.
- **Ollama and its model,** if you used it. **The next agent assignments use them too**, so keep them while you work through the agents track; the last assignment that needs them says so. Then:
  ```
  ollama rm qwen3          # the model, about 5 GB
  brew uninstall ollama
  rm -rf ~/.ollama         # anything left: other models and settings
  ```
  Stop `ollama serve` first, with Ctrl+C in its terminal.
- **The Claude API key,** if you used one: delete `.env`, and if you don't need the key anymore, delete it in the Claude Console.
