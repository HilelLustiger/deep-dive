// Tests for Parts 2-7: BST.
import { test, expect } from "vitest";
import { Comparator, reverse } from "../src/comparators"
import { compareStrings, compareNumbers } from "../src/comparators";
import { BST } from "../src/bst"

test("a new tree has size 0, is empty, and get returns undefined", () => {

    const tree: BST<number, number> = new BST(compareNumbers);

    expect(tree.size()).toBe(0);
    expect(tree.isEmpty()).toBe(true);
    expect(tree.get(1)).toBeUndefined();
});

test("put adds keys, and get and has find them", () => {
    const tree: BST<string, number> = new BST(compareStrings);
    const keys: string[] = ['b', 'a', 'c'];
    const vals: number[] = [1, 2, 3];

    for (let i=0; i<3; i++){
        tree.put(keys[i], vals[i]);
    }

    expect(tree.size()).toBe(3);
    expect(tree.has('a')).toBe(true);
    expect(tree.has('4')).toBe(false);

    for (let i=0; i<3; i++){
        expect(tree.get(keys[i])).toBe(vals[i]);
    }
});

test("put with an existing key replaces the value and keeps the size", () => {
    const tree: BST<number, number> = new BST(compareNumbers);
    tree.put(1,3);
    expect(tree.size()).toBe(1);
    expect(tree.get(1)).toBe(3);

    tree.put(1,5);
    expect(tree.size()).toBe(1);
    expect(tree.get(1)).toBe(5);
})

test("the comparator decides which keys are the same key", () => {
    type Event = { name: string; day: number };
    const compareDays: Comparator<Event> = (a, b) => a.day - b.day;
    const tree = new BST<Event, string>(compareDays);

    tree.put({ name: "standup", day: 3 }, "room A");

    expect(tree.get({ name: "retro", day: 3 })).toBe("room A");
    expect(tree.has({ name: "retro", day: 3 })).toBe(true);
    expect(tree.get({ name: "standup", day: 4 })).toBeUndefined();
});

// The tree from Part 3, used again in Part 4.
function buildSevenKeyTree(): BST<number, number> {
    const tree: BST<number, number> = new BST(compareNumbers);
    const keys = [50, 30, 70, 20, 40, 60, 80];

    keys.forEach(key => tree.put(key, key));
    return tree;
}

test("min, max, floor and ceiling find the right keys", () => {
    const tree = buildSevenKeyTree();

    expect(tree.min()).toBe(20);
    expect(tree.max()).toBe(80);
    expect(tree.floor(40)).toBe(40);
    expect(tree.floor(45)).toBe(40);
    expect(tree.floor(10)).toBeUndefined();
    expect(tree.ceiling(45)).toBe(50);
    expect(tree.ceiling(90)).toBeUndefined();
});

test("min and floor return undefined on an empty tree", () => {
    const tree: BST<number, number> = new BST(compareNumbers);

    expect(tree.min()).toBeUndefined();
    expect(tree.floor(1)).toBeUndefined();
});

test("a reversed comparator flips the order", () => {
    const tree: BST<number, number> = new BST(reverse(compareNumbers));
    const nums = [1, 2, 3];

    nums.forEach(num => tree.put(num, num));
    expect(tree.min()).toBe(3);
});

test("rank counts the keys smaller than the given key", () => {
    const tree = buildSevenKeyTree();

    expect(tree.rank(20)).toBe(0);
    expect(tree.rank(50)).toBe(3);
    expect(tree.rank(45)).toBe(3);
    expect(tree.rank(100)).toBe(7);
});

test("select returns the key with the given rank", () => {
    const tree = buildSevenKeyTree();

    expect(tree.select(0)).toBe(20);
    for (let i = 0; i < tree.size(); i++) {
        expect(tree.rank(tree.select(i))).toBe(i);
    }
});

test("select throws RangeError for a rank outside the tree", () => {
    const tree = buildSevenKeyTree();

    expect(() => tree.select(7)).toThrow(RangeError);
    expect(() => tree.select(-1)).toThrow(RangeError);
});