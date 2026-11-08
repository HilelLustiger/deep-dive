// A fake Embedder for tests. Given code: don't change it.
// It knows nothing about meaning: it counts words. Each word adds 1 to one position of
// the vector, chosen by a hash of the word. Texts that share words get similar vectors,
// so in tests "dogs bark loudly" is closer to "why do dogs bark" than to "cats purr".
// It's fast, needs no model, and always gives the same vector for the same text.
import type { Embedder } from "./types.ts";

const DIMENSIONS = 256;
const IGNORED = new Set(["a", "an", "and", "are", "do", "does", "for", "how", "i", "in", "is", "it", "of", "on", "or", "the", "to", "what", "when", "why", "with"]);

export class FakeEmbedder implements Embedder {
    readonly calls: string[][] = [];

    async embed(texts: string[]): Promise<number[][]> {
        this.calls.push([...texts]);
        return texts.map(embedOne);
    }
}

function embedOne(text: string): number[] {
    const vector = new Array<number>(DIMENSIONS).fill(0);
    const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    for (const word of words) {
        if (!IGNORED.has(word)) {
            vector[hash(word) % DIMENSIONS] += 1;
        }
    }
    return vector;
}

function hash(word: string): number {
    let h = 0;
    for (const char of word) {
        h = (h * 31 + char.charCodeAt(0)) >>> 0;
    }
    return h;
}
