# Assignment LLM02 — LLM Calls in Production (TypeScript)

**Topics:** tracing model calls, tokens and cost, latency percentiles, which failures to retry, exponential backoff with jitter, `Retry-After`, timeouts, validating structured output against a schema, repair attempts, evals, a release gate on quality, cost and latency

**Before this:** AGENT01. This assignment builds on its `ChatModel` interface.

## Introduction

A demo calls the model and prints the answer. A product calls it thousands of times a day, and then other questions matter:

- **What does it cost, and how slow is it?** You pay per token, and users feel the slowest calls, not the average one.
- **What happens when a call fails?** Providers return 429 when you send too much and 529 or 5xx when they're overloaded. Connections drop. Some calls just hang.
- **Can the code trust the answer?** If code reads the reply, the reply must have the right shape. A model sometimes returns broken JSON or a missing field.
- **Did a change make it better or worse?** A new prompt or model can't be checked by trying two examples by hand.

This assignment builds one small layer for each question, around the `ChatModel` interface from AGENT01. Each layer is itself a `ChatModel` that wraps another one, so they stack:

```
traced( withRetry( model ) )      ← each layer adds one thing and passes the call on
```

The product is a support-ticket sorter: the model reads a ticket and returns `{ "category": ..., "urgent": ... }` as JSON. At the end you run it through the whole stack, on twelve labelled tickets, with two prompts, and get quality, cost and latency side by side.

None of this depends on the provider. The given code turns Claude's and Ollama's formats, usage numbers and errors into the same shapes, and everything you write works with both.

The assignment has five parts, 0 to 4. Do them in order. Names given in **bold code** are required, because the tests and later parts use them.

### What you build

| Part | File | What |
|---|---|---|
| 0 | given | The project, and the changes from AGENT01's model code |
| 1 | `src/trace.ts` | `traced`: a span per call, with tokens, cost and duration; `summarize` with p50 and p95 |
| 2 | `src/retry.ts` | `withRetry`: retry what's worth retrying, with backoff, jitter and a timeout |
| 3 | `src/structured.ts` | `completeJson`: JSON checked against a schema, with one repair attempt |
| 4 | `src/eval.ts` | `runEval` and `gate`, and a run of the given comparison script |

In all, about 100 lines of code, plus tests.

### Learning outcomes

By the end of this assignment you can:

1. Wrap a model client in layers that each add one production concern, and say what the order of the layers changes.
2. Compute the cost of a call from its token usage, and explain why latency is reported as percentiles.
3. Tell a failure worth retrying from one that isn't, and retry without making an overload worse.
4. Get structured output the code can rely on, and handle the case where the model gets it wrong.
5. Judge a prompt or model change by an eval and a release gate, not by trying a few examples.

---

## Reading

### Before you start

1. **[Refactoring Guru — Decorator](https://refactoring.guru/design-patterns/decorator)**, the sections "Intent", "Problem" and "Solution".
   The pattern every part uses: an object that has the same interface as the one it wraps, and adds behavior around the call.
   *Parts 1–2.*
2. **[Google SRE book, chapter 4 — Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)**, the section "Indicators in Practice", up to the end of "Aggregation".
   Why latency is measured as percentiles (p50, p95, p99) and not as an average.
   *Part 1.*
3. **[Amazon Builders' Library — Timeouts, retries, and backoff with jitter](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter)**, the whole article.
   Timeouts, why retries can make an overload worse, exponential backoff, and why jitter spreads the retries out.
   *Part 2.*
4. **[Claude API — Errors](https://platform.claude.com/docs/en/api/errors)**, the section "HTTP errors".
   A real provider's status codes: which mean "your request is wrong" (400, 401, 404) and which mean "try again later" (429, 500, 529).
   *Part 2.*
5. **[Zod — Basics](https://zod.dev/basics)**, all four sections, and in [Formatting errors](https://zod.dev/error-formatting) the section on `z.prettifyError`.
   Zod is the schema library you check the model's JSON with: define a schema, `safeParse`, and a readable error.
   *Part 3.*
6. **[Hamel Husain — Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/)**, the sections "Motivation", "Iterating Quickly == Success" and "Level 1: Unit Tests".
   Why LLM products need evals, and the simplest kind: checks you can write as code.
   *Part 4.*

### Going deeper

- **[Google SRE book, chapter 22 — Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)**, the sections "Retries" and "Latency and Deadlines": retry budgets, deadline propagation and cancellation.
- **[OpenTelemetry GenAI semantic conventions](https://github.com/open-telemetry/semantic-conventions-genai)**. The standard names for what Part 1 records, so spans from any library show up the same way in any tracing tool.
- **[Claude API — Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)**. Constrained decoding: the provider guarantees the schema, instead of you checking it afterwards. See "Provider-specific features" below.
- **[Ollama — Chat API](https://docs.ollama.com/api/chat)**. The response fields the given code reads token counts from, and timing fields broken down by phase.
- **Chip Huyen, *AI Engineering* (O'Reilly, 2025)**, chapter 3 "Evaluation Methodology" and chapter 4 "Evaluate AI Systems". Evals in depth, including AI as a judge, which LLM03 builds.
- **[Hamel Husain — Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/)**, the rest of the article: human and model evals, and A/B tests.

---

## Part 0 — Project setup

The folder already has the given code. Run `npm install`, then check that `npx tsc --noEmit` passes. It reports errors only for the files that compare.ts imports and you haven't written yet: `trace.ts`, `retry.ts`, `structured.ts` and `eval.ts`. They go away as you write them.

**What's given, and what changed from AGENT01.** `src/model/` is AGENT01's model code, with three changes:

- **`ModelReply` has `usage`:** `{ inputTokens, outputTokens }`. Both providers fill it in from their responses.
- **Errors have one shape:** both providers throw **`ModelError`** (`src/model/errors.ts`) when a request fails. Its `status` is the HTTP status, or `undefined` when no response came back at all, and its `retryAfterMs` comes from the provider's `Retry-After` header when there is one. `errors.ts` also has **`TimeoutError`**, which Part 2 throws.
- **No hidden retries:** the Claude SDK retries twice by default. The given code turns that off (`maxRetries: 0`), so the retries you write in Part 2 are the only ones.

Also given:

- `src/model/prices.ts`: prices per million tokens, and `priceFor(modelName)`. A local model costs `0`.
- `src/model/scripted.ts`: the fake model for tests. Its script can now hold errors too, which it throws in turn. Helpers: `answer(text, usage?)`, `cutOff(text)` for a reply that hit the token limit, and `fail(status?, retryAfterMs?)` for a failed request.
- `src/tickets.ts`: the product. The `TicketLabel` schema, two system prompts, and twelve labelled tickets.
- `src/compare.ts`: the Part 4 script.

Each part's tests go in `tests/`, and check exactly what its "Test that" list says.

---

## Part 1 — Tracing, cost and latency

**File:** `src/trace.ts`

You can't fix what you don't measure. A **span** is the record of one operation: what it was, when it started, how long it took, and what it produced. A trace is the spans of one piece of work. Production systems send spans to a tracing tool; here they go into an array.

**The wrapper pattern.** A function that takes an object and returns a new object with the same interface, which does something before and after passing the call on. An unrelated example, a cache around any function from string to number:

```ts
function cached(lookup: (key: string) => Promise<number>): (key: string) => Promise<number> {
    const seen = new Map<string, number>();
    return async key => {
        if (!seen.has(key)) seen.set(key, await lookup(key));
        return seen.get(key)!;
    };
}
```

The caller can't tell `cached(lookup)` from `lookup`. For a `ChatModel`, you return an object literal: `return { async complete(request) { ... } }`.

Write:

1. **`Span`**, an exported interface: `name: string`, `startMs: number`, `durationMs: number`, `inputTokens: number`, `outputTokens: number`, `costUsd: number`, `stopReason?: StopReason`, `error?: string`.
2. **`costUsd(usage: Usage, price: Price): number`**: `(inputTokens × inputPerMTok + outputTokens × outputPerMTok) / 1,000,000`. Input and output have different prices; output is usually five times more.
3. **`traced(model: ChatModel, options: { name: string; price: Price; spans: Span[]; now?: () => number }): ChatModel`**. Its `complete`:
   - Reads the time: `now()`, where `now` defaults to `() => performance.now()`. Tests pass a fake clock.
   - Calls `model.complete(request)`.
   - On success, pushes a span with the reply's usage, its cost and its `stopReason`, and returns the reply.
   - On error, pushes a span with `0` tokens, `0` cost and `error` set to the error's `message` (or `String(error)`), then **throws the same error again**. A tracing layer records; it never changes what happens.
   - `durationMs` is `now()` at the end minus the start, both on success and on error.
4. **`percentile(values: number[], p: number): number`**, by the **nearest-rank** method: sort a copy (`[...values].sort((a, b) => a - b)`), then take the element at position `ceil(p / 100 × n)`, counting from 1, and at least 1. For `n = 10`, p95 is the 10th value and p50 the 5th. Return `0` for an empty array. Don't sort the caller's array in place.
5. **`Summary`**, an exported interface, and **`summarize(spans: Span[]): Summary`**: `calls` (number of spans), `errors` (spans with an `error`), `inputTokens`, `outputTokens` and `costUsd` (sums), and `p50Ms` and `p95Ms` (percentiles of `durationMs`).

Import `Price` from `./model/prices.ts` and `ChatModel`, `StopReason` and `Usage` from `./model/types.ts`, with `import type`.

**Why p95 and not the average.** With nineteen calls of 1 second and one of 20 seconds, the average is about 2 seconds, which no user ever saw. p50 says what a typical user waits; p95 says what one in twenty waits, and that's who complains.

### Test that:

In `tests/trace.test.ts`, with `ScriptedModel`, `answer` and `fail`, the price `{ inputPerMTok: 4, outputPerMTok: 20 }`, and a fake clock: `function clock(...times: number[]) { return () => times.shift()!; }`.

- **Cost:** 1,000,000 input tokens cost `4`; 2000 in and 500 out cost `0.018`. Compare with `toBeCloseTo`, since these are floating-point numbers.
- **A span per successful call:** with `answer("Hi", { inputTokens: 2000, outputTokens: 500 })` and `now: clock(100, 350)`, the reply's text is `"Hi"`, and there's one span matching `{ name: "chat", startMs: 100, durationMs: 250, inputTokens: 2000, outputTokens: 500, stopReason: "end" }` (`toMatchObject`), with cost close to `0.018` and no `error`.
- **A failed call gets a span too, and still throws:** with `fail(503)` and `clock(0, 40)`, `complete` rejects with `"HTTP 503"`, and the spans equal `[{ name: "chat", startMs: 0, durationMs: 40, inputTokens: 0, outputTokens: 0, costUsd: 0, error: "HTTP 503" }]`.
- **Percentile:** for `[50, 10, 40, 20, 30, 100, 60, 70, 80, 90]`, p50 is `50`, p95 is `100` and p10 is `10`. p95 of `[7]` is `7`, and of `[]` is `0`. The array's first element is still `50` afterwards.
- **Summary:** for three spans with durations 100, 300 and 200 ms, tokens (1000 in, 100 out), (2000, 200) and (0, 0), the last one with an `error`: `calls` 3, `errors` 1, `inputTokens` 3000, `outputTokens` 300, `p50Ms` 200, `p95Ms` 300, and `costUsd` close to `0.018`. `summarize([])` is all zeros.

---

## Part 2 — Retries and timeouts

**File:** `src/retry.ts`

A call can fail in two ways, and they need opposite handling:

- **Transient:** the same request may work in a moment. 429 (too many requests), 408 (request timeout), 409 (conflict), any 5xx including 529 (overloaded), no response at all (status `undefined`), and your own timeout. **Retry these.**
- **Permanent:** the request itself is wrong. 400 (bad request), 401 (bad key), 403, 404, 413 (too large), or a bug in your own code. Retrying sends the same wrong request again, and wastes time and money. **Throw at once.**

When a provider is overloaded, every client retrying immediately makes it worse. So wait before each retry, longer each time (**exponential backoff**), and pick a random point within that wait (**jitter**), so that a thousand clients that failed together don't all come back at the same moment. If the provider said how long to wait (`Retry-After`), wait exactly that.

Write:

1. **`isRetryable(error: unknown): boolean`**: true for a `TimeoutError`, and for a `ModelError` whose `status` is `undefined`, 408, 409, 429 or 500 and above. False for everything else, including errors that aren't a `ModelError`.
2. **`withTimeout`**: given, copy it as is. `Promise.race` settles with whichever promise settles first, and `finally` clears the timer either way, so a finished call doesn't leave a timer running:

   ```ts
   export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
       let timer: ReturnType<typeof setTimeout> | undefined;
       const timeout = new Promise<never>((_, reject) => {
           timer = setTimeout(() => reject(new TimeoutError(`No reply after ${ms} ms`)), ms);
       });
       return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
   }
   ```

   The timeout stops the wait, not the request: the model call keeps running in the background. Real code also cancels it, by passing an `AbortSignal` to `fetch`. See "Going deeper".
3. **`RetryOptions`**, an exported interface: `maxAttempts`, `baseDelayMs`, `maxDelayMs`, `timeoutMs` (all numbers), and optional `sleep?: (ms: number) => Promise<void>` and `random?: () => number`. `sleep` defaults to a `setTimeout` promise and `random` to `Math.random`. Tests pass their own, to record the delays instead of waiting them, and to make the jitter predictable.
4. **`withRetry(model: ChatModel, options: RetryOptions): ChatModel`**. Its `complete` loops over attempts, counting from 1:
   - Return `await withTimeout(model.complete(request), timeoutMs)`. Each attempt gets its own timeout.
   - If it throws, and this was attempt number `maxAttempts`, or the error isn't retryable: throw the error.
   - Otherwise sleep, then try again. The delay is the error's `retryAfterMs` if it's a `ModelError` that has one. If not: `random() × min(maxDelayMs, baseDelayMs × 2^(attempt − 1))`. This is "full jitter": anywhere from 0 up to the backoff.

With `baseDelayMs: 1000`, `maxDelayMs: 3000` and `random` always `0.5`, the delays after attempts 1, 2, 3, 4 are 500, 1000, 1500 and 1500 ms.

**The order of the layers matters.** `traced(withRetry(model))` gives one span per request your code made, however many attempts it took: what the user waited. `withRetry(traced(model))` gives one span per attempt: what the provider did. Both are useful; the test below uses both at once.

### Test that:

In `tests/retry.test.ts`. Requests are `{ messages: [{ role: "user", text: "Hi" }], tools: [] }`. The options are `{ maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 3000, timeoutMs: 1000, sleep, random: () => 0.5 }`, where `sleep` pushes `ms` to a `delays` array and returns at once.

- **Which errors are worth retrying:** `fail(s)` is retryable for 408, 409, 429, 500, 503 and 529, and not for 400, 401, 403, 404 and 413. `fail()` (no status) and a `TimeoutError` are retryable; `new Error("a bug in our code")` isn't.
- **Retries until it succeeds, with growing delays:** script `[fail(529), fail(500), answer("Hi")]`. The reply's text is `"Hi"`, the model got 3 requests, and `delays` is `[500, 1000]`.
- **The delay is capped:** with `maxAttempts: 5` and four `fail(529)`s before the answer, `delays` is `[500, 1000, 1500, 1500]`.
- **`Retry-After` wins:** script `[fail(429, 7000), answer("Hi")]` gives `delays` `[7000]`.
- **Gives up after `maxAttempts`:** script `[fail(503), fail(503), fail(529)]` rejects with `"HTTP 529"`, after 3 requests and 2 delays.
- **A permanent error is thrown at once:** script `[fail(400), answer("never reached")]` rejects with `"HTTP 400"`, after 1 request and no delays.
- **A slow reply times out, and the timeout is retried:** a `ChatModel` whose first call waits 200 ms (with a real `setTimeout`) and then answers, and whose later calls answer at once. With `timeoutMs: 20`, the reply is `"Hi"` after 2 calls.
- **A model that never answers ends in a `TimeoutError`:** a `ChatModel` whose `complete` returns `new Promise(() => {})`, with `timeoutMs: 20` and `maxAttempts: 2`. The error is an instance of `TimeoutError`.
- **Where the tracing goes decides what a span measures:** wrap `[fail(529), fail(529), answer("Hi")]` as `traced(withRetry(traced(inner, attempt spans), options), request spans)`, both with price 0. The attempt spans' errors are `["HTTP 529", "HTTP 529", undefined]`; there's one request span, with no error.

---

## Part 3 — Structured output you can trust

**File:** `src/structured.ts`

The ticket router reads `label.category` and `label.urgent`. If the model returns `"urgent": "yes"`, a missing field or a sentence instead of JSON, the router breaks, or worse, routes the ticket wrong without an error. So never use a model's JSON without checking it against a schema.

When the check fails, the cheapest fix is often to ask once more, with the problem in the message: models are good at fixing an error they're shown. But only once or twice: each repair is another paid call.

The schema is a Zod schema. `src/tickets.ts` defines one:

```ts
const TicketLabel = z.object({ category: z.enum(["billing", "bug", "account", "other"]), urgent: z.boolean() });
const result = TicketLabel.safeParse(value);   // never throws
if (result.success) result.data                 // typed as { category: ...; urgent: boolean }
else z.prettifyError(result.error)              // "✖ Invalid input: expected boolean, received string\n  → at urgent"
```

Write:

1. **`InvalidOutputError`**, an exported class that extends `Error`, with nothing in it.
2. **`extractJson(text: string): string`**: models often wrap JSON in a Markdown code fence, with or without `json` after the opening backticks, and sometimes with a sentence before it. If the text has a fence, return what's inside it; otherwise the whole text. Trim the result either way. The regular expression ``/```(?:json)?\s*([\s\S]*?)```/`` captures the inside of a fence.
3. **`completeJson<T>(model: ChatModel, request: ModelRequest, schema: z.ZodType<T>, repairs = 1): Promise<T>`**:
   1. Copy the request's messages into a new array. Don't change the caller's.
   2. Up to `repairs + 1` times: call the model with `{ ...request, messages }`, and check the reply, in this order:
      - If `stopReason` is `"max_tokens"`, the problem is `it was cut off at the output token limit`. A cut-off reply may still parse, by luck, but it isn't the whole answer.
      - Otherwise, `JSON.parse(extractJson(text))`. If that throws, the problem is `it is not JSON (<the error's message>)`.
      - Otherwise, `schema.safeParse(value)`. If it fails, the problem is `it does not match the schema:\n<z.prettifyError(result.error)>`.
      - If there's no problem, return `result.data`.
   3. After a problem, append two messages: the reply's `message` as it came, and a user message with the text `Your reply was not valid: <problem>\nReply again with only the corrected JSON.`
   4. If no attempt was valid, throw an `InvalidOutputError` with the message `No valid JSON after <repairs + 1> attempts: <the last problem>`.

Import `z` from `"zod"` (a value, since you call `z.prettifyError`), and the types `ChatModel`, `ModelReply` and `ModelRequest`.

### Test that:

In `tests/structured.test.ts`, with the schema `z.object({ category: z.enum(["billing", "bug"]), urgent: z.boolean() })` and the request `{ system: "Classify.", messages: [{ role: "user", text: "Charged twice" }], tools: [] }`.

- **`extractJson`:** plain `{"a": 1}` stays the same; `` Here you go:\n```json\n{"a": 1}\n``` `` and `` ```\n{"a": 1}\n``` `` both give `{"a": 1}`.
- **Valid JSON comes back parsed and typed:** `answer('{"category": "billing", "urgent": false}')` gives `{ category: "billing", urgent: false }`, after 1 request.
- **An invalid reply gets one repair, with the problem in it:** script `'{"category": "billing", "urgent": "yes"}'`, then a valid reply. The result is the valid one. The second request keeps `system: "Classify."` and has 3 messages: the original, the bad reply (`role: "assistant"` and its text), and a user message that starts with `Your reply was not valid: it does not match the schema:`, contains `urgent`, and ends with `Reply again with only the corrected JSON.` The caller's `request.messages` still has 1 message.
- **Text that isn't JSON:** script `"It's about billing."`, then a valid reply. The repair message starts with `Your reply was not valid: it is not JSON (`.
- **A cut-off reply is not parsed:** script `cutOff('{"category": "billing", "urgent": false}')`, then `{"category": "bug", "urgent": false}`. The result is the second one, and the repair message contains `it was cut off at the output token limit`.
- **Still invalid after the repairs:** script `"nope"`, then `{"category": "refund", "urgent": false}`. The error is an `InvalidOutputError` whose message starts with `No valid JSON after 2 attempts: it does not match the schema:`, after 2 requests.
- **Repairs can be turned off:** with `repairs` `0` and script `"nope"`, it rejects with `No valid JSON after 1 attempts`.

---

## Part 4 — Evals and a release gate

**File:** `src/eval.ts`

Is the "detailed" prompt in `tickets.ts` better than the "short" one? Better enough to be worth its extra input tokens? Trying a few tickets by hand can't tell you, because the output varies, and a change that fixes one case can break another. An **eval** runs a fixed set of labelled cases and scores every one, the same way each time. A **gate** turns the scores into a yes or no: ship this change or not.

Write:

1. The exported types:
   - **`EvalCase<I, E>`**: `{ id: string; input: I; expected: E }`.
   - **`CaseResult`**: `{ id: string; passed: boolean; error?: string }`.
   - **`EvalReport`**: `{ results: CaseResult[]; passRate: number; failed: string[] }`.
   - **`Limits`**: `{ minPassRate: number; maxCostUsd: number; maxP95Ms: number }`.
2. **`runEval<I, E, O>(cases: EvalCase<I, E>[], task: (input: I) => Promise<O>, grade: (output: O, expected: E) => boolean): Promise<EvalReport>`**:
   - Run the cases one after the other, in order. For each one, `passed` is `grade(await task(input), expected)`.
   - If `task` throws, the case fails with `error` set to the message. One bad case doesn't stop the eval: a failure is a result, not a crash.
   - `passRate` is passed cases divided by all cases, or `0` when there are none. `failed` is the ids of the failed cases, in order.
3. **`gate(report: EvalReport, summary: Summary, limits: Limits): string[]`**: the names of the limits that were broken, in this order: `"passRate"` if `passRate < minPassRate`, `"costUsd"` if `summary.costUsd > maxCostUsd`, `"p95Ms"` if `summary.p95Ms > maxP95Ms`. An empty array means ship it.

Note that `runEval` knows nothing about models: `task` could be one model call, a chain, or an agent. That's what lets the same eval compare two prompts, two models, or two whole designs.

### Test that:

In `tests/eval.test.ts`, with the cases `two` (2 → 4), `three` (3 → 9), `boom` (−1 → 1) and `four` (4 → 15), a `task` that squares its input and throws `"negative"` for a negative one, and `grade` `(output, expected) => output === expected`:

- **Runs every case, in order, and grades it:** `results` equals `[{ id: "two", passed: true }, { id: "three", passed: true }, { id: "boom", passed: false, error: "negative" }, { id: "four", passed: false }]`, `passRate` is `0.5`, and `failed` is `["boom", "four"]`.
- **An empty eval has pass rate 0.**
- **The gate names every broken limit:** for a report with `passRate: 0.8` and a summary with `costUsd: 0.02` and `p95Ms: 4000`: limits `{ 0.8, 0.02, 4000 }` give `[]` (equal is not broken); `{ 0.9, 0.01, 3000 }` give `["passRate", "costUsd", "p95Ms"]`; `{ 0.5, 1, 3000 }` give `["p95Ms"]`.

### Run it

`src/compare.ts` puts it all together: for each prompt, it wraps the model as `traced(withRetry(model))`, runs the twelve tickets through `completeJson`, and prints the pass rate, the failed tickets, the tokens and cost, p50 and p95, and the gate's answer.

With a local model, through Ollama (install it as in AGENT01, then `ollama pull qwen3:1.7b`, a 1.4 GB model):

```
MODEL=qwen3:1.7b node src/compare.ts
```

Or with Claude, which costs real money, but less than a cent here with Haiku:

```
PROVIDER=anthropic MODEL=claude-haiku-5-5 node src/compare.ts
```

Read the output:

- Which prompt passed more tickets, and which tickets failed? Open `tickets.ts` and look at them: was the model wrong, or the label?
- How many more input tokens did the detailed prompt cost, per call? Every call sends it.
- Is `calls` more than 12? Then some replies needed a repair.
- With Ollama the cost is 0, but p95 is not. Compare it with Claude's.

---

## Provider-specific features

Everything above works with any provider. Providers also offer features that do some of this work for you. Use them when you can, but behind the interface, so the code above it doesn't change:

- **Constrained JSON output.** Instead of checking the JSON afterwards, give the provider the schema and it only generates tokens that fit it: Claude's `output_config: { format: { type: "json_schema", schema } }` and Ollama's `format: <schema>`. The repair loop then almost never runs; keep the check anyway, as a cheap guard.
- **Built-in retries.** The Claude SDK retries 408, 409, 429, 5xx and connection errors twice by default, with backoff, and honors `Retry-After`. The given code turns this off so you could write it. In your own projects, use the SDK's retries, or yours, but never both: two layers of retries multiply the attempts.
- **Prompt caching.** Claude can cache a long, repeated prefix, such as the detailed system prompt, and bill later reads of it at a fraction of the input price. It changes the cost math of Part 1: the usage then has cached-token fields too.
- **Usage and cost reports.** Providers have dashboards and APIs with the spend per key and per model. Your spans are still needed, because only they know which feature or prompt each call came from.

---

## Running the tests

```
npx tsc --noEmit     # type check
npx vitest run       # all tests; none of them calls a real model
```

---

## Cleaning up

What this assignment installed, and how to remove it when you're done:

- **The packages:** `rm -rf node_modules` in this folder.
- **The local model,** if you pulled it for Part 4: `ollama rm qwen3:1.7b`. Ollama itself is used by the agent assignments; AGENT01's cleanup section has the commands for removing it.
