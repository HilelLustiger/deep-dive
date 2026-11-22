import { expect, test } from "vitest";
import { cosineSimilarity } from "../src/similarity.ts";

test("same direction is 1, whatever the length", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
});

test("right angle is 0, opposite is -1", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
});

test("a zero vector gives 0", () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
});

test("different lengths throw", () => {
    expect(() => cosineSimilarity([1], [1, 2])).toThrow();
});
