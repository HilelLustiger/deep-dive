import { expect, test } from "vitest";
import { FakeEmbedder } from "../src/embed/fake.ts";
import { loadDocuments } from "../src/load.ts";
import { VectorStore } from "../src/store.ts";

test("loads every markdown file in sorted order", async () => {
    const chunks = await loadDocuments("docs");

    expect(new Set(chunks.map(c => c.source))).toEqual(
        new Set(["equipment.md", "expenses.md", "onboarding.md", "remote-work.md", "vacation.md"]),
    );
    expect(new Set(chunks.map(c => c.id)).size).toBe(chunks.length);
    expect(chunks.every(c => c.text.length <= 500)).toBe(true);
    expect(chunks[0].id).toBe("equipment.md#0");
});

test("the right document comes first", async () => {
    const store = new VectorStore(new FakeEmbedder());
    await store.add(await loadDocuments("docs"));

    const [vacation] = await store.search("How many vacation days can I carry over?", 1);
    expect(vacation.chunk.source).toBe("vacation.md");

    const [laptop] = await store.search("laptop lost or stolen", 1);
    expect(laptop.chunk.source).toBe("equipment.md");
});
