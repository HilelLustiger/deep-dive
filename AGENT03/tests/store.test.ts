import { expect, test } from "vitest";
import type { Chunk } from "../src/chunk.ts";
import { FakeEmbedder } from "../src/embed/fake.ts";
import { VectorStore } from "../src/store.ts";

const pets: Chunk[] = [
    { id: "pets.md#0", source: "pets.md", text: "Cats purr when they are happy." },
    { id: "pets.md#1", source: "pets.md", text: "Dogs bark at strangers and dogs bark at night." },
    { id: "pets.md#2", source: "pets.md", text: "Fish swim in water." },
];

test("ranking", async () => {
    const store = new VectorStore(new FakeEmbedder());
    await store.add(pets);
    expect(store.size).toBe(3);

    const hits = await store.search("why do dogs bark", 2);

    expect(hits).toHaveLength(2);
    expect(hits[0].chunk.id).toBe("pets.md#1");
    expect(hits[0].score).toBeGreaterThan(hits[1].score);
});

test("one embed call for many chunks", async () => {
    const embedder = new FakeEmbedder();
    const store = new VectorStore(embedder);

    await store.add(pets);
    expect(embedder.calls).toHaveLength(1);
    expect(embedder.calls[0]).toHaveLength(3);

    await store.search("fish");
    expect(embedder.calls[1]).toEqual(["fish"]);
});

test("an empty store, and k larger than the store", async () => {
    const store = new VectorStore(new FakeEmbedder());
    expect(await store.search("anything")).toEqual([]);

    await store.add(pets);
    expect(await store.search("cats", 10)).toHaveLength(3);
});
