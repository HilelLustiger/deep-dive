import { expect, test } from "vitest";
import { chunkDocument } from "../src/chunk.ts";

test("short paragraphs are packed", () => {
    expect(chunkDocument("a.md", "One.\n\nTwo.\n\n\nThree.", 100)).toEqual([
        { id: "a.md#0", source: "a.md", text: "One.\n\nTwo.\n\nThree." },
    ]);
});

test("a new chunk when the next paragraph doesn't fit", () => {
    const chunks = chunkDocument("a.md", "aaaa\n\nbbbb\n\ncccc", 10);
    expect(chunks.map(chunk => chunk.text)).toEqual(["aaaa\n\nbbbb", "cccc"]);
    expect(chunks.map(chunk => chunk.id)).toEqual(["a.md#0", "a.md#1"]);
});

test("a long paragraph is cut", () => {
    expect(chunkDocument("a.md", "x".repeat(25), 10).map(chunk => chunk.text.length)).toEqual([10, 10, 5]);
});

test("empty text gives no chunks", () => {
    expect(chunkDocument("a.md", "  \n\n  ")).toEqual([]);
});
