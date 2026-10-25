// Tests for Part 1: comparators.
import { test, expect } from "vitest";
import { compareNumbers, compareStrings, reverse } from "../src/comparators";

test("compareNumbers() returns a negative number, zero or a positive number", () => {
    expect(compareNumbers(1, 2)).toBeLessThan(0);
    expect(compareNumbers(2, 1)).toBeGreaterThan(0);
    expect(compareNumbers(1, 1)).toBe(0);
});

test("compareStrings() returns a negative number, zero or a positive number", () => {
    expect(compareStrings('a', 'b')).toBeLessThan(0);
    expect(compareStrings('b', 'a')).toBeGreaterThan(0);
    expect(compareStrings('a', 'a')).toBe(0);
});

test("compareStrings() orders capital letters before lowercase letters", () => {
    expect(compareStrings('Zebra', 'apple')).toBeLessThan(0);
});

test("sort() with compareNumbers orders numbers by value", () => {
    const arr = [10, 9, 1];
    expect(arr.sort(compareNumbers)).toEqual([1, 9, 10]);
});

test("sort() with reverse(compareNumbers) orders numbers from largest to smallest", () => {
    const arr = [1, 3, 2];
    expect(arr.sort(reverse(compareNumbers))).toEqual([3, 2, 1]);
})