import { expect, test } from "vitest";
import type { Chunk } from "../src/chunk.ts";
import { FakeEmbedder } from "../src/embed/fake.ts";
import { answer, ScriptedModel } from "../src/model/scripted.ts";
import { answerWithContext } from "../src/rag.ts";
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
