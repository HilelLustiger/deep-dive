import { expect, test } from "vitest";
import type { Chunk } from "../src/chunk.ts";
import { FakeEmbedder } from "../src/embed/fake.ts";
import { runAgent } from "../src/agent.ts";
import { answer, callTools, ScriptedModel } from "../src/model/scripted.ts";
import { answerWithContext, citations, createSearchTool, unsupportedCitations } from "../src/rag.ts";
import { VectorStore } from "../src/store.ts";

const pets: Chunk[] = [
    { id: "pets.md#0", source: "pets.md", text: "Cats purr when they are happy." },
    { id: "pets.md#1", source: "pets.md", text: "Dogs bark at strangers and dogs bark at night." },
    { id: "pets.md#2", source: "pets.md", text: "Fish swim in water." },
];

test("answers from the retrieved context", async () => {
    const store = new VectorStore(new FakeEmbedder());
    await store.add(pets);
    const model = new ScriptedModel([answer("They bark at strangers [pets.md#1].")]);

    const result = await answerWithContext(model, store, "Why do dogs bark?", 2);

    expect(result.text).toBe("They bark at strangers [pets.md#1].");
    expect(result.sources).toHaveLength(2);
    expect(result.sources[0]).toBe("pets.md#1");

    expect(model.requests).toHaveLength(1);
    const request = model.requests[0];
    expect(request.tools).toEqual([]);
    expect(request.messages).toHaveLength(1);

    const message = request.messages[0];
    if (message.role !== "user") throw new Error("expected a user message");
    expect(message.text).toContain("[pets.md#1]\nDogs bark at strangers and dogs bark at night.");
    expect(message.text.endsWith("Question: Why do dogs bark?")).toBe(true);
});

test("the search tool", async () => {
    const store = new VectorStore(new FakeEmbedder());
    await store.add(pets);
    const tool = createSearchTool(store, 1);

    expect(tool.name).toBe("search_docs");
    expect(await tool.run({ query: "fish swim" })).toBe("[pets.md#2]\nFish swim in water.");
    await expect(async () => tool.run({ query: " " })).rejects.toThrow();

    const empty = createSearchTool(new VectorStore(new FakeEmbedder()));
    expect(await empty.run({ query: "anything" })).toBe("No results.");
});

test("citations", () => {
    expect(citations("See [vacation.md#0] and [expenses.md#2], and [vacation.md#0] again. Not [this].")).toEqual([
        "vacation.md#0",
        "expenses.md#2",
    ]);
    expect(citations("none")).toEqual([]);
});

test("an agent run with one invented citation", async () => {
    const store = new VectorStore(new FakeEmbedder());
    await store.add(pets);
    const model = new ScriptedModel([
        callTools(["s1", "search_docs", { query: "dogs bark" }]),
        answer("Dogs bark at night [pets.md#1], and cats sing [pets.md#7]."),
    ]);

    const result = await runAgent(model, [createSearchTool(store, 1)], "Why do dogs bark?");

    expect(model.requests[1].messages[2]).toEqual({
        role: "tool",
        results: [{ callId: "s1", content: "[pets.md#1]\nDogs bark at strangers and dogs bark at night.", isError: false }],
    });
    expect(unsupportedCitations(result)).toEqual(["pets.md#7"]);
});
