# Assignment AGENT04 — Workflow Patterns (TypeScript)

**Topics:** workflows vs. agents, prompt chaining with checks between steps, routing to specialists, parallelization by sectioning and by voting, a concurrency limit, orchestrator-workers, evaluator-optimizer, choosing the simplest pattern that works

**Before this:** AGENT01, for the `ChatModel` interface and the agent loop. AGENT02 and AGENT03 aren't needed.

## Introduction

In AGENT01 the model decides everything: which tool to call, when, and when to stop. That's an **agent**. It's flexible, but every run takes a different path, so it's harder to predict, to test, and to put a price on.

Most LLM products don't need that freedom. The steps are known in advance; only the text inside each step needs a model. Code decides the path, and the model fills in each step. That's a **workflow**, and a few patterns cover most of them:

| Pattern | The idea | Use it when |
|---|---|---|
| **Prompt chaining** | One task as a fixed sequence of calls, each working on the previous one's output, with a check in code between them. | The task splits cleanly into steps, and each step is easier than the whole. |
| **Routing** | One call sorts the input; code sends it to a specialist prompt, or a cheaper model, for that kind of input. | Different kinds of input need different handling. |
| **Parallelization** | Independent calls at the same time. **Sectioning:** different subtasks of one input. **Voting:** the same task several times, and the majority wins. | Subtasks don't depend on each other, or one answer isn't reliable enough. |
| **Orchestrator-workers** | One call splits the task into subtasks that can't be known in advance; workers do them; one call combines the results. | The subtasks depend on the input. |
| **Evaluator-optimizer** | One call writes, another reviews against clear criteria; repeat with the feedback until it passes. | There are clear criteria, and feedback measurably improves the result. |

These are the patterns from Anthropic's "Building effective agents". Its main advice is the reason this assignment exists: start with the simplest thing that works (often one well-written call), add a workflow when one call isn't enough, and use an agent only when the path really can't be known in advance.

The product is Parcelpoint's support inbox, for a made-up parcel locker service. Each pattern handles one job in it: drafting a reply, sending an email to the right specialist, reviewing a reply, spotting phishing, answering an email with several questions, and improving a reply until it passes review.

None of this depends on the provider: it works the same with Claude and with a local model through Ollama.

The assignment has six parts, 0 to 5. Do them in order. Names given in **bold code** are required, because the tests and the given code use them.

### What you build

| Part | File | What |
|---|---|---|
| 0 | given | The project, the model code, the helpers and the product |
| 1 | `src/chain.ts` | `chain`: steps in sequence, with checks between them |
| 2 | `src/route.ts` | `route`: sort the input, then hand it to a specialist |
| 3 | `src/parallel.ts` | `sections`, `vote` and `mapLimit`: calls at the same time |
| 4 | `src/orchestrate.ts` | `orchestrate`: plan, workers, and a combined answer |
| 5 | `src/refine.ts` | `refine`: write, review, rewrite |

In all, about 120 lines of code, plus tests.

### Learning outcomes

By the end of this assignment you can:

1. Tell a workflow from an agent, and say what each costs in predictability, latency and money.
2. Build each of the five patterns on any model client.
3. Put checks in code between model calls, so a bad step stops the workflow instead of spreading.
4. Run independent calls at the same time, with a limit on how many at once.
5. Pick the simplest pattern that fits a task, and say why.

---

## Reading

### Before you start

1. **[Anthropic — Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)**, the sections "What are agents?", "When (and when not) to use agents" and "Building blocks, workflows, and agents" (all its subsections, up to "Agents").
   The five patterns this assignment builds, each with a diagram and examples of when to use it, and the case for choosing the simplest one.
   *All parts.*
2. **[MDN — Promise.all()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)**, the sections "Description" and "Promise.all fail-fast behavior".
   Starting several async calls at once and waiting for all of them, the results in the same order as the calls, and what happens when one fails.
   *Parts 3–4.*

### Going deeper

- **[Anthropic — Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)**, the rest of the article: combining the patterns, and the appendix on designing tools.
- **[Claude — Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)**, the sections "Chain complex prompts" and "Subagent orchestration".
- AGENT05 builds the same ideas as a graph, with LangGraph: routing becomes a conditional edge, and the workflow's state is saved between steps.

---

## Part 0 — Project setup

The folder has the given code. Run `npm install`, then `npx tsc --noEmit`. It reports errors only for the files you haven't written yet. They go away as you write them.

**What's given:**

- `src/model/`: AGENT01's model code. `modelFromEnv()` returns `{ model, name }`.
- `src/model/scripted.ts`: two fake models for tests.
  - `ScriptedModel`, as in AGENT01: `new ScriptedModel([answer("..."), ...])` returns the replies in order, and records every request in `requests`.
  - `RespondingModel`, for calls that run at the same time, where "in order" means nothing: `new RespondingModel(request => "...")` computes each reply from its request. Each call waits a few milliseconds on a real timer, so calls started together overlap, and `maxInFlight` is the most calls that ran at once. `lastText(request)` gives the text of a request's last message.
- `src/ask.ts`: two helpers every part uses.
  - **`ask(model, system, text)`**: one call with a system prompt and one user message, no tools. Returns the reply's text, trimmed.
  - **`askJson(model, system, text, schema)`**: the same, for a reply that must be JSON matching a Zod schema. It takes the text from the first `{` to the last `}`, and throws if that isn't valid JSON or doesn't match. LLM02 explains this in depth; here it's ready-made.
- `src/inbox.ts`: the product. The facts support may use, the prompts for each part, and six customer emails.
- `src/main.ts`: runs one pattern on a real model. Each part ends with its command.

Read `inbox.ts` before you start: the parts are easier when you've seen what they're used for.

Each part's tests go in `tests/`, and check exactly what its "Test that" list says.

---

## Part 1 — Prompt chaining

**File:** `src/chain.ts`

Writing a good reply to a messy email is one hard task. Three easy ones are more reliable: say in one sentence what the customer wants, write a reply to that, then cut the reply to length. Each call gets a short, focused prompt, and you can see and check what each step produced.

The checks are the point. Between steps, code checks the output: a summary must be one line, a reply must be short enough. If a step fails its check, the chain stops there, and doesn't pass a bad result on to steps that would build on it.

Write:

1. **`Step`**: `{ name: string; system: string; check?: (output: string) => boolean }`.
2. **`ChainResult`**: `{ output: string; outputs: string[]; failedAt?: string }`.
3. **`chain(model: ChatModel, steps: Step[], input: string): Promise<ChainResult>`**: the first step gets `input`; each next step gets the previous step's output. For each step:
   - `ask(model, step.system, <its input>)`, and push the output to `outputs`.
   - If the step has a `check` and it returns `false`, return at once: `{ output: <this output>, outputs, failedAt: step.name }`.

   After the last step, return `{ output: <its output>, outputs }`, with no `failedAt`.

Import `ask` from `./ask.ts` and the type `ChatModel` from `./model/types.ts`.

### Test that:

In `tests/chain.test.ts`, with the steps `a` (system `"A"`), `b` (system `"B"`, with a check that the output is at most 5 characters long) and `c` (system `"C"`), and `ScriptedModel`:

- **Each step gets the previous step's output:** with the script `"one"`, `"two"`, `" three "`, the result equals `{ output: "three", outputs: ["one", "two", "three"] }` (`ask` trims). The requests' systems are `["A", "B", "C"]`, and their messages' texts are `["start", "one", "two"]`.
- **A failed check stops the chain:** with the script `"one"`, `"far too long"`, `"never"`, the result equals `{ output: "far too long", outputs: ["one", "far too long"], failedAt: "b" }`, after 2 requests.

### Run it

With a local model, through Ollama (install it as in AGENT01, then `ollama pull qwen3:1.7b`, a 1.4 GB model):

```
MODEL=qwen3:1.7b node src/main.ts chain
```

Or with Claude, which costs real money, though less than a cent per run with Haiku: `PROVIDER=anthropic MODEL=claude-haiku-5-5 node src/main.ts chain`. The other parts' commands work the same way.

It prints each step's output. Did the extracted sentence capture the request? Did shortening lose a fact?

---

## Part 2 — Routing

**File:** `src/route.ts`

A billing question, a lost pickup code and a broken vase need different handling. One prompt that covers all three gets long, and improving it for one kind of email can make it worse for another. Routing splits it: a first call only sorts the email, and code sends it to a prompt written for that kind. Each specialist prompt stays short and can be changed and tested on its own.

Routing also saves money: a route can use a smaller, cheaper model for easy cases, and keep the expensive one for hard ones.

The sorting call's answer is text, and models add words: `"Billing."`, `"The category is pickup"`. So don't compare it exactly. Look for the route names in it. If exactly one name appears, that's the route. If none does, or more than one, the input goes to a **fallback**: here, a reply that a person will answer. A wrong route is worse than a careful "a person will reply".

Write:

1. **`Route`**: `{ name: string; description: string; system: string; model?: ChatModel }`. Names are lowercase.
2. **`classifierPrompt(routes: Route[]): string`**: these lines, joined with `"\n"`: `Sort the customer's email into one of these categories:`, then `- <name>: <description>` for each route, then an empty line, then `Answer with only the category name. If none fits, answer "other".`
3. **`route(model: ChatModel, routes: Route[], fallback: Route, input: string): Promise<{ route: string; output: string }>`**:
   - Ask the classifier: `ask(model, classifierPrompt(routes), input)`, in lowercase.
   - The routes whose `name` the answer `includes`: if exactly one, that's the chosen route; otherwise the `fallback`.
   - `ask(<the route's model if it has one, otherwise model>, <the route's system>, input)`. The `??` operator picks the right side when the left is `undefined`.
   - Return the chosen route's `name` and that call's output.

### Test that:

In `tests/route.test.ts`, with the routes `billing` (description `"money"`, system `"BILLING"`) and `pickup` (`"lockers"`, `"PICKUP"`), and the fallback `human` (`"anything else"`, `"HUMAN"`):

- **The classifier prompt lists every route:** it's exactly `'Sort the customer\'s email into one of these categories:\n- billing: money\n- pickup: lockers\n\nAnswer with only the category name. If none fits, answer "other".'`
- **Sends the input to the chosen route:** with the script `"Billing."`, `"Your refund..."` and the input `"charged twice"`, the result equals `{ route: "billing", output: "Your refund..." }`. The first request's system is the classifier prompt; the second's is `"BILLING"`, and its message's text is `"charged twice"`.
- **An unclear answer goes to the fallback:** for the classifier answers `"other"` and `"billing or pickup"`, the route is `"human"` and the second request's system is `"HUMAN"`.
- **A route can have its own model:** when `pickup` has its own `ScriptedModel`, and the main model answers `"pickup"`, the output comes from the route's model. Each model got 1 request.

### Run it

`node src/main.ts route` (with `MODEL` or `PROVIDER` as in Part 1) sorts four emails, one of them a job application that fits no route. Did each go where you expected?

---

## Part 3 — Parallelization

**File:** `src/parallel.ts`

Calls that don't depend on each other don't have to wait for each other. Three calls of 2 seconds take 6 seconds one after the other, and 2 seconds at the same time. There are two ways to use this:

- **Sectioning:** split one job into independent parts. Here, three reviews of the same reply: its tone, its facts, its promises. Each review gets a focused prompt, and all three run at once.
- **Voting:** ask the same question several times, and take the most common answer. One answer to "Is this phishing?" can be wrong by chance; the majority of five is much less likely to be.

**Running calls at the same time.** An `async` function starts running when you call it, and returns a promise right away. So calling it in a `map` starts every call, and `Promise.all` waits for all of them, and gives the results in the same order as the promises, whatever order they finished in. An unrelated example:

```ts
const sizes = await Promise.all(urls.map(async url => (await fetch(url)).headers.get("content-length")));
// all the requests run at once; sizes[i] belongs to urls[i]
```

If any promise rejects, `Promise.all` rejects with that error. Here that's what you want: a review that failed is not a review.

**A limit on how many at once.** Providers limit requests per minute, and a thousand calls started at once will hit the limit. `mapLimit` runs at most `limit` at a time. The pattern is a few **workers** that share one counter: each worker takes the next index, runs that item, and repeats until none are left. JavaScript runs one piece of code at a time, and `const i = next++` has no `await` in it, so two workers never take the same index.

Write:

1. **`Section`**: `{ name: string; system: string }`.
2. **`sections(model: ChatModel, parts: Section[], input: string): Promise<Record<string, string>>`**: `ask` every part's system with the same `input`, all at once, with `Promise.all`. Return an object from each part's `name` to its output.
3. **`vote(model: ChatModel, system: string, input: string, n: number): Promise<{ answer: string; votes: Record<string, number> }>`**:
   - Ask the same question `n` times, all at once. `Array.from({ length: n }, () => ask(...))` makes `n` calls.
   - Normalize each answer, so `"Yes."` and `"YES"` count as the same vote: `.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim()`.
   - `votes` counts each normalized answer. `answer` is the one with the most votes; on a tie, the one that reached the top count first. (Go over the answers in order, add each vote, and change the leader only when an answer's count becomes **greater** than the leader's.)
4. **`mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]>`**:
   - An array `results` with one place per item, and a counter `next = 0`.
   - An `async` function `worker()`: while `next < items.length`, take `const i = next++`, and set `results[i] = await fn(items[i])`.
   - Start `Math.min(limit, items.length)` workers, wait for all of them with `Promise.all`, and return `results`. The results are in the order of the items, whatever order they finished in.

### Test that:

In `tests/parallel.test.ts`, with `RespondingModel` and `lastText`:

- **Sections run at the same time, and come back by name:** with a model that answers `` `${request.system} of ${lastText(request)}` `` and the parts `tone` (`"T"`), `facts` (`"F"`) and `promises` (`"P"`), the input `"reply"` gives `{ tone: "T of reply", facts: "F of reply", promises: "P of reply" }`, and `maxInFlight` is `3`.
- **Vote takes the most common answer:** with a model that answers `"Yes."`, `"no"`, `"YES"`, `"yes"`, `"No"` in turn (a counter in the `respond` function), `vote(model, "Phishing?", "email", 5)` gives `{ answer: "yes", votes: { yes: 3, no: 2 } }`, after 5 requests, with `maxInFlight` `5`.
- **A tie goes to the answer that got there first:** with the answers `"no"`, `"yes"`, `"yes"`, `"no"` and `n` 4, the answer is `"yes"`.
- **`mapLimit` keeps the order and the limit:** with an `async` function that counts how many calls are running at once, waits `30 − n × 5` ms (so later items finish first), and returns `n × 2`: `mapLimit([1, 2, 3, 4, 5], 2, ...)` gives `[2, 4, 6, 8, 10]`, and at most 2 ran at once. With 2 items and limit 10, it gives `[2, 4]` and at most 2 ran at once. An empty array gives `[]`.

### Run it

- `node src/main.ts review` reviews a reply that promises a refund and a deadline it can't keep. Did the "promises" review catch it?
- `node src/main.ts vote` asks five times whether two emails are phishing, and shows the votes. Was it unanimous? With a small model, try it a few times.

---

## Part 4 — Orchestrator-workers

**File:** `src/orchestrate.ts`

An email asks three unrelated questions. Sectioning needs the parts known in advance, and these depend on the email. So a first call, the **orchestrator**, reads the email and plans the subtasks, as JSON. Code then runs a **worker** call for each subtask, at the same time, and a last call **synthesizes** one reply from the workers' answers.

It looks like an agent, but it isn't one. The model decides *what* the subtasks are; code decides *how* they run: how many at most, how many at once, and that there's one synthesis at the end. The cost and time stay bounded, whatever the plan says.

The plan is checked with a Zod schema. `z.infer` turns a schema into its TypeScript type, so the two can't drift apart:

```ts
const Plan = z.object({ tasks: z.array(z.object({ id: z.string(), instruction: z.string() })) });
type Task = z.infer<typeof Plan>["tasks"][number];   // { id: string; instruction: string }
```

Write:

1. The schema `Plan` and the exported type **`Task`**, as above.
2. **`OrchestratorPrompts`**: `{ plan: string; worker: string; synthesize: string }`.
3. **`orchestrate(model: ChatModel, prompts: OrchestratorPrompts, input: string, options: { maxTasks: number; limit: number }): Promise<{ tasks: Task[]; answers: string[]; output: string }>`**:
   1. **Plan:** `askJson(model, prompts.plan, input, Plan)`. Keep at most the first `maxTasks` tasks: a model can plan far more work than you want to pay for.
   2. **Workers:** `mapLimit` over the tasks, with `options.limit`: each one is `ask(model, prompts.worker, task.instruction)`. The worker sees only its instruction, not the whole email, so it answers only its question.
   3. **Synthesize:** `ask(model, prompts.synthesize, text)`, where `text` is these lines joined with `"\n"`: `<email>`, the input, `</email>`, an empty line, and then, for each task, `` `<answer question="${task.instruction}">\n${<its answer>}\n</answer>` ``.
   4. Return the tasks, the answers (in the order of the tasks), and the synthesized output.

   If the plan isn't valid, `askJson` throws, and `orchestrate` throws too: with no plan there's nothing to do.

Import `z` from `"zod"`, `ask` and `askJson` from `./ask.ts`, `mapLimit` from `./parallel.ts`, and the type `ChatModel`.

### Test that:

In `tests/orchestrate.test.ts`, with the prompts `{ plan: "PLAN", worker: "WORKER", synthesize: "SYNTH" }` and a `RespondingModel` that answers by the request's system: for `"PLAN"`, `"Here's the plan:\n"` and then a JSON plan with four tasks, `q1` to `q4` (`q2`'s instruction is `"Do you ship to Germany?"`); for `"WORKER"`, `` `answer to: ${lastText(request)}` ``; otherwise `"the reply"`.

- **Plans, runs the workers within the limit, and combines their answers:** with `{ maxTasks: 3, limit: 2 }`, the task ids are `["q1", "q2", "q3"]`, each answer is `"answer to: "` plus its task's instruction, and the output is `"the reply"`. The requests' systems are `["PLAN", "WORKER", "WORKER", "WORKER", "SYNTH"]`, and `maxInFlight` is `2`. The last request's text starts with `"<email>\nthe email\n</email>\n\n"` and contains `'<answer question="Do you ship to Germany?">\nanswer to: Do you ship to Germany?\n</answer>'`.
- **A plan that isn't valid JSON fails:** with a model that always answers `"I can't make a plan."`, `orchestrate` rejects.

### Run it

`node src/main.ts orchestrate` answers an email with three questions, one of which the facts can't answer. How did the model split it? Did the reply say "a colleague will reply" for the one with no answer, or did it invent one?

---

## Part 5 — Evaluator-optimizer

**File:** `src/refine.ts`

A writer call drafts a reply; a reviewer call checks it against clear criteria and says what to fix; the writer rewrites with that feedback. Repeat until the review passes, or the rounds run out. It's how a person edits, and it works when two things hold: the criteria are clear enough to check, and feedback actually makes the next draft better.

Two rules keep it under control. The number of rounds has a limit, since each round costs two calls. And the loop reports whether it passed: a reply that never passed review is not ready to send, and the code that called `refine` must decide what to do with it, such as hand it to a person.

Write:

1. **`RefineResult`**: `{ output: string; drafts: string[]; feedback: string[]; passed: boolean }`. `feedback[i]` is the reviewer's feedback on `drafts[i]`, or `""` for the draft that passed.
2. **`refine(model: ChatModel, prompts: { write: string; review: string }, input: string, maxRounds: number): Promise<RefineResult>`**:
   1. The first draft: `ask(model, prompts.write, input)`.
   2. Review each draft: `askJson(model, prompts.review, text, Review)`, with the schema `z.object({ pass: z.boolean(), feedback: z.string() })`, and `text` equal to `` `<email>\n${input}\n</email>\n\n<reply>\n${draft}\n</reply>` ``. Push the draft to `drafts`, and its feedback (or `""` if it passed) to `feedback`.
   3. If the review passed, return with `passed: true` and the draft as `output`. If this was draft number `maxRounds`, return with `passed: false` and the last draft as `output`.
   4. Otherwise, the next draft is `ask(model, prompts.write, text)`, with `text` equal to `` `${input}\n\nYour previous reply:\n<reply>\n${draft}\n</reply>\n\nA reviewer's feedback on it:\n<feedback>\n${review.feedback}\n</feedback>\n\nWrite an improved reply.` ``, where `review` is the last review, and go back to step 2.

### Test that:

In `tests/refine.test.ts`, with the prompts `{ write: "WRITE", review: "REVIEW" }`, the input `"the email"`, and `ScriptedModel`:

- **Rewrites with the feedback until the review passes:** with the script `"draft 1"`, `'{"pass": false, "feedback": "Too rude."}'`, `"draft 2"`, `'{"pass": true, "feedback": ""}'` and `maxRounds` 3, the result equals `{ output: "draft 2", drafts: ["draft 1", "draft 2"], feedback: ["Too rude.", ""], passed: true }`. The requests' systems are `["WRITE", "REVIEW", "WRITE", "REVIEW"]`. The second request's text is exactly `"<email>\nthe email\n</email>\n\n<reply>\ndraft 1\n</reply>"`. The third request's text starts with `"the email"` and contains `"<reply>\ndraft 1\n</reply>"` and `"<feedback>\nToo rude.\n</feedback>"`.
- **Stops after `maxRounds` drafts:** with `maxRounds` 2 and two drafts that both fail review (feedback `"fix 1"` and `"fix 2"`), the result equals `{ output: "d2", drafts: ["d1", "d2"], feedback: ["fix 1", "fix 2"], passed: false }`, after 4 requests.

### Run it

`node src/main.ts refine` answers a customer who wants money back. The writer's rules say never to promise a refund. Did the first draft promise one anyway? Did the reviewer catch it, and did the feedback fix it?

---

## Workflow or agent?

You've now built the same inbox five ways. Before you reach for an agent in a real product, ask:

- **Are the steps known in advance?** Then a chain or a router does the job, and every run takes the same path: easier to test, to debug and to price.
- **Are the parts independent?** Run them in parallel; the user waits for the slowest call, not the sum.
- **Do the subtasks depend on the input, but the shape doesn't?** Orchestrator-workers keeps the model's choices inside limits you set.
- **Is there a clear way to judge the result?** An evaluator-optimizer loop can improve it, at a known maximum cost.
- **Only when the path really can't be planned**, such as debugging, research, or a task that needs a different number of tool calls each time, is the AGENT01 loop worth its unpredictability.

Most production systems combine these patterns, and often the best first version is one call with a good prompt and an eval (LLM03) to prove it's not enough.

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
- **The local model,** if you pulled it: `ollama rm qwen3:1.7b`. Ollama itself is used by the next agent assignments; AGENT01's cleanup section has the commands for removing it.
