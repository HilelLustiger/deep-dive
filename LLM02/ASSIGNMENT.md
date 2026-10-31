# Assignment LLM02 — Talking to an LLM (TypeScript)

**Topics:** the Messages API over raw HTTP and through the SDK, content blocks, stop reasons, tokens, usage and cost, sampling (temperature, top-k, top-p) and effort, system prompts, conversation history and the context window, streaming with server-sent events, time to first token, errors, retries, backoff and timeouts, structured output

## Introduction

In this assignment you will talk to a large language model (Claude) directly: first with nothing but `fetch`, then through the official SDK. By the end you will have a small terminal chat that keeps a conversation going, streams its answers as they are written, recovers from errors, and can return validated JSON instead of free text.

Libraries hide most of what happens in an API call. Here you will do each step yourself before letting the SDK do it, so you know exactly what the SDK does for you: which headers it sends, how it reads a stream, when it retries, and what it can't decide for you.

Three facts shape the whole assignment:

- **The API is stateless.** The model remembers nothing between requests. A "conversation" is a list of messages that you keep and send again, in full, every time.
- **Everything is tokens.** What you send and what you get back is measured in tokens. Tokens decide what fits in one request, how long an answer can be, and what it costs.
- **The output is sampled.** The model produces a probability for every possible next token, and one is picked at random from them. The same request can return different answers, so a program built on a model has to cope with output it can't predict exactly.

The assignment has nine parts, 0 to 8. Do them in order, and write the tests for each part before moving to the next one.

Names given in **bold code** are required, because the tests and later parts use them. Everything else is up to you.

### Testing without a real model

Tests never call the real API. Every function that makes a request takes a `fetch` function as a parameter, and the SDK client accepts one too (`new Anthropic({ fetch })`), so tests pass a fake `fetch` that records the request and returns a scripted response. Tests are deterministic, free and fast. The real API, with a key from `.env`, is used only for manual runs.

### Async in TypeScript

Every call in this assignment is asynchronous. You know the ideas from ASYNC02 in Python; the parts that need them explain the TypeScript side: Promises and `await` (Part 1), async iterators and `for await` (Part 6), timers and `AbortController` (Part 7). One difference to notice from the start: Node's event loop is already running when your file starts, so top-level `await` works directly, with no equivalent of `asyncio.run`.

---

## Reading

### Before you start

1. **[Anthropic Academy — Building with the Claude API](https://anthropic.skilljar.com/claude-with-the-anthropic-api)**, section 2 "Accessing Claude with the API": making a request, multi-turn conversations, system prompts, temperature, response streaming, structured data. The course this assignment follows.
   *Parts 1–6 and 8.*
2. **[Node.js docs — Modules: TypeScript](https://nodejs.org/api/typescript.html)**, the "Type stripping" section
   How Node runs a `.ts` file without compiling it: it deletes the types and runs what's left. That is why some TypeScript syntax (enums, parameter properties) can't be used here, why imports need the `.ts` extension, and what each option in the `tsconfig.json` of Part 0 is for.
   *Part 0.*
3. **[MDN — Using the Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)**, sections "Making a request", "Setting a body", "Setting headers", "Checking response status" and "Reading the response body"
   `fetch(url, init)`, the `Response` object, and the trap Part 1 depends on: `fetch` does not fail on a 404 or a 500. It only fails when no response arrives at all, so checking `response.ok` is your job.
   *Part 1.*
4. **[Anthropic docs — Create a Message](https://platform.claude.com/docs/en/api/messages/create)**: the API reference for `POST /v1/messages`. Read the three required body parameters (`model`, `max_tokens`, `messages`) and the response fields, and skim the rest: everything else in the assignment is a field on this one endpoint.
   *Parts 1–4.*
5. **[Anthropic docs — TypeScript SDK](https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript)**, sections "Usage", "Request and response types", "Handling errors", "Retries" and "Customizing the fetch client"
   *Part 2.*
6. **[Chip Huyen — Generation configurations: temperature, top-k, top-p, and test time compute](https://huyenchip.com/2024/01/16/sampling.html)**: how a model picks the next token, and the ways to force structured output. The blog version of the "Sampling" section in chapter 2 of *AI Engineering*.
   *Parts 4 and 8.*
7. **[Anthropic docs — Effort](https://platform.claude.com/docs/en/build-with-claude/effort)**, sections "How effort works" and "Effort with thinking"
   The five levels, the default per model, and why effort is a signal and not a token budget.
   *Part 4.*
8. **[Anthropic docs — Context windows](https://platform.claude.com/docs/en/build-with-claude/context-windows)**, sections "How the context window works", "The context window with thinking" and "Context window overflow behavior", and **[Token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting)**, sections "How to count message tokens" and "Pricing and rate limits"
   What counts toward the window, context rot, what happens when it overflows, and counting a request before sending it.
   *Parts 3 and 5.*
9. **[Anthropic docs — Streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming)**, sections "Event types", "Content block delta types" and "Full HTTP stream response", and the **[WHATWG HTML Standard §9.2.5–9.2.6](https://html.spec.whatwg.org/multipage/server-sent-events.html)**, "Parsing an event stream" and "Interpreting an event stream"
   The order of the events in a streamed message, and the exact rules for turning bytes into events.
   *Part 6.*
10. **[Anthropic docs — Errors](https://platform.claude.com/docs/en/api/errors)**, sections "HTTP errors", "Error shapes" and "Request ID"
   The status codes and their error types, the JSON body every error has, and the `request-id` header.
   *Parts 1, 2 and 7.*
11. **[Marc Brooker — Timeouts, retries, and backoff with jitter](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter)** (Amazon Builders' Library)
   Why every remote call needs a timeout, why retries are "selfish", why backoff needs jitter, and why only one layer should retry.
   *Part 7.*
12. **[Anthropic docs — Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)**, sections "How it works", "Using a raw JSON schema" and "Important considerations"
   How a JSON Schema constrains the output, which schema features are supported, and the two cases where the output can still be unusable.
   *Part 8.*
13. **[Zod — Basic usage](https://zod.dev/basics)**
   Defining a schema, `parse` vs. `safeParse`, reading the errors, and `z.infer` for the type.
   *Part 8.*

### Going deeper

- ***AI Engineering*** by Chip Huyen (O'Reilly, 2025), ch. 2 "Understanding Foundation Models" (section "Sampling") and ch. 9 "Inference Optimization" (time to first token, time per output token, latency vs. cost).
- **[Google SRE book, ch. 22 — Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)**, sections "Retries" and "Latency and Deadlines": why retries at every layer multiply, retry budgets, deadline propagation.
- **[Anthropic docs — Preserved thinking](https://platform.claude.com/docs/en/build-with-claude/preserved-thinking)**: the rules behind Part 5's "don't edit history".
- Anthropic docs — Prompt caching and Compaction: why resending the whole history doesn't have to cost the whole history, and what the API can do when a conversation outgrows the window.
- The rest of the Anthropic Academy course: section 6 (RAG) is LLM04, sections 5 and 10 (tool use, agents and workflows) are AGENT01.

---

## Part 0 — Project setup

**Files:** `package.json`, `tsconfig.json`, `.gitignore`, `.env.example`, `src/config.ts`

### The project

Set up a TypeScript project in this folder, with Node 24:

- `package.json` with `"type": "module"`, so every `.ts` file is an ES module.
  - Dependencies: `@anthropic-ai/sdk` and `zod`.
  - Dev dependencies: `typescript`, `vitest` and `@types/node`.
  - Two scripts: `"typecheck": "tsc --noEmit"` and `"test": "vitest run"`.
- Two folders: `src/` for the code and `tests/` for the tests.

### Running TypeScript without compiling it

Node 24 runs `.ts` files directly: `node src/ask.ts`. It doesn't compile them. It deletes the type annotations and runs the JavaScript that's left (**type stripping**), so it never checks your types. That's `tsc`'s job: `npx tsc --noEmit` checks everything and writes nothing.

Because Node only deletes types, any TypeScript syntax that would have to be *turned into* JavaScript can't be used. The two you are most likely to reach for:

- `enum`: use a union of string literals instead (`type Level = "low" | "high"`).
- Parameter properties, `constructor(readonly status: number) {}`: declare the field in the class body and assign it in the constructor.

Imports between your own files must name the file with its extension: `import { ask } from "./raw.ts"`, not `"./raw"`. An import used only as a type must say so: `import type Anthropic from "@anthropic-ai/sdk"`. Without `type`, Node tries to load it at runtime.

`tsconfig.json`, as the Node documentation recommends, so that `tsc` reports all of this before Node does:

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

- `erasableSyntaxOnly` makes syntax that Node can't strip a type error.
- `verbatimModuleSyntax` makes a type-only import without `type` an error.
- `rewriteRelativeImportExtensions` allows `.ts` in import paths.

### The API key

Create a key in the [Claude Console](https://platform.claude.com) and keep it out of git:

- `.env` holds the real values. **Add `.env` to `.gitignore` before you create it.**
  ```
  ANTHROPIC_API_KEY=sk-ant-...
  MODEL=claude-opus-5-5
  ```
- `.env.example` is committed, with the same names and no real key. It documents what `.env` needs.

Node reads the file itself when you pass `--env-file=.env`, and puts each line in `process.env`.

**Cost.** Every manual run spends money; tests never do. A short question costs a fraction of a cent on `claude-opus-5-5` ($4 per million input tokens, $20 per million output tokens). `MODEL=claude-haiku-5-5` is about 40 times cheaper and fine for most manual runs in this assignment.

### Configuration

In `src/config.ts`, write:

- **`DEFAULT_MODEL`**: the constant `"claude-opus-5-5"`.
- **`loadConfig(env = process.env): Config`**, returning **`{ apiKey, model }`**:
  - `apiKey` is `env.ANTHROPIC_API_KEY`. If it's missing or empty, throw an `Error` whose message names the variable, so a missing `.env` fails at startup with a clear message instead of a 401 from the API later.
  - `model` is `env.MODEL`, or `DEFAULT_MODEL` when it's missing or empty.

`env` is a parameter so tests can pass their own object instead of changing the real `process.env`: `loadConfig({ ANTHROPIC_API_KEY: "test-key" })`. Its type is `Record<string, string | undefined>`, which is also the type of `process.env`.

### Test that:

- `loadConfig({})` throws, and the message contains `ANTHROPIC_API_KEY`.
- With only a key, `model` is `DEFAULT_MODEL`.
- With `MODEL` set, `model` is that value.

Check that `npx tsc --noEmit` and `npx vitest run` both pass.

---

## Part 1 — A request by hand

**Files:** `src/raw.ts`, `src/ask.ts`, `tests/fakes.ts`

### The request

Every call to Claude is one HTTP request: `POST https://api.anthropic.com/v1/messages`, with three headers and a JSON body.

| Header | Value |
|---|---|
| `x-api-key` | your API key |
| `anthropic-version` | `2023-06-01`, the version of the API's request and response format your code expects |
| `content-type` | `application/json` |

The body has three required fields:

```json
{
  "model": "claude-opus-5-5",
  "max_tokens": 1024,
  "messages": [{ "role": "user", "content": "What is a token?" }]
}
```

`max_tokens` is the most the model may write in its answer. It is a hard limit: when it's reached, the answer just stops, mid-sentence if needed. `messages` is the conversation so far; for now it holds a single user message.

### The response

```json
{
  "id": "msg_01XFDUDYJgAACzvnptvVoYEL",
  "type": "message",
  "role": "assistant",
  "model": "claude-opus-5-5",
  "content": [
    { "type": "thinking", "thinking": "", "signature": "EqQBCgIYAhIM..." },
    { "type": "text", "text": "A token is a piece of text..." }
  ],
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": { "input_tokens": 12, "output_tokens": 85 }
}
```

The answer is not a string. `content` is a list of **content blocks**, each with a `type`. A text answer may arrive in one text block or several, and other kinds of blocks can come before it. Above, a thinking block with empty text: current models think before they answer, and by default the API doesn't return what they thought (Part 4 is about this). To get the answer, join the text of every block whose `type` is `"text"`, in order, and skip the rest.

### Errors

When something goes wrong, the status is not 2xx and the body is always JSON of this shape:

```json
{
  "type": "error",
  "error": { "type": "not_found_error", "message": "model: claude-opus-9" },
  "request_id": "req_011CSHoEeqs5C35K2UUqR7Fy"
}
```

The same ID is also sent in the `request-id` header, on every response. It's what you'd quote to Anthropic support about a failed request.

`fetch` does **not** throw on a 404 or a 500. Its Promise fails only when no response arrives at all (no network, a bad URL). Any response that does arrive, error or not, comes back as a normal `Response`, and checking `response.ok` (true for 200–299) is your job.

One more case: a proxy or load balancer in between can answer with a plain-text or HTML error page instead of the API's JSON, for example a 502 "Bad Gateway". Your code must not crash trying to parse it.

### Types from the SDK

You don't have to write the request and response types yourself: the SDK exports them, and importing a type loads none of its code. With `import type Anthropic from "@anthropic-ai/sdk"`:

- `Anthropic.MessageCreateParamsNonStreaming` is the request body.
- `Anthropic.Message` is the response.
- `Anthropic.ContentBlock` is one block of `content`: a union of the block types, which TypeScript narrows when you check `block.type === "text"`. Only after that check can you read `block.text`.

`response.json()` returns `any`, so tell TypeScript what you know it is: `(await response.json()) as Anthropic.Message`. Nothing checks this at runtime; it's a promise you make to the compiler.

### Promises vs. coroutines

`async`/`await` look the same as in Python, with one difference that matters later. An `async` function returns a **Promise**, and it **starts running as soon as you call it**, up to its first `await`. A Python coroutine does nothing until something awaits it.

```ts
async function slowDouble(n: number): Promise<number> {
  console.log("started", n);
  await new Promise((resolve) => setTimeout(resolve, 100));
  return n * 2;
}

const pending = slowDouble(4); // prints "started 4" right away
const result = await pending;  // waits; result is 8
```

And there is no `asyncio.run`. Node's event loop is already running when your file starts, so in an ES module you can `await` at the top level of the file.

### Write, in `src/raw.ts`:

- **`API_URL`** = `"https://api.anthropic.com/v1/messages"` and **`API_VERSION`** = `"2023-06-01"`.
- **`type FetchFn = typeof fetch`**, the type of any function that can stand in for `fetch`.
- **`ApiError`**, extending `Error`, with fields **`status: number`**, **`type: string`** and **`requestId: string | null`**, its `message` set to the API's error message, and `name` set to `"ApiError"`. (No parameter properties, see Part 0.)
- **`sendMessage(params, options): Promise<Anthropic.Message>`**
  - `params: Anthropic.MessageCreateParamsNonStreaming` is sent as the body, unchanged.
  - `options` is **`{ apiKey: string; fetch?: FetchFn }`**. When `fetch` is missing, use the global `fetch`. Tests always pass a fake one.
  - Steps:
    1. Call `fetch(API_URL, init)` once, with `method: "POST"`, the three headers and `body: JSON.stringify(params)`.
    2. If `response.ok`, return the parsed JSON body.
    3. Otherwise read the body as text, and throw an `ApiError` with the status and the `request-id` header (`null` if there is none). If the text parses as the error JSON above, take `type` and `message` from its `error` object. If it doesn't parse, use the type `"unknown_error"` and the raw text as the message.
- **`getText(message: Anthropic.Message): string`**: the text of all text blocks joined in order, with nothing between them. `""` if there are none.
- **`ask(prompt, model, options): Promise<string>`**: sends `prompt` as a single user message with `max_tokens: 1024` and returns `getText` of the response.

And `src/ask.ts`, a script, with top-level `await`: load the config, join `process.argv.slice(2)` with spaces into the question, `ask` it, and print the answer.

```
node --env-file=.env src/ask.ts "What is a token, in one sentence?"
```

Try it once with a wrong key in `.env`, too. The API answers 401, which costs nothing, and you should see your own `ApiError` with `type: "authentication_error"` and a real request ID.

### Faking `fetch` in tests

A fake `fetch` is an ordinary function with the same signature: it records what it was called with and returns a `Response` you build. Node has the `Response` class built in, the same one `fetch` returns. An example, for an unrelated weather client:

```ts
// The code under test
async function getTemperature(city: string, fetchFn: typeof fetch = fetch): Promise<number> {
  const response = await fetchFn(`https://weather.example/v1/now?city=${city}`);
  const body = await response.json();
  return body.celsius;
}

// The test
it("asks for the right city", async () => {
  const urls: string[] = [];
  const fakeFetch: typeof fetch = async (input) => {
    urls.push(String(input));
    return new Response(JSON.stringify({ celsius: 21 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  expect(await getTemperature("Haifa", fakeFetch)).toBe(21);
  expect(urls).toEqual(["https://weather.example/v1/now?city=Haifa"]);
});
```

The second argument, `init`, is where the method, headers and body are. Your code may pass `headers` as a plain object; `new Headers(init?.headers).get("x-api-key")` reads one header whatever form it was passed in. Header names are case-insensitive, and `Headers` handles that. The body comes back as the string you passed, so `JSON.parse(init?.body as string)` gives back the object.

Write the fakes once, in `tests/fakes.ts`, since every later part uses them:

- **`jsonResponse(body, status = 200, headers = {})`**: a `Response` whose body is `JSON.stringify(body)`, with `content-type: application/json` and `request-id: req_test` plus any headers you pass.
- **`scriptedFetch(responses)`**, where `responses` is a list of functions that each build a `Response`. It returns **`{ fake, calls }`**:
  - `fake` is a fake `fetch`. The n-th call returns the n-th response; once the list runs out, it keeps returning the last one.
  - `calls` is a list of **`{ url, init }`**, one per call, in order.

  Responses are given as functions, not `Response` objects, because a `Response` body can be read only once. Each call needs a fresh one.
- **`textMessage(text)`**: an `Anthropic.Message` with one text block, `stop_reason: "end_turn"` and some `usage`. The SDK's type has more required fields than a test needs: fill in the ones from the example response above, and cast with `as unknown as Anthropic.Message`. That's acceptable in a test helper, not in `src/`.

### Test that:

- `sendMessage` makes exactly one call, to `API_URL`, with method `POST`.
- The three headers have the right values.
- The body, parsed back from JSON, equals the `params` you passed.
- `sendMessage` returns the scripted message unchanged.
- A 404 with the API's error JSON and a `request-id` header rejects with an `ApiError` with the right `status`, `type`, `message` and `requestId`. Use `await expect(promise).rejects.toMatchObject({ ... })`, or catch the error and check its fields.
- A 502 with the body `Bad Gateway` (plain text, no JSON, no `request-id`) rejects with an `ApiError` with `status: 502`, `type: "unknown_error"`, `message: "Bad Gateway"` and `requestId: null`.
- `getText` returns the text of a message with one text block.
- `getText` skips a thinking block and joins two text blocks: `thinking`, then `"Hello, "`, then `"world"` gives `"Hello, world"`.

---

## Part 2 — The same request through the SDK

**Files:** `src/sdk.ts`

The SDK makes the same HTTP request you just wrote. This part proves it, and shows two things it adds on top.

```ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey, fetch: fakeFetch, maxRetries: 2 });
const message = await client.messages.create({ model, max_tokens: 1024, messages });
```

`client.messages.create` takes exactly the body you built in Part 1 and returns the same `Anthropic.Message`, so your `getText` works on it unchanged. Note the import: in Part 1 it was `import type`, because only types were used. Here the code calls `new Anthropic`, so it's a normal import.

**What it adds:**

- **Typed errors.** A non-2xx response becomes an instance of a subclass of `Anthropic.APIError`, chosen by status: `Anthropic.NotFoundError` for 404, `Anthropic.RateLimitError` for 429, `Anthropic.InternalServerError` for any status of 500 or more (529 "overloaded" included), and so on. Each one has `status` and `requestID`. Check for them with `instanceof`, never by matching the message text.
- **Retries.** On a connection error, 408, 409, 429 or any 5xx, the SDK waits and sends the request again, **twice by default** (`maxRetries`). It waits about half a second before the first retry and longer before each one after, unless the response tells it how long to wait: `retry-after` in seconds, or `retry-after-ms` in milliseconds. A 4xx like 400 or 404 is never retried, since sending the same bad request again would fail the same way.

### Write, in `src/sdk.ts`:

- **`createClient(options): Anthropic`**, where `options` is **`{ apiKey: string; fetch?: FetchFn; maxRetries?: number }`**, passed through to `new Anthropic(...)`.
- **`askWithSdk(client, prompt, model): Promise<string>`**: the same request as `ask` from Part 1, through `client.messages.create`, returning `getText` of the response.

### Test that:

- **Same request.** Send the same `params` through `sendMessage` and through `client.messages.create`, each with its own `scriptedFetch`. The SDK called the same URL, and its body parses to the same object as yours. Every header your version sent was also sent by the SDK, with the same value. Loop over `new Headers(...)` of your call; a `Headers` object can be iterated as `[name, value]` pairs.
- `askWithSdk` returns the text of a scripted message.
- A 404 rejects with `Anthropic.NotFoundError` with `status: 404`, and `fetch` was called **once**.
- A 529 followed by a 200 succeeds, and `fetch` was called **twice**. Give the 529 the header `retry-after-ms: 10`, so the retry happens after 10 ms instead of half a second. (The SDK ignores a value of `0` and falls back to its own delay.)
- With `maxRetries: 0`, a 529 rejects with `Anthropic.InternalServerError`, and `fetch` was called once.

Once, print the names of the headers the SDK sent and look at them. Besides yours, there are an `x-stainless-retry-count` (which attempt this is) and others describing the SDK version, runtime and OS. Don't test for them; they are the SDK's business, not part of the API.

From here on, the SDK is used everywhere except Parts 6 and 7, where you first write by hand what it does for you: reading a stream, and retrying.

---

## Part 3 — Reading the response

**Files:** `src/reply.ts`, `src/ask.ts`

A response carries more than its text. The program also needs to know whether the answer is complete, and what it cost.

### Why the model stopped

`stop_reason` says why generation ended:

| `stop_reason` | Meaning | What the program should do |
|---|---|---|
| `end_turn` | The model finished its answer. | Use it. |
| `max_tokens` | It hit your `max_tokens` limit. The answer is cut off, possibly mid-word. | Don't treat it as complete. Raise `max_tokens`, or tell the user. |
| `model_context_window_exceeded` | The conversation plus the answer filled the model's context window (Part 5). Also cut off. | Same as `max_tokens`. |
| `refusal` | The model declined the request. The text may be empty or partial. | Don't use the text as an answer. |
| `tool_use`, `pause_turn` | Tool use, in AGENT01. | Not used here. |

A truncated answer looks like a normal one when you only read the text. That's why this check belongs in the code, not in the user's eyes.

### Tokens and cost

`usage.input_tokens` is everything you sent: the system prompt and every message. `usage.output_tokens` is everything the model wrote, including any thinking you didn't see (Part 4). You pay per million tokens, and output costs more than input:

| Model | Input, $ per 1M tokens | Output, $ per 1M tokens |
|---|---|---|
| `claude-opus-5-5` | 4.00 | 20.00 |
| `claude-sonnet-5-5` | 2.00 | 10.00 |
| `claude-haiku-5-5` | 0.10 | 0.50 |

So a request with 12 input tokens and 85 output tokens on Opus costs (12 × 4 + 85 × 20) / 1,000,000 = $0.001748. The prices come from the [pricing page](https://platform.claude.com/docs/en/about-claude/pricing) and change over time; that's why they live in one table in your code. (Haiku costs more above 100,000 input tokens, and prompt caching changes the input price. Both are outside this assignment.)

### Counting before sending

`usage` arrives only after you've paid. To know the size of a request before sending it, the API has a free endpoint, `POST /v1/messages/count_tokens`. It takes the same `model`, `system` and `messages` as a real request, but **no** `max_tokens`, and returns `{ "input_tokens": 14 }`. In the SDK: `client.messages.countTokens({ model, messages, system })`. The count is an estimate and can differ from the real `input_tokens` by a little.

### Write, in `src/reply.ts`:

- **`PRICES`**: the table above, as `Record<string, { input: number; output: number }>`, in dollars per million tokens.
- **`costUsd(model, inputTokens, outputTokens): number`**: the cost in dollars. For a model that isn't in `PRICES`, throw an `Error` whose message names the model, rather than silently returning 0.
- **`Reply`**, the interface the rest of the assignment uses: **`text`**, **`stopReason: string | null`**, **`truncated: boolean`**, **`refused: boolean`**, **`inputTokens`**, **`outputTokens`** and **`costUsd`**.
- **`toReply(message: Anthropic.Message): Reply`**:
  - `text` is `getText(message)`.
  - `truncated` is true for `max_tokens` and `model_context_window_exceeded`.
  - `refused` is true for `refusal`.
  - The cost uses `message.model`, the model that actually answered.
- **`countInputTokens(client, model, messages, system?): Promise<number>`**: calls `countTokens` and returns `input_tokens`. Send `system` only when it's given.

Then change `src/ask.ts` to use the SDK client and `toReply`, and to print, after the answer, a line like `[end_turn · 12 in / 85 out · $0.0017]`, plus a warning when the answer was truncated or refused.

### Test that:

For `toReply`, build messages from `textMessage` with a different `stop_reason`: `{ ...textMessage("Hal"), stop_reason: "max_tokens" }`, cast like in `tests/fakes.ts`.

- `costUsd("claude-opus-5-5", 1_000_000, 0)` is 4, with `0, 1_000_000` it's 20, and with `12, 85` it's 0.001748. Compare money with `toBeCloseTo`, never `toBe`: `0.1 + 0.2` is not exactly `0.3` in floating point.
- `costUsd` throws for `"claude-opus-9"`, and the message contains the model name.
- `toReply` of an `end_turn` message has the text, `truncated: false` and `refused: false`, and the token counts and cost of its `usage`.
- With `max_tokens`, `truncated` is true and `text` still holds the partial text.
- With `model_context_window_exceeded`, `truncated` is true.
- With `refusal`, `refused` is true and `truncated` is false.
- `countInputTokens` calls `https://api.anthropic.com/v1/messages/count_tokens`, its body is exactly `{ model, messages, system }` (no `max_tokens`), and it returns the scripted `input_tokens`.

---

## Part 4 — How the model picks a token, and effort

**Files:** `src/sampling.ts`, `src/request.ts`, `src/compare-effort.ts`

### Sampling, by hand

A language model writes one token at a time. For each position it computes a score, a **logit**, for every token in its vocabulary. Higher means more likely. Then one token is picked, and the process repeats with that token added. This picking step is **sampling**, and it's why the same question can get different answers. You will write it here as plain functions over a small list of logits. There is no API in this half.

**Softmax** turns logits into probabilities that add up to 1: raise *e* to each logit and divide by the sum. For `[1, 2, 3]` that gives about `[0.090, 0.245, 0.665]`.

`Math.exp(1000)` is `Infinity`, so a naive softmax of `[1000, 1001]` returns `NaN`. The fix: subtract the largest logit from all of them first. Softmax gives the same result for any constant subtracted, and now the largest exponent is `e^0 = 1`.

**Temperature** divides every logit by `T` before the softmax:

- Below 1, the gaps between scores grow and the top token takes almost all the probability. As `T` approaches 0, sampling becomes "always pick the top token".
- Above 1, the gaps shrink and the distribution flattens toward uniform: more varied, more random output.
- `T` must be positive, since dividing by 0 is undefined.

Two filters cut off the unlikely tail, so that a low-probability token is never picked:

- **Top-k** keeps the `k` most likely tokens.
- **Top-p** keeps the smallest set of most-likely tokens whose probabilities add up to at least `p`. With `[0.1, 0.2, 0.3, 0.4]` and `p = 0.5`: 0.4 alone isn't enough, 0.4 + 0.3 = 0.7 is, so tokens 3 and 2 stay.

After a filter, the kept probabilities no longer add up to 1, so divide each one by their sum (**renormalize**).

**Picking** one index from probabilities: take a random number `r` in [0, 1) and walk the list adding up probabilities. Return the first index where the running sum becomes greater than `r`. With `[0.25, 0.25, 0.5]`, `r = 0.3` falls in the second slot, so the answer is index 1.

The random generator is a parameter, `random: () => number`, so tests control it. `() => 0.3` always returns 0.3. To check a whole distribution without any randomness, feed it evenly spaced values. Here is the pattern on an unrelated function, a die that has to come up 1–6 equally often:

```ts
function evenlySpaced(n: number): () => number {
  let i = 0;
  return () => (i++ + 0.5) / n; // 0.5/n, 1.5/n, ..., (n - 0.5)/n
}

const roll = (random: () => number) => Math.floor(random() * 6) + 1;

const random = evenlySpaced(600);
const counts = [0, 0, 0, 0, 0, 0];
for (let i = 0; i < 600; i++) counts[roll(random) - 1]++;
expect(counts).toEqual([100, 100, 100, 100, 100, 100]); // exact, every run
```

### Write, in `src/sampling.ts`:

- **`softmax(logits, temperature = 1): number[]`**: subtract the maximum first. Throw a `RangeError` when `temperature` is not greater than 0.
- **`topK(probs, k): number[]`**: zero all but the `k` largest probabilities, then renormalize. On equal probabilities, keep the one with the lower index first.
- **`topP(probs, p): number[]`**: go through the probabilities from largest to smallest (ties by lower index), keeping each one, until the kept ones add up to at least `p`. Zero the rest and renormalize. It always keeps at least one.
- **`sampleIndex(probs, random): number`**: the walk described above. Skip zero probabilities, so that a filtered-out token can never be picked. If rounding leaves the running sum just under `r` at the end, return the last index with a non-zero probability.
- **`sampleToken(logits, options, random): number`**, where `options` is **`{ temperature?, topK?, topP? }`**: softmax with the temperature (default 1), then `topK` if given, then `topP` if given, then `sampleIndex`.

Arrays have no built-in "sort indices by value". `probs.map((_, i) => i).sort((a, b) => probs[b] - probs[a] || a - b)` gives the indices ordered by probability, largest first, ties by index.

### Test that:

Compare probabilities with `toBeCloseTo(expected, 4)`.

- `softmax([1, 2, 3])` is about `[0.0900, 0.2447, 0.6652]`, and softmax of any list sums to 1.
- `softmax([1000, 1001])` is about `[0.2689, 0.7311]`, not `NaN`.
- At temperature 0.1, the last probability of `softmax([1, 2, 3], 0.1)` is greater than 0.9999.
- At temperature 10, every probability of `softmax([1, 2, 3], 10)` is within 0.05 of 1/3.
- Temperatures 0 and -1 throw `RangeError`.
- `topK([0.1, 0.2, 0.3, 0.4], 2)` is `[0, 0, 3/7, 4/7]`, and `topK([0.4, 0.2, 0.4], 1)` is `[1, 0, 0]`.
- `topP([0.1, 0.2, 0.3, 0.4], p)`:
  - with `p = 0.5`, it's `[0, 0, 3/7, 4/7]`
  - with `p = 0.4`, it's `[0, 0, 0, 1]`
  - with `p = 1`, the list is unchanged
- `sampleIndex([0.25, 0.25, 0.5], random)`:
  - returns 0, 1 and 2 for `random` returning 0, 0.3 and 0.99
  - `sampleIndex([0, 1], () => 0)` returns 1
  - `sampleIndex([0.5, 0.5, 0], () => 0.9999999999999999)` returns 1, never the zero
- With 1000 evenly spaced values, `sampleIndex([0.2, 0.3, 0.5], ...)` picks the indices exactly 200, 300 and 500 times.
- `sampleToken([2, 5, 1, 4], { topK: 1 }, random)` returns 1 for any random value: top-1 is "always the top token".
- With 1000 evenly spaced values, `sampleToken([1, 2, 3], { temperature: 0.1 }, ...)` picks index 2 all 1000 times.

### Effort: what the API gives you instead

On the API, these knobs were `temperature`, `top_k` and `top_p`. Current Claude models don't accept them: they think before they answer, and sending any of them returns a 400. Try it once: `ask.ts` with `temperature: 0.5` added to the request. A rejected request costs nothing.

What controls current models is **`effort`**: `low`, `medium`, `high`, `xhigh` or `max`, sent as `output_config: { effort }`. It is not a token limit but a signal of how much work to put in. It affects how much the model thinks, how long its answers are, and so how many output tokens you pay for. The default on `claude-opus-5-5` and `claude-haiku-5-5` is `medium`.

The thinking itself comes back as thinking blocks. By default their text is empty, though you pay for the tokens either way. To see a summary of it, send `thinking: { type: "adaptive", display: "summarized" }`.

The **system prompt** is the other setting here: instructions for the whole conversation (a role, a style, rules), sent as the top-level `system` field, not as a message.

### Write, in `src/request.ts`:

- **`type Effort = "low" | "medium" | "high" | "xhigh" | "max"`**.
- **`AskOptions`**: **`{ model: string; maxTokens?: number; system?: string; effort?: Effort; showThinking?: boolean }`**.
- **`DEFAULT_MAX_TOKENS = 16000`**. Thinking counts toward `max_tokens`, so 1024 from Part 1 is too tight once the model thinks.
- **`buildParams(messages, options): Anthropic.MessageCreateParamsNonStreaming`**:
  - Always includes `model`, `max_tokens` (`options.maxTokens`, or `DEFAULT_MAX_TOKENS`) and `messages`.
  - Adds `system` only when given.
  - Adds `output_config: { effort }` only when `effort` is given.
  - Adds `thinking: { type: "adaptive", display: "summarized" }` only when `showThinking` is true.
  - Fields that weren't given must be absent, not `undefined`.
- **`getThinking(message): string`**: the `thinking` text of all thinking blocks, joined with `"\n"`. `""` if there are none.

And `src/compare-effort.ts`: ask the question from the command line twice, at `low` and at `high` effort, with `showThinking`, and print for each the output tokens, the cost, the thinking and the answer. Try a question that needs reasoning, like a small logic puzzle.

### Test that:

- `buildParams(messages, { model: "m" })` equals exactly `{ model: "m", max_tokens: DEFAULT_MAX_TOKENS, messages }`. Use `toStrictEqual`, which, unlike `toEqual`, fails on a key that is present with the value `undefined`.
- With every option given, each one appears in the right place: `system`, `output_config.effort` and the `thinking` object.
- `getThinking` of a message with two thinking blocks and a text block between them returns the two thinking texts joined with a newline, and `getThinking(textMessage("x"))` is `""`.

---

## Part 5 — Conversation history and the context window

**Files:** `src/history.ts`, `src/conversation.ts`, `src/chat.ts`

### A conversation is a list you resend

The API remembers nothing. To have a conversation, you keep the list of messages and send all of it on every turn. The user's messages are strings. The model's messages are its `content` exactly as it came back, every block, thinking blocks and their `signature`s included:

```ts
[
  { role: "user", content: "I'm Alice." },
  { role: "assistant", content: [{ type: "thinking", ... }, { type: "text", text: "Hi Alice!" }] },
  { role: "user", content: "What's my name?" },
]
```

The list must start with a user message. Messages normally alternate between user and assistant; two user messages in a row are allowed, and the API joins them into one turn.

### The context window

The **context window** is everything the model can see in one request: the system prompt, all messages and the answer it writes. Here that is 1M tokens. Two things make you want to stay far below it:

- **Cost.** Every turn resends every earlier turn, so the input of turn *n* contains all *n* − 1 turns before it, and you pay for it again each time.
- **Context rot.** As the context grows, the model gets worse at finding and using what's in it.

So when the history passes a budget, it has to shrink. You don't need to count tokens for this: the `usage` of the last response is exactly the size of the history, because its input was the whole history and its output is the reply you just added.

### A rule about editing history

The API protects thinking blocks: a thinking block is only valid while **everything before it** (system prompt, earlier messages) is exactly as it was when the block was written. Appending is always fine. But if you delete or change an earlier message, every thinking block after it becomes invalid, and depending on the account, the API rejects the request with a 400 or silently drops those blocks. (The [Preserved thinking](https://platform.claude.com/docs/en/build-with-claude/preserved-thinking) page has the full rules.)

So naively dropping the oldest messages breaks the conversation. The documentation describes two safe ways to shrink it, and you'll implement both:

1. **Drop and strip.** Keep only the last few exchanges, and remove **every** thinking block from what's left. With no thinking blocks, there's nothing to invalidate. The model loses its earlier reasoning, but not the conversation.
2. **Summarize.** Ask the model to summarize the conversation, by *appending* a request for a summary to the full, unchanged history, which is safe. Then replace the whole history with one user message holding the summary. Nothing old is resent, so nothing can fail the check.

An **exchange** is one user message followed by the model's reply. Since `Conversation` always adds them in pairs, the last *n* exchanges are the last 2*n* messages.

### Write, in `src/history.ts`:

- **`stripThinking(messages): Anthropic.MessageParam[]`**: a new list where every assistant message whose `content` is an array has its `thinking` and `redacted_thinking` blocks removed. Everything else is kept as it is, in order. Don't change the input list or its messages: build new message objects (`{ ...m, content: filtered }`).
- **`dropOldest(messages, keepExchanges): Anthropic.MessageParam[]`**: if there are no more than `keepExchanges` exchanges, return the input list itself, unchanged. Otherwise return the last `2 * keepExchanges` messages, passed through `stripThinking`.
- **`SUMMARY_PROMPT`**: the request appended to the history, for example: *"Summarize our conversation so far for your own future reference: the facts I told you, what we decided, and any open questions. Write only the summary."*
- **`SUMMARY_PREFIX`** = `"Summary of our conversation so far:"`.
- **`summarize(client, messages, options): Promise<Anthropic.MessageParam[]>`**: send `messages` plus `{ role: "user", content: SUMMARY_PROMPT }` (built with `buildParams`), and return a one-message history: `{ role: "user", content: \`${SUMMARY_PREFIX}\n${summary text}\` }`.

### Write, in `src/conversation.ts`:

- **`ConversationOptions`**: `AskOptions` plus **`maxHistoryTokens?: number`**, **`trim?: "drop" | "summarize"`** (default `"drop"`) and **`keepExchanges?: number`** (default 2).
- **`class Conversation`**, with `constructor(client: Anthropic, options: ConversationOptions)`:
  - **`get messages()`**: a copy of the history, so a caller can't change it from outside.
  - **`async send(text): Promise<Reply>`**, in this order:
    1. Build the new list: the history plus `{ role: "user", content: text }`.
    2. Send it with `client.messages.create(buildParams(...))`.
    3. Only now, after the request succeeded, set the history to that list plus `{ role: "assistant", content: response.content }`. If the request throws, the history is unchanged and the error goes to the caller, so a failed turn can simply be retried.
    4. If `maxHistoryTokens` is set and `usage.input_tokens + usage.output_tokens` is greater than it, shrink the history with the chosen `trim`.
    5. Return `toReply(response)`.

Note that the history holds the response's own content blocks, typed `Anthropic.ContentBlock`, inside messages typed `Anthropic.MessageParam`. The SDK's types allow this directly: what comes back can be sent back.

### The chat

`src/chat.ts` is a loop in the terminal: read a line, `send` it, print the reply and a short line with tokens and cost, until the user types `/exit` or presses Ctrl+D. Catch errors inside the loop and print them, so one failed request doesn't end the chat. Start it with `maxHistoryTokens: 20_000`.

Node's `readline` interface is an **async iterable of lines**, so the loop is a `for await`:

```ts
import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const rl = readline.createInterface({ input: stdin, output: stdout });
let closed = false;
rl.on("close", () => { closed = true; });

rl.setPrompt("> ");
rl.prompt();
for await (const line of rl) {
  console.log(`you said: ${line}`);   // the real work, which may take seconds
  if (!closed) rl.prompt();
}
```

The `closed` flag matters. When input ends (Ctrl+D, or the end of piped input) while a request is still running, `readline` closes. Calling `rl.prompt()` after that throws. To check the loop without the API, pipe lines into it: `printf 'hello\n/exit\n' | node --env-file=.env src/chat.ts`.

### Test that:

For thinking blocks in tests, write a helper like `textMessage` that puts a thinking block (`{ type: "thinking", thinking: "", signature: "sig" }`) before the text and takes `usage` numbers as parameters.

`Conversation`:
- After two `send`s, the second request's `messages` are user, assistant, user, and the last one is the second text. `messages` has 4 entries.
- The assistant message in the history equals `{ role: "assistant", content: response.content }` of the scripted response, thinking block and signature included.
- When the second request fails (scripted 400), `send` rejects and `messages` still has 2 entries.
- Pushing onto the array returned by `messages` doesn't change the conversation.
- **Drop.** With `maxHistoryTokens: 100` and `keepExchanges: 1`, and scripted usage of 20+10, then 50+10, then 90+20:
  - After two `send`s, the history has 4 messages, still with thinking.
  - After the third, it has 2: the third question first, then its reply, with no thinking block anywhere.
  - The next request sends those 2 plus the new question.
- **Summarize.** With `maxHistoryTokens: 100`, `trim: "summarize"`, and a first reply with usage 80+30:
  - The second request is the summary request. Its first two messages are exactly the first request's message and the reply, unchanged, and its third is `SUMMARY_PROMPT`.
  - Afterwards, `messages` is exactly one user message: `SUMMARY_PREFIX`, a newline and the scripted summary text.

History helpers:
- `stripThinking` removes `thinking` and `redacted_thinking` blocks and keeps text blocks in order. It leaves user messages as they are and doesn't change its input.
- `dropOldest` of 3 exchanges with `keepExchanges: 2` returns 4 messages, starting with the second question, with no thinking.
- `dropOldest` of 3 exchanges with `keepExchanges: 3` returns the same list object (`toBe`).

---

## Part 6 — Streaming

**Files:** `src/sse.ts`, `src/stream.ts`, `src/ttft.ts`, `src/raw.ts`, `src/conversation.ts`, `src/chat.ts`

### Why stream

A long answer takes many seconds to write, and without streaming the user stares at nothing until the very end. Two numbers describe the wait:

- **Time to first token** (TTFT): how long until the first word appears. It depends mostly on the size of the input and on how long the model thinks first.
- **Total time**: until the last token. It grows with the length of the answer.

Streaming doesn't make the total shorter. It makes the first word appear after the TTFT instead of after the total, which is what the user actually feels.

### Server-sent events

With `"stream": true` in the body, the API keeps the response open and sends the answer in pieces, as **server-sent events** (SSE): a text format of `field: value` lines, where an empty line ends each event:

```
event: message_start
data: {"type":"message_start","message":{"id":"msg_...","usage":{"input_tokens":12,"output_tokens":1},...}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: ping
data: {"type": "ping"}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":7}}

event: message_stop
data: {"type":"message_stop"}
```

- **`message_start`** carries the message without content, with the input token count.
- Each content block has a **`content_block_start`**, any number of **`content_block_delta`** events, and a **`content_block_stop`**. The text arrives in `text_delta` pieces.
- **`message_delta`** carries the `stop_reason` and the final output token count.
- **`ping`** events can appear anywhere and mean nothing; they keep the connection alive.
- An **`error`** event (`data: {"type":"error","error":{"type":"overloaded_error",...}}`) can arrive in the middle of a stream. The HTTP status was already 200 by then, so this is the only way the server can report a failure that late.

### Parsing a stream of bytes

The rules come from the [WHATWG HTML Standard, §9.2.5–9.2.6](https://html.spec.whatwg.org/multipage/server-sent-events.html). This subset is enough here:

- Lines end with `\n` or `\r\n`. (The standard also allows a lone `\r`; you can skip that case.)
- A line starting with `:` is a comment. Ignore it.
- Otherwise the field name is everything before the first `:` and the value is everything after it. If the value starts with a space, remove that one space. A line with no `:` is a field name with an empty value.
- `event` sets the event type. `data` appends its value plus a `\n` to the data. Every other field (`id`, `retry` and unknown ones) is ignored.
- An empty line ends the event. If the data is empty, nothing is emitted. Otherwise, remove the final `\n` from the data and emit `{ event, data }`, with event type `"message"` if none was set. Then reset both for the next event.
- When the stream ends, an event without its closing empty line is discarded.

The bytes arrive in **chunks**, and a chunk can end anywhere: in the middle of a line, between `\r` and `\n`, even in the middle of a character. In UTF-8, `ש` is two bytes, and a chunk can end between them. This is NET01 Part 2 again: TCP gave you a byte stream, not messages, and you had to frame them. Two tools handle it:

- **A buffer.** Append each chunk's text to a string, take out every complete line (up to a `\n`), and leave the rest in the buffer for the next chunk.
- **`new TextDecoder()` with `decoder.decode(chunk, { stream: true })`.** It holds back the bytes of an incomplete character until the next chunk completes it. At the end, call `decoder.decode()` once with no arguments to flush it.

`response.body` is a `ReadableStream<Uint8Array>`, and in Node it is async iterable: `for await (const chunk of response.body)`.

### Async generators

The parser takes chunks in and gives events out as they complete, and an **async generator** is the tool for that. It is an `async function*` that `yield`s values, and the caller reads them with `for await`. An example that turns a stream of numbers into running totals:

```ts
async function* runningTotals(numbers: AsyncIterable<number>): AsyncGenerator<number> {
  let total = 0;
  for await (const n of numbers) {
    total += n;
    yield total;
  }
}

async function* fromList(list: number[]) { for (const n of list) yield n; }

for await (const t of runningTotals(fromList([1, 2, 3]))) console.log(t); // 1, 3, 6
```

`yield*` hands over every value of another generator, which helps when one chunk completes several events.

Unlike the Promise in Part 1, a generator is **lazy**. Calling `runningTotals(...)` runs none of its body. The body runs only as the caller asks for values, one `next()` at a time. So a generator that calls `fetch` sends nothing until someone starts reading it.

### Write, in `src/sse.ts`:

- **`SseEvent`**: **`{ event: string; data: string }`**.
- **`parseSse(chunks: AsyncIterable<Uint8Array>): AsyncGenerator<SseEvent>`**, following the rules above.

### Write, in `src/stream.ts`:

First, in `src/raw.ts`, move the error handling of `sendMessage` into **`toApiError(response): Promise<ApiError>`**, so streaming can reuse it.

- **`streamMessage(params, options): AsyncGenerator<Anthropic.MessageStreamEvent>`**, an async generator:
  1. Send the request like `sendMessage`, with `stream: true` added to the body.
  2. If the response isn't `ok`, throw `toApiError(response)`. An error found before the stream started is an ordinary HTTP error.
  3. Parse `response.body` with `parseSse`.
  4. Skip `ping` events.
  5. On an `error` event, throw an `ApiError` with status 200 (what the HTTP status was), the type and message from its data, and the response's `request-id`.
  6. Yield every other event's `data`, parsed from JSON.
- **`StreamResult`**: **`{ text, stopReason, inputTokens, outputTokens, timeToFirstTokenMs: number | null, totalMs }`**.
- **`collectStream(events, onText = () => {}, now = () => performance.now()): Promise<StreamResult>`**:
  - Read `now()` once at the start.
  - Take `inputTokens` from `message_start`.
  - For each `content_block_delta` whose `delta.type` is `"text_delta"`, append the text and call `onText` with it. At the first one, set `timeToFirstTokenMs` to `now()` minus the start.
  - Take `stopReason` and `outputTokens` from `message_delta`.
  - At the end, read `now()` once more for `totalMs`.
  
  So `now` is called exactly three times when there is text. Because `streamMessage` is lazy, the request itself is sent inside `collectStream`, and TTFT includes it.

`src/ttft.ts`: stream the answer to a question from the command line with `streamMessage` and `collectStream`, printing the text as it arrives (`process.stdout.write`, which doesn't add a newline). At the end, print the time to the first token and the total time. Ask for something long, like a short story, and compare the two numbers.

### The SDK version

`client.messages.stream(params)` does all of the above. `stream.on("text", (text) => ...)` is called for each text delta, and `await stream.finalMessage()` gives the complete `Anthropic.Message`, the same object `create` returns. Add **`sendStreaming(text, onText): Promise<Reply>`** to `Conversation`. It works like `send`, but uses `stream` and `finalMessage()` and calls `onText` with each piece. Then make `src/chat.ts` print answers as they arrive.

### Faking a streamed response

A `Response` can have a stream as its body. Add these to `tests/fakes.ts`:

- **`sse(event, data)`**: the text of one event, `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`.
- **`streamResponse(chunks, status = 200)`**: a `Response` whose body delivers each string of `chunks` as a separate chunk (encoded with `TextEncoder`), with `content-type: text/event-stream` and a `request-id`. Build the body like this:

  ```ts
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  ```
- **`helloStream()`**: the eight events of the example above, as a list of `sse(...)` strings. The SDK reads `message_start.message` as a full message, so give it every field `textMessage` has, with empty `content`.

For `parseSse` tests, a small async generator that yields encoded strings, or raw `Uint8Array`s, is enough. No `Response` is needed.

### Test that:

`parseSse`:
- One event in one chunk gives `{ event, data }`.
- Two events in one chunk give two events.
- **Cut everywhere.** For a text with two events, cut it into two chunks at every position from 1 to its length − 1. Every cut gives the same two events.
- Feeding one byte per chunk gives the same event.
- Two `data` lines give one event whose data is the two values joined with `\n`, and whose type is `"message"`.
- `\r\n` line endings work, also when a chunk ends between `\r` and `\n`.
- A comment line and an `id` field are ignored. `data:x` gives `x`, and `data:  y` (two spaces) gives ` y`.
- An event with an `event` line but no `data` is not emitted.
- An event missing its final empty line at the end of the stream is not emitted.
- `data: שלום` cut into two chunks in the middle of a letter (encode it and cut the bytes at index 7) gives `שלום`.

`streamMessage` and `collectStream`:
- With `helloStream()`:
  - the result is `"Hello world"`, `end_turn`, 12 input and 7 output tokens
  - `onText` was called with `"Hello"` and `" world"`
  - the request body is the params plus `stream: true`
- Reading `streamMessage` directly yields 7 events, none of them a `ping`.
- Calling `streamMessage(...)` makes no request until the first `next()`.
- `helloStream()` joined and re-cut into chunks of 7 characters still gives `"Hello world"`.
- A stream with an `error` event after the first delta rejects with an `ApiError` with status 200 and type `overloaded_error`.
- A 429 before the stream rejects with an `ApiError` with status 429.
- With `now` returning 1000, 1120 and 1500, `timeToFirstTokenMs` is 120 and `totalMs` is 500.

`Conversation.sendStreaming`, with `helloStream()`:
- `onText` got both pieces.
- The `Reply` has the full text, stop reason and tokens.
- The history's assistant message is the one text block `"Hello world"`.
- The request had `stream: true`.

---

## Part 7 — Errors, retries and timeouts

**Files:** `src/retry.ts`, `src/raw.ts`

### Which failures to retry

Some failures go away if you try again. Others never do:

| Retry | Don't retry |
|---|---|
| 408 request timeout, 409 conflict | 400 invalid request: the same request fails the same way |
| 429 rate limit: you sent too much, too fast | 401 authentication, 403 permission |
| 500 and above, including 529 "overloaded" | 404 not found |
| a network failure: `fetch` throws a `TypeError` | a bug in your own code |
| your own timeout (below) | a request the user cancelled |

Retrying a request also has to be **safe**: sending it twice must not do something twice. A Messages request changes nothing on the server, so the worst a duplicate does is cost tokens again. That's not true of every API.

### How long to wait

Retrying at once doesn't help a server that is overloaded: everyone who just failed retries at the same moment, and it fails again. The standard answer, from Brooker's article, has three parts:

- **Exponential backoff.** Wait longer before each retry: `base × 2^attempt` (500 ms, 1 s, 2 s, ...), with a cap (8 s).
- **Full jitter.** Wait a random time between 0 and that value, so that clients that failed together spread out.
- **A limit.** After a few retries (2 here), give up and report the error.

If the server says how long to wait, believe it instead. A 429 or 529 can carry `retry-after` (seconds) or `retry-after-ms` (milliseconds).

### Timeouts

A request can also never fail and never finish. Without a timeout, the program waits forever. `fetch` takes an `AbortSignal` in its `init`. When the signal fires, `fetch` rejects with the signal's **reason**:

```ts
const controller = new AbortController();
const timer = setTimeout(
  () => controller.abort(new DOMException("Request timed out", "TimeoutError")),
  5000,
);
try {
  const response = await fetch(url, { signal: controller.signal });
  // ...
} finally {
  clearTimeout(timer); // otherwise the timer still fires later, and keeps the process alive until it does
}
```

Giving the reason a name, `TimeoutError`, is what tells a timeout (retry it) apart from the user pressing cancel (`AbortError`, don't).

### Changes to `src/raw.ts`

- `RequestOptions` gets **`signal?: AbortSignal`**, passed on to `fetch`.
- `ApiError` gets **`retryAfterMs: number | null`**, a fifth constructor parameter with default `null`.
- **`parseRetryAfter(headers): number | null`**:
  - If `retry-after-ms` is present and is a number of 0 or more, return it.
  - Otherwise, if `retry-after` is present and a number of 0 or more, return it × 1000.
  - Otherwise return `null`.
  
  `toApiError` uses it.

### Write, in `src/retry.ts`:

- **`isRetryable(error: unknown): boolean`**, following the table:
  - An `ApiError` or an `Anthropic.APIError` (the SDK's) is retryable by its `status`: 408, 409, 429 or ≥ 500.
  - An `Anthropic.APIConnectionError` has no status and is always retryable. In the SDK it is a subclass of `APIError`, so check for it first.
  - A `DOMException` named `"TimeoutError"` is retryable.
  - A `TypeError` (what `fetch` throws when the network fails) is retryable.
  - Anything else is not.
- **`backoffDelayMs(attempt, random = Math.random, baseMs = 500, capMs = 8000): number`**: `random() × min(capMs, baseMs × 2^attempt)`. `attempt` is 0 before the first retry.
- **`RetryOptions`**: **`{ maxRetries?: number; timeoutMs?: number; random?: () => number; sleep?: (ms: number) => Promise<void> }`**, with defaults 2, 60 000, `Math.random`, and a real sleep (`new Promise((resolve) => setTimeout(resolve, ms))`).
- **`withRetries<T>(fn: (signal: AbortSignal) => Promise<T>, options = {}): Promise<T>`**. For each attempt:
  1. Create an `AbortController` and a timer that aborts it with a `TimeoutError` after `timeoutMs`.
  2. Call `fn(signal)` and return its result if it succeeds.
  3. If it throws, rethrow when the error isn't retryable or `maxRetries` retries have been used.
  4. Otherwise sleep for the error's `retryAfterMs` if it has one, else `backoffDelayMs(attempt, random)`, and go to the next attempt.
  
  Clear the timer in a `finally`, on every path. Use it like this: `withRetries((signal) => sendMessage(params, { ...options, signal }))`.

`sleep` and `random` are parameters for the same reason `fetch` is: tests replace them. A fake `sleep` that only records the delays makes the tests instant and shows exactly what your code decided.

### Retries in only one layer

The SDK already retries twice by default (Part 2). If you wrap SDK calls in `withRetries` too, the two layers multiply. Each of your 3 attempts makes 3 SDK attempts: 9 requests to a server that is already overloaded. With three layers of 3 it would be 27. The rule from both Brooker and the SRE book: retry in **one** layer. If your code owns retries, create the client with `maxRetries: 0`. The SDK accepts a signal per request: `client.messages.create(params, { signal })`.

### Test that:

- `isRetryable(new ApiError(status, ...))` is false for 400, 401 and 404, and true for 408, 409, 429, 500 and 529. `it.each` runs one test per row of a table.
- `isRetryable` is true for a `TypeError` and a `TimeoutError`, and false for an `AbortError` and a plain `Error`.
- With `random` returning 0.5, `backoffDelayMs` for attempts 0 to 5 is `[250, 500, 1000, 2000, 4000, 4000]`. With `random` returning 0, it's 0.

Use a fake `sleep` that records its delays for every `withRetries` test, and pass `signal` through to `sendMessage`:

- **Retry then success.** A scripted 529, 529, 200, with `random` returning 0.5:
  - the result is the message
  - `fetch` was called 3 times
  - the recorded delays are `[250, 500]`
- A 400 rejects after 1 call, with no sleep.
- Always 529, with `maxRetries: 2`: rejects with status 529 after 3 calls.
- **The server's delay wins.** A 529 with `retry-after-ms: 1500`, then a 200: the only delay is 1500. A 429 with `retry-after: 2`, then a 200: the only delay is 2000.
- **Timeout.** Use fake timers: `vi.useFakeTimers()` at the start of the test, and `vi.useRealTimers()` in an `afterEach`. The first call to the fake `fetch` returns a Promise that never resolves on its own: it rejects only when its signal aborts, with `init.signal.reason`. The second call returns a 200. With `timeoutMs: 5000`:
  1. Start `withRetries` without awaiting it.
  2. `await vi.advanceTimersByTimeAsync(5000)`.
  3. Then await the result.
  
  Check that:
  - the result is the message
  - the first signal is aborted, with reason named `TimeoutError`
  - one backoff delay was recorded
  - `vi.getTimerCount()` is 0, so every timer was cleared
- **Layers multiply.** Wrap `client.messages.create(params, { signal })` in `withRetries`, against a `fetch` that always returns 529 with `retry-after-ms: 1` (so the SDK doesn't wait). With the client's `maxRetries: 2`, `fetch` is called **9** times. With `maxRetries: 0`, it's called 3 times. Both reject with `Anthropic.InternalServerError`.

---

## Part 8 — Structured output

**Files:** `src/extract.ts`, `src/remind.ts`

### From text to data

A program often needs data from a model, not prose: here, a reminder from a request like *"remind me to call the dentist on Thursday, it's urgent"*:

```json
{ "title": "Call the dentist", "due": "2026-10-22", "priority": "urgent" }
```

Huyen's article lists the ways to get there. You'll compare two of them:

1. **Ask in the prompt, then check.** Describe the JSON you want and validate what comes back. Simple, but nothing stops the model from wrapping the JSON in prose or in a ```` ```json ```` fence, misspelling a key, or inventing a priority.
2. **Constrained sampling.** Give the API a JSON Schema. While the model writes, every token that would break the schema is removed before sampling: the top-k/top-p idea from Part 4, with the schema deciding what's allowed. The output is then guaranteed to parse and to fit the schema, with two exceptions: an answer cut off by `max_tokens` is incomplete JSON, and a refusal may not follow the schema.

Either way, your code still validates. The model is outside your program, and its output is input like any other.

### Validating with zod

**zod** describes a shape once, and gives you both a runtime check and a TypeScript type:

```ts
import { z } from "zod";

const Book = z.object({
  title: z.string(),
  year: z.number().int(),
  format: z.enum(["paper", "ebook"]),
  isbn: z.string().nullable(),          // a string or null
});
type Book = z.infer<typeof Book>;       // { title: string; year: number; format: "paper" | "ebook"; isbn: string | null }

const result = Book.safeParse(JSON.parse(text));
if (result.success) {
  result.data.format;                   // typed as "paper" | "ebook"
} else {
  result.error.message;                 // what didn't match, and where
}
```

`safeParse` never throws; `parse` throws on a mismatch. For a date in `YYYY-MM-DD` form, use `z.iso.date()`. Note that a value and a type may share a name: `Book` the schema, and `Book` the type.

### The schema the API gets

The API takes a plain JSON Schema in `output_config.format`, with a few rules: every object needs `additionalProperties: false`, every property must be listed in `required`, and only some features are supported (`enum`, `anyOf`, `null` and the format `date` are). Write it by hand, next to the zod schema, so you see exactly what is sent:

```ts
{
  type: "object",
  properties: {
    title: { type: "string", description: "What to do, as a short imperative phrase" },
    due: { anyOf: [{ type: "string", format: "date" }, { type: "null" }], description: "The due date, or null if none was given" },
    priority: { type: "string", enum: ["low", "normal", "urgent"] },
  },
  required: ["title", "due", "priority"],
  additionalProperties: false,
}
```

The SDK also has a helper that builds the schema from zod and parses the answer in one step (`messages.parse` with `zodOutputFormat`). It's not used here for two reasons. It moves `enum` out of the schema into a description, so the API no longer constrains the priority. And when the answer doesn't parse, it throws before you can see `stop_reason`, so you can't tell a truncated answer from an invalid one.

### The date

"Thursday" means nothing without today's date, and the model doesn't know the date. Put it in the system prompt: `You turn a user's request into a reminder. Today is 2026-10-21.` Tests pass a fixed date, and `src/remind.ts` passes the real one (`new Date().toISOString().slice(0, 10)`).

### Write, in `src/extract.ts`:

- **`Reminder`**: the zod schema, `{ title: string, due: ISO date or null, priority: "low" | "normal" | "urgent" }`, and **`type Reminder = z.infer<typeof Reminder>`**.
- **`REMINDER_JSON_SCHEMA`**: the JSON Schema above.
- **`ExtractionError`**, extending `Error`, with **`reason: "invalid" | "refused" | "truncated"`**.
- **`systemPrompt(today): string`**: the system prompt above.
- **`parseReminder(text): Reminder`**:
  1. Take the text from the first `{` to the last `}`. That's enough to get past a fence or a sentence around the JSON.
  2. Parse it with `JSON.parse`.
  3. Validate it with `Reminder.safeParse`.
  
  Any failure (no braces, broken JSON, wrong shape) throws `ExtractionError` with reason `"invalid"`.
- **`extractByPrompt(client, request, today, model): Promise<Reminder>`**: the first way. The system prompt is `systemPrompt(today)` followed by instructions to reply with only a JSON object with the three keys, their types and allowed values. Send it with `max_tokens: 2000`, and no `output_config`.
- **`extractStructured(client, request, today, model): Promise<Reminder>`**: the second way. The system prompt is just `systemPrompt(today)`, plus `output_config: { format: { type: "json_schema", schema: REMINDER_JSON_SCHEMA } }`.

Both check `stop_reason` **before** parsing:
- `refusal` → `ExtractionError` with reason `"refused"`.
- `max_tokens` → reason `"truncated"`.
- Then `parseReminder(getText(message))`.

And `src/remind.ts`: run both ways on the request from the command line, and print each result or its error. Try a clear request, a vague one (*"don't let me forget mom's birthday"*) and one that isn't a reminder at all.

This is the bridge to tool calling in AGENT01. A tool is a JSON Schema the model can choose to fill, and a tool call is the model returning structured input for your function.

### Test that:

`parseReminder`:
- Plain JSON gives the object.
- JSON inside a ```` ```json ```` fence with a sentence before it gives the same object.
- `"due": null` is allowed.
- Rejected, each with `ExtractionError` and reason `"invalid"`:
  - text with no JSON
  - broken JSON
  - `"priority": "high"`
  - `"due": "Thursday"`

`extractByPrompt`, with scripted responses:
- It returns the reminder.
- The request's `system` contains the date.
- The request has no `output_config`.
- A `refusal` rejects with reason `"refused"`.

`extractStructured`:
- It returns the reminder.
- The request's `output_config` is exactly `{ format: { type: "json_schema", schema: REMINDER_JSON_SCHEMA } }`.
- `system` contains the date.
- Rejected:
  - a `refusal`, with reason `"refused"`
  - a `max_tokens` with half a JSON object, with reason `"truncated"`, not `"invalid"`
  - an `end_turn` with JSON of the wrong shape, with reason `"invalid"`

---

## Running

From this folder:

```
npx tsc --noEmit                                       # type check
npx vitest run                                         # tests, no API calls
node --env-file=.env src/ask.ts "your question"        # one request, with stop reason and cost
node --env-file=.env src/compare-effort.ts "puzzle"    # low vs. high effort
node --env-file=.env src/ttft.ts "write a story"       # streaming, time to first token
node --env-file=.env src/chat.ts                       # the chat
node --env-file=.env src/remind.ts "call mom Friday"   # structured output, both ways
```
