// Tests for Parts 2-7: BST.
import { test, expect } from "vitest";
import { Comparator } from "../src/comparators"
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