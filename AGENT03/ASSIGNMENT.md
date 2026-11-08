# Assignment AGENT03 — Agentic RAG (TypeScript)

**Topics:** retrieval-augmented generation (RAG), chunking, embeddings, cosine similarity, brute-force vector search, top-k retrieval, classic RAG vs. agentic RAG, retrieval as a tool, citing sources, checking citations

**Before this:** AGENT01. This assignment reuses its code. AGENT02 isn't needed.

## Introduction

A model knows what was in its training data, and nothing else. It doesn't know your company's handbook, your notes or yesterday's email. Ask it anyway, and it either says it doesn't know or, worse, makes up an answer that sounds right.

**Retrieval-augmented generation (RAG)** fixes this by finding the relevant text first and giving it to the model with the question. The model then answers from that text, not from memory, and can say where each fact came from.

Finding "the relevant text" is the hard part. Searching for the question's exact words misses passages that say the same thing in other words: "How much time off do I get?" should find "24 vacation days a year". So RAG searches by **meaning**, with **embeddings**:

- An **embedding model** turns a text into a vector: a list of a few hundred numbers. Texts with similar meaning get vectors that point in similar directions, even when they share no words.
- **Cosine similarity** measures how close two directions are: 1 for the same direction, 0 for unrelated.
- To search, you embed every passage once, ahead of time. For each question, you embed the question and return the passages whose vectors are closest to it: the **top k**.

Documents are too long to embed whole, so they're cut first into **chunks** of a few paragraphs. Each chunk is embedded and found on its own.

There are two ways to connect this search to a model, and you'll build both:

- **Classic RAG:** your code searches with the user's question, puts the top chunks into the prompt, and calls the model once. Simple and predictable, but it searches exactly once, with the user's words, whether or not that finds the answer.
- **Agentic RAG:** search is a **tool**, and the AGENT01 agent decides when to search, with what words, and whether to search again. It can split a question in two, rephrase a search that found nothing, or skip searching when no search is needed.

The documents are a small, made-up company handbook in `docs/`: five files about vacation, expenses, equipment, remote work and onboarding. A model can't know any of it, so a correct answer has to come from retrieval.

The assignment has seven parts, 0 to 6. Do them in order, and write the tests for each part before moving to the next one.

Names given in **bold code** are required, because the tests and later parts use them. Everything else is up to you.

### What you build

| Part | File | What |
|---|---|---|
| 0 | `package.json`, `src/` from AGENT01 | The project |
| 1 | `src/chunk.ts` | `chunkDocument`: cuts a document into chunks |
| 2 | `src/similarity.ts` | `cosineSimilarity` |
| 3 | `src/store.ts` | `VectorStore`: embeds chunks, and finds the closest ones to a query |
| 4 | `src/load.ts` | `loadDocuments`: reads and chunks every file in a folder |
| 5 | `src/rag.ts` | `formatHits` and `answerWithContext`: classic RAG |
| 6 | `src/rag.ts`, `src/main.ts` | `createSearchTool`, `citations` and `unsupportedCitations`: agentic RAG |

In all, about 150 lines of code, plus tests.

### Learning outcomes

By the end of this assignment you can:

1. Explain what RAG is for, and its steps: chunk, embed, store, retrieve, generate.
2. Explain what an embedding is, and why searching by meaning finds what searching by words misses.
3. Compute cosine similarity, and say what its values mean.
4. Cut documents into chunks, and say why chunk size matters.
5. Build a brute-force vector search, and say when it stops being enough.
6. Build classic RAG and agentic RAG, and compare them.
7. Make answers cite their sources, and check the citations against what was retrieved.

### The given code

These are already in this folder. Don't change them.

| File | What it is |
|---|---|
| `src/embed/types.ts` | The `Embedder` interface: `embed(texts: string[]): Promise<number[][]>`, one vector per text, in the same order. |
| `src/embed/ollama.ts` | `OllamaEmbedder`, an `Embedder` that runs the `all-minilm` embedding model locally through Ollama. |
| `src/embed/fake.ts` | `FakeEmbedder`, an `Embedder` for tests. |
| `docs/*.md` | The handbook: five short markdown files. |

### Testing without a real embedding model

`FakeEmbedder` doesn't understand meaning: it counts words. Each word adds 1 to one position of a 256-number vector, chosen by a hash of the word, and common words like "the" and "why" are skipped. So texts that share words get similar vectors, and `"why do dogs bark"` is closest to `"Dogs bark at strangers"`. That's enough to test that your search ranks correctly. It also records each call's texts in `calls`, so a test can check what was embedded:

```ts
const embedder = new FakeEmbedder();
await embedder.embed(["a", "b"]);
embedder.calls;   // [["a", "b"]]
```

For the model, tests use AGENT01's `ScriptedModel`, as before.

---

## Reading

### Before you start

1. **[Anthropic — Introducing Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval)**, the section "A primer on RAG: scaling to larger knowledge bases".
   The whole pipeline in a few paragraphs: chunking, embedding, storing, retrieving the top-K chunks and adding them to the prompt. The rest of the article is an improvement on it; read it later.
   *Parts 1–5.*
2. **[Sentence Transformers — Semantic Search](https://sbert.net/examples/sentence_transformer/applications/semantic-search/README.html)**, the sections "Background" and "Symmetric vs. Asymmetric Semantic Search".
   Embedding a corpus and a query into the same space and finding the closest vectors, and why a short question and a long passage can still match. The code on the page is Python; the ideas are the same.
   *Parts 2–3.*
3. **[Wikipedia — Cosine similarity](https://en.wikipedia.org/wiki/Cosine_similarity)**, the section "Definition", up to "Cosine distance".
   The formula you implement in Part 2, and what its range of −1 to 1 means.
   *Part 2.*
4. **[Weaviate — What Is Agentic RAG?](https://weaviate.io/blog/what-is-agentic-rag)**, the sections "What is Agentic RAG?" and "Agentic RAG vs. (Vanilla) RAG".
   The difference between Parts 5 and 6: retrieving once, before the model, vs. a model that decides when and what to retrieve.
   *Parts 5–6.*

### Going deeper

- **[Anthropic — Introducing Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval)**, the whole article. Why a chunk cut out of its document loses meaning ("the company's revenue grew by 3%": which company?), and two fixes: adding context to each chunk before embedding it, and combining embeddings with keyword search.
- **[Lewis et al. — Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401)** (2020). The paper that named RAG.
- **[Sentence Transformers — Semantic Search](https://sbert.net/examples/sentence_transformer/applications/semantic-search/README.html)**, the rest of the page: approximate nearest-neighbor search, for when brute force is too slow, and re-ranking.
- LLM04 goes further into embeddings: vector indexes, chunking strategies, and measuring how good a retrieval is.

---

## Part 0 — Project setup

Finish AGENT01 first. Then, in this folder:

- Copy your AGENT01 code: `src/tools.ts`, `src/run-tools.ts`, `src/agent.ts` and `src/model/`. Not `src/main.ts`; Part 6 has a new one. Not the tests either.
- `package.json` and `tsconfig.json` like AGENT01's. No new packages: the embedder talks to Ollama with `fetch`.
- Run `npm install`.

`src/embed/` and `docs/` are already here. Check that `npx tsc --noEmit` passes.

---

## Part 1 — Chunking

**File:** `src/chunk.ts`

Why not embed a whole document? Two reasons. An embedding model reads a limited amount of text: `all-minilm` reads 512 tokens, about 2,000 characters, and ignores the rest. And one vector for a whole document blurs every topic in it together, so a question about one paragraph matches the document weakly. Smaller chunks match precisely, but cut too small and a chunk loses the sentences that explain it. This part keeps paragraphs whole when it can, and packs several short ones into one chunk.

Write:

- **`interface Chunk`**: **`id: string`**, **`source: string`** (the file name) and **`text: string`**.
- **`chunkDocument(source: string, text: string, maxChars = 500): Chunk[]`**:
  1. Split `text` into paragraphs at blank lines: `text.split(/\n\s*\n/)`. Trim each one, and drop the empty ones.
  2. A paragraph longer than `maxChars` can't fit in any chunk, so cut it into pieces of `maxChars` characters, with `slice`. The last piece is whatever is left. Shorter paragraphs stay whole.
  3. Pack the pieces into chunks, in order. Start a chunk with the first piece. For each next piece, if the chunk, plus `"\n\n"`, plus the piece fits in `maxChars` (`current.length + 2 + piece.length <= maxChars`), add it to the chunk with `"\n\n"` between them. If it doesn't fit, the chunk is done: start a new one with this piece.
  4. Each chunk's `id` is the source and its position from 0: `` `${source}#${index}` ``, like `"vacation.md#0"`. The ids are what answers will cite.

A markdown heading like `# Vacation and time off` is a paragraph too, so it's packed with the paragraph after it, and the heading's words help that chunk be found.

### Test that:

In `tests/chunk.test.ts`:

- **Short paragraphs are packed:** `chunkDocument("a.md", "One.\n\nTwo.\n\n\nThree.", 100)` is exactly `[{ id: "a.md#0", source: "a.md", text: "One.\n\nTwo.\n\nThree." }]`. Note the three newlines before `"Three."`: still one paragraph break.
- **A new chunk when the next paragraph doesn't fit:** with `"aaaa\n\nbbbb\n\ncccc"` and `maxChars` `10`, the texts are `["aaaa\n\nbbbb", "cccc"]`, and the ids are `["a.md#0", "a.md#1"]`.
- **A long paragraph is cut:** `"x".repeat(25)` with `maxChars` `10` gives chunks of lengths `[10, 10, 5]`.
- **Empty text gives no chunks:** `"  \n\n  "` gives `[]`.

---

## Part 2 — Cosine similarity

**File:** `src/similarity.ts`

Two vectors are close when they point in the same direction, whatever their lengths. The cosine of the angle between them measures exactly that:

```
cosine(a, b) = (a · b) / (|a| × |b|)

a · b = a[0]*b[0] + a[1]*b[1] + ...          the dot product
|a|   = Math.sqrt(a[0]*a[0] + a[1]*a[1] + ...)   the length
```

It's 1 when they point the same way, 0 when they're unrelated (at a right angle), and −1 when they point in opposite directions. `[1, 2, 3]` and `[2, 4, 6]` point the same way, so their cosine is 1, even though one is twice as long.

Write **`cosineSimilarity(a: number[], b: number[]): number`**:

- If the lengths differ, throw an `Error`: vectors from different models can't be compared.
- Compute the dot product and both lengths in one loop.
- If either length is 0, return 0. A zero vector has no direction, and dividing by 0 would give `NaN`.

### Test that:

In `tests/similarity.test.ts`, with `toBeCloseTo` for results that aren't exact because of floating point:

- `[1, 2, 3]` with itself is close to `1`, and with `[2, 4, 6]` too.
- `[1, 0]` with `[0, 1]` is `0`, and with `[-1, 0]` is close to `-1`.
- `[0, 0]` with `[1, 1]` is `0`.
- `[1]` with `[1, 2]` throws.

---

## Part 3 — The vector store

**File:** `src/store.ts`

The store keeps every chunk with its vector, and finds the closest ones to a query. It compares the query with **every** chunk: **brute force**. For a few thousand chunks that takes milliseconds. For millions you'd need a vector index, which finds *almost* the closest ones much faster; that's LLM04.

Write:

- **`interface SearchHit`**: **`chunk: Chunk`** and **`score: number`**, the cosine similarity.
- **`class VectorStore`**:
  - **`constructor(embedder: Embedder)`**. Keep the embedder in a private field, and declare the field in the class body: `private embedder: Embedder;` then `this.embedder = embedder;` in the constructor. The shorter `constructor(private embedder: Embedder)` isn't allowed, because Node can't run it without compiling (AGENT01 Part 0).
  - A private list of entries, each `{ chunk, vector }`.
  - **`size`**, a getter: the number of entries. `get size(): number { ... }`, read as `store.size`, without parentheses.
  - **`async add(chunks: Chunk[]): Promise<void>`**: embed all the chunks' texts in **one** call, `this.embedder.embed(chunks.map(c => c.text))`, and add each chunk with its vector: the vector at the same index. One call for many texts is much faster than one call per text, because the model processes them as a batch. If `chunks` is empty, return without calling the embedder.
  - **`async search(query: string, k = 3): Promise<SearchHit[]>`**:
    1. If the store is empty, return `[]` without calling the embedder.
    2. Embed the query: `const [queryVector] = await this.embedder.embed([query])`.
    3. Score every entry with `cosineSimilarity(queryVector, entry.vector)`.
    4. Sort by score, highest first: `.sort((a, b) => b.score - a.score)`.
    5. Return the first `k`. If there are fewer than `k` entries, return them all.

### Test that:

In `tests/store.test.ts`, with `new VectorStore(new FakeEmbedder())` and these three chunks:

```ts
const pets: Chunk[] = [
    { id: "pets.md#0", source: "pets.md", text: "Cats purr when they are happy." },
    { id: "pets.md#1", source: "pets.md", text: "Dogs bark at strangers and dogs bark at night." },
    { id: "pets.md#2", source: "pets.md", text: "Fish swim in water." },
];
```

- **Ranking:** after `add(pets)`, `size` is `3`. `search("why do dogs bark", 2)` returns 2 hits, the first is `"pets.md#1"`, and the first score is greater than the second.
- **One embed call for many chunks:** with a `FakeEmbedder` you keep in a variable, after `add(pets)` its `calls` has 1 call with 3 texts. After `search("fish")`, the second call is `["fish"]`.
- **An empty store, and `k` larger than the store:** `search("anything")` on an empty store gives `[]`. After `add(pets)`, `search("cats", 10)` gives 3 hits.

---

## Part 4 — Loading the documents

**File:** `src/load.ts`

Write **`loadDocuments(dir: string, maxChars?: number): Promise<Chunk[]>`**:

1. List the files in `dir`: `readdir` from `"node:fs/promises"`.
2. Keep only names that end with `".md"`, and sort them, so the order doesn't depend on the file system.
3. For each, read it as text, `await readFile(join(dir, name), "utf8")` (`join` from `"node:path"`), and chunk it with `chunkDocument(name, text, maxChars)`. Passing `undefined` as `maxChars` gives `chunkDocument` its default.
4. Return all the chunks, file after file.

### Test that:

In `tests/load.test.ts`. Vitest runs tests from the project folder, so the path is `"docs"`:

- `loadDocuments("docs")` returns chunks from exactly five sources: `equipment.md`, `expenses.md`, `onboarding.md`, `remote-work.md` and `vacation.md`. Compare `new Set(chunks.map(c => c.source))` with a `Set` of those names.
- All ids are different: `new Set(chunks.map(c => c.id)).size` equals `chunks.length`.
- No chunk is longer than 500 characters.
- The first chunk's id is `"equipment.md#0"`, the first file in sorted order.
- **The right document comes first:** add all the chunks to a store with a `FakeEmbedder`. The top hit (`k` `1`) for `"How many vacation days can I carry over?"` has the source `vacation.md`, and for `"laptop lost or stolen"`, `equipment.md`.

---

## Part 5 — Classic RAG

**File:** `src/rag.ts`

Retrieve once, then ask once. Write:

- **`formatHits(hits: SearchHit[]): string`**: each hit as its id in square brackets, a newline, and its text; hits separated by a blank line (`"\n\n"`). For two hits:
  ```
  [vacation.md#1]
  Requests for more than 3 days in a row must be made in TimeBoard ...

  [vacation.md#0]
  # Vacation and time off

  Every full-time employee at Kestrel Labs gets 24 vacation days a year. ...
  ```
  A chunk's own blank lines stay as they are; the blank line *between* hits is what `"\n\n"` adds.
- **`interface RagAnswer`**: **`text: string`**, the model's answer, and **`sources: string[]`**, the ids of the chunks it was given.
- **`answerWithContext(model: ChatModel, store: VectorStore, question: string, k = 3): Promise<RagAnswer>`**:
  1. `const hits = await store.search(question, k)`.
  2. Build the prompt: these lines, joined with `"\n"`:
     ```
     Answer the question using only the context below. Cite the chunk ids you used in square brackets, like [vacation.md#0]. If the context doesn't contain the answer, say that you don't know.

     Context:
     <formatHits(hits)>

     Question: <question>
     ```
     The second and fifth lines are empty.
  3. One model call: `model.complete({ messages: [{ role: "user", text: prompt }], tools: [] })`. No tools and no loop.
  4. Return the reply's text, and the hits' ids as `sources`, in the order they were found.

The instructions in the prompt do three jobs: "using only the context" keeps the model from answering from memory, the ids make the answer checkable, and "say that you don't know" gives the model a way out when retrieval missed, instead of guessing.

### Test that:

In `tests/rag.test.ts`, with a store of the `pets` chunks from Part 3 and a `FakeEmbedder`:

- `answerWithContext` with `new ScriptedModel([answer("They bark at strangers [pets.md#1].")])`, the question `"Why do dogs bark?"` and `k` `2`:
  - The result's `text` is the scripted answer. `sources` has 2 ids, and the first is `"pets.md#1"`.
  - The model got 1 request, with `tools` equal to `[]` and 1 message.
  - The message's `text` contains `"[pets.md#1]\nDogs bark at strangers and dogs bark at night."` and ends with `"Question: Why do dogs bark?"`. The message's type is `Message`, so read the text with a cast: `(request.messages[0] as { text: string }).text`.

---

## Part 6 — Agentic RAG

**Files:** `src/rag.ts`, `src/main.ts`

Now search is a tool, and the agent decides how to use it. In `src/rag.ts`, write:

- **`createSearchTool(store: VectorStore, k = 3): Tool`**, a tool built the same way as AGENT01's tools:
  - `name`: `"search_docs"`.
  - `description`: what it searches and what it returns. For example: "Search the company handbook. Returns the most relevant passages, each with its id in square brackets. Search again with other words if the results don't answer the question." The last sentence tells the model it may search more than once.
  - `inputSchema`: one required property, `query`, of type `"string"`, with a description like "What to look for, in a few words".
  - `run`: an `async` function. Throw an `Error` if `query` isn't a string, or is empty after `trim()`. Otherwise search with `k`, and return `formatHits(hits)`, or `"No results."` when there are no hits.
- **`citations(text: string): string[]`**: the chunk ids cited in a text, in the order they first appear, each once. A citation is an id in square brackets: no spaces, then `#`, then digits. Use `text.match(/\[[^\[\]\s]+#\d+\]/g) ?? []`, remove the brackets with `slice(1, -1)`, and remove repeats with `[...new Set(ids)]`.
- **`unsupportedCitations(result: AgentResult): string[]`**: ids that the final answer cites but no search returned. Collect every id cited in the `content` of every tool result in `result.messages` (use `citations` on it: a search result has the same `[id]` format), then return the ids from `citations(result.text)` that aren't among them.

A model can cite an id it never saw: it noticed the pattern and invented one, or it misremembered a number. Each unsupported citation points to a claim that may not come from the documents. `unsupportedCitations` can't prove an answer is right, but it catches this kind of mistake for free.

### Test that:

In `tests/rag.test.ts`, with the `pets` store:

- **The tool:** `createSearchTool(store, 1)` is named `"search_docs"`. Running it with `{ query: "fish swim" }` gives exactly `"[pets.md#2]\nFish swim in water."`. Running it with `{ query: " " }` rejects. A tool on an empty store returns `"No results."`.
- **`citations`:** `"See [vacation.md#0] and [expenses.md#2], and [vacation.md#0] again. Not [this]."` gives `["vacation.md#0", "expenses.md#2"]`, and `"none"` gives `[]`.
- **An agent run with one invented citation:** run AGENT01's `runAgent` with the tools `[createSearchTool(store, 1)]` and a `ScriptedModel` of `callTools(["s1", "search_docs", { query: "dogs bark" }])` then `answer("Dogs bark at night [pets.md#1], and cats sing [pets.md#7].")`.
  - The second request's `messages[2]` is `{ role: "tool", results: [{ callId: "s1", content: "[pets.md#1]\nDogs bark at strangers and dogs bark at night.", isError: false }] }`.
  - `unsupportedCitations(result)` is `["pets.md#7"]`.

### Running it for real

`src/main.ts` loads the handbook, indexes it, and answers a question either way: classic with `--classic`, agentic without.

```ts
import { formatTranscript, runAgent } from "./agent.ts";
import { OllamaEmbedder } from "./embed/ollama.ts";
import { loadDocuments } from "./load.ts";
import { modelFromEnv } from "./model/index.ts";
import { answerWithContext, createSearchTool, unsupportedCitations } from "./rag.ts";
import { VectorStore } from "./store.ts";

const args = process.argv.slice(2);
const classic = args[0] === "--classic";
const question = (classic ? args.slice(1) : args).join(" ");
if (!question) {
    console.error('Usage: node src/main.ts [--classic] "your question"');
    process.exit(1);
}

const store = new VectorStore(new OllamaEmbedder(process.env.EMBED_MODEL || undefined));
await store.add(await loadDocuments("docs"));
console.log(`(${store.size} chunks indexed)\n`);

const model = modelFromEnv();
if (classic) {
    const result = await answerWithContext(model, store, question);
    console.log(`retrieved: ${result.sources.join(", ")}\n`);
    console.log(result.text);
} else {
    const result = await runAgent(model, [createSearchTool(store)], question, {
        system: "You answer questions about the Kestrel Labs handbook. Search the handbook before you answer, and cite the passage ids you used in square brackets, like [vacation.md#0]. If the handbook doesn't say, answer that you don't know.",
    });
    console.log(formatTranscript(result.messages).join("\n"));
    console.log(`\n(${result.steps} steps, stopped by: ${result.stopReason})`);
    const unsupported = unsupportedCitations(result);
    if (unsupported.length > 0) {
        console.log(`Cited but never retrieved: ${unsupported.join(", ")}`);
    }
}
```

The embedding model is a separate download from the chat model. With Ollama running (`ollama serve`, as in AGENT01):

```
ollama pull all-minilm       # once: about 46 MB
node src/main.ts --classic "How many vacation days do I get?"
node src/main.ts "How many vacation days do I get?"
```

The chat model is chosen as in AGENT01, with `PROVIDER` and `MODEL`. The embeddings always run locally.

Try each question both ways, and compare what was retrieved and what the answer says:

- `"How many vacation days do I get, and how many can I carry over?"`: the answer is in one document.
- `"I'm flying 7 hours to a conference. What class can I book, and who pays for the ticket?"`: two facts in one document, and one search may not find both.
- `"Can I work from Portugal for a month?"`: the handbook allows 20 working days, and a month is more.
- `"What's the parking policy?"`: the handbook doesn't say. Does the answer say so?
- `"How much time off is there?"`: no shared words with "vacation days". This is what embeddings are for; try `FakeEmbedder` in `main.ts` instead and see what it finds.

---

## Running the tests

```
npx tsc --noEmit     # type check
npx vitest run       # all tests; none of them calls a real model or embedder
```

---

## Cleaning up

What this assignment installed, and how to remove it when you're done:

- **The packages:** `rm -rf node_modules` in this folder.
- **The embedding model**, used only here: `ollama rm all-minilm`.
- **Ollama and the chat model:** keep them; the next agent assignments use them too. AGENT01's cleanup section has the commands for when you're done with the track.
