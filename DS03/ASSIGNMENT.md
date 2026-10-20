# Assignment DS03 — Binary Search Tree (TypeScript)

**Topics:** binary search trees, the ordered symbol table, recursion on trees, subtree sizes, floor and ceiling, rank and select, in-order traversal, generators and the iteration protocol, Hibbard deletion, tree height, generic classes, comparator functions

## Introduction

In this assignment you will build a **binary search tree** (BST): a tree of nodes where every node holds a key, every key in its left subtree is smaller, and every key in its right subtree is larger. That one rule is what makes the tree useful. To find a key you start at the root and go left or right at every node, so you never look at most of the tree.

You will use the tree to implement an **ordered symbol table**. An ordered symbol table is not a data structure but an **abstract data type** (ADT): a list of operations and what each one must return, without saying how they are built. It's the same relationship as between an interface and a class that implements it. The ADT is the interface, and the BST is one data structure that implements it. A sorted array is another, with different costs.

A **symbol table** is the ADT for a map from keys to values: put a value under a key, and get it back by its key. A hash map, which is project DS02, implements it. An *ordered* symbol table adds operations that depend on the order of the keys: "what is the smallest key?", "what is the largest key that is at most 45?", "how many keys are smaller than this one?" and "what are all the keys between 100 and 200?". A hash map keeps its keys in no particular order, so it can only answer these by looking at every key. A BST keeps them in order, so it can answer each one by walking down a single path. Database indexes are trees for exactly this reason.

The tree is **generic**: it works for any key type and any value type. It doesn't know how to compare keys of a type it has never seen, so whoever creates the tree passes in a **comparator**, a function that says which of two keys comes first.

Last, you will see the weakness of a plain BST. Its shape depends on the order the keys arrive in: keys in random order give a short, bushy tree, and keys in sorted order give a tree that is just a long chain. Balanced trees, which fix this, are left for later.

The assignment has eight parts. Do them in order, and write the tests for each part before moving to the next one.

Names given in **bold code** are required. Everything else is up to you.

### Learning outcomes

By the end of this assignment you can:

1. State the BST ordering rule, and explain why searching takes time proportional to the tree's height and not to the number of keys.
2. Write recursive functions on trees that return the updated subtree, and keep a per-node count up to date while doing it.
3. Implement the ordered symbol table operations: `get`, `put`, `min`, `max`, `floor`, `ceiling`, `rank`, `select`, range queries and deletion, and say what each costs in terms of the tree's height.
4. Traverse a tree in order, and expose the traversal through TypeScript's iteration protocol with a generator.
5. Write a generic class whose behavior depends on a comparator function passed in by the caller.
6. Show with measurements how insertion order decides a BST's height, and explain why that motivates balanced trees.

### Conventions

These rules hold in every part. They are the conventions of the ordered symbol table in the main source of this assignment, *Algorithms* by Sedgewick and Wayne.

- **Keys are unique.** `put` with a key that is already in the tree replaces its value, and the size doesn't change.
- **Keys are compared only with the comparator.** Never with `<`, `>` or `===`. Two keys are the same key when the comparator returns `0` for them, even if they are different objects.
- **Missing results are `undefined`.** `get`, `min`, `max`, `floor` and `ceiling` return `undefined` when there is no answer, for example on an empty tree. The exception is `select`, described in Part 4.

### Randomness in tests

Several tests insert keys in a shuffled order. A test that uses `Math.random()` gets a different tree on every run, so a failure can't be reproduced. Instead, the tests use a **seeded** random generator: given the same seed, it produces the same sequence of numbers every time.

Copy this file as it is to `tests/random.ts`. It's a test utility, not part of the assignment:

```ts
// A small seeded pseudo-random generator (mulberry32). Returns numbers in [0, 1).
export function seededRandom(seed: number): () => number {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Returns a shuffled copy of items (Fisher-Yates), using the given generator.
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
```

---

## Reading

### Before you start

The goal here is to know the vocabulary and the shape of each problem before you write code, not to know the solution.

1. **[Algorithms, 4th ed. — 3.1 Elementary Symbol Tables](https://algs4.cs.princeton.edu/31elementary/)** (Sedgewick and Wayne, free online), sections "API" and "Ordered symbol tables".
   What a symbol table is, its conventions, and the exact meaning of `min`, `max`, `floor`, `ceiling`, `rank`, `select` and range queries. This is the interface you are implementing.
   *All parts.*
2. **[Algorithms, 4th ed. — 3.2 Binary Search Trees](https://algs4.cs.princeton.edu/32bst/)**, sections "Basic implementation", "Analysis" and "Order-based methods and deletion".
   The main reading. How `get` and `put` work recursively, why each node stores the size of its subtree, how floor, ceiling, rank and select use that, and Hibbard deletion. The Java code there is close to what you will write, so read the explanations and the diagrams, and come back to the code after you've written yours.
   *Parts 2–6.*
3. **[MIT 6.006 (Spring 2020) — Lecture 6: Binary Trees, Part 1](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/mit6_006s20_lec6/)**, lecture notes.
   The same ideas from a different angle: the vocabulary of trees (root, leaf, subtree, depth, height), traversal order, and why every operation costs O(h), the height of the tree.
   *Parts 2, 5 and 7.*
4. **[USFCA — Binary Search Tree visualization](https://www.cs.usfca.edu/~galles/visualization/BST.html)**
   Insert, find and delete keys and watch the tree change step by step. Try inserting 1, 2, 3, 4, 5 in order, then in the order 3, 1, 4, 2, 5, and compare the shapes. Try deleting a node that has two children.
   *Parts 2, 6 and 7.*
5. **[MDN — `Array.prototype.sort`, the `compareFn` parameter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#comparefn)**
   The comparator contract you will follow: a negative number, zero or a positive number. Also why `[10, 9, 1].sort()` gives a surprising result.
   *Part 1.*
6. **TypeScript Handbook — [Function Type Expressions](https://www.typescriptlang.org/docs/handbook/2/functions.html#function-type-expressions)**, and in **[Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)**: [Generic Types](https://www.typescriptlang.org/docs/handbook/2/generics.html#generic-types) and [Generic Classes](https://www.typescriptlang.org/docs/handbook/2/generics.html#generic-classes)
   How to give a function a type, and how a function or a class takes type parameters like `<K, V>`.
   *Parts 1 and 2.*
7. **[MDN — Iteration protocols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols)**, sections "The iterable protocol" and "The iterator protocol", and **[MDN — `function*`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*)**
   What makes an object usable in `for...of`, and how a generator function produces values one at a time with `yield` and `yield*`.
   *Part 5.*

### Going deeper

The sources this assignment is based on:

- ***Algorithms*, 4th ed.** by Robert Sedgewick and Kevin Wayne, section 3.1 "Symbol Tables" and section 3.2 "Binary Search Trees". The booksite chapters above are a summary of the book.
- **[Princeton — Algorithms, Part I](https://www.coursera.org/learn/algorithms-part1)** (Coursera, free). The module "Elementary Symbol Tables" has the lectures "Binary Search Trees", "Ordered Operations in BSTs" and "Deletion in BSTs", by the authors of the book.
- **[MIT 6.006 (Spring 2020)](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/)**, Lecture 6 "Binary Trees, Part 1".

Fixing the shape:

- **[MIT 6.006 — Lecture 7: Binary Trees, Part 2: AVL](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/mit6_006s20_lec7/)**. Rotations, and a tree that keeps itself balanced after every insert and delete.
- **[Algorithms, 4th ed. — 3.3 Balanced Search Trees](https://algs4.cs.princeton.edu/33balanced/)**. 2-3 trees and red-black BSTs, the balanced tree behind many standard libraries.
- **[Open Data Structures — Chapter 7: Random Binary Search Trees](https://opendatastructures.org/ods-java/7_Random_Binary_Search_Tree.html)** by Pat Morin (free). Why random insertion order gives a short tree, and the treap, which gets that shape with randomization whatever the insertion order.

Other presentations:

- **[Open Data Structures — Chapter 6: Binary Trees](https://opendatastructures.org/ods-java/6_Binary_Trees.html)**. Binary trees in general, then an unbalanced binary search tree.
- ***Introduction to Algorithms*** (CLRS), chapter 12 "Binary Search Trees" (not free). The standard textbook treatment, with proofs.
- **[VisuAlgo — Binary Search Tree](https://visualgo.net/en/bst)**. Another visualization, which also shows AVL trees.

---

## Part 0 — Project setup

Set up a TypeScript project in this folder, the same way as in OOP02:

- `package.json` with `typescript` and `vitest` as dev dependencies.
- `tsconfig.json` with `"strict": true`, covering both `src/` and `tests/`.
- Two folders: `src/` for the code and `tests/` for the tests.
- `tests/random.ts`, copied from **Randomness in tests** above.

Check that `npx tsc --noEmit` and `npx vitest run` both run.

---

## Part 1 — Comparators

**File:** `src/comparators.ts`

A **comparator** is a function that takes two values and says which one comes first:

- a **negative** number if `a` comes before `b`,
- **zero** if they are equal for ordering purposes,
- a **positive** number if `a` comes after `b`.

This is the same contract that `Array.prototype.sort` uses. Without a comparator, `sort` converts everything to strings, which is why `[10, 9, 1].sort()` returns `[1, 10, 9]`.

In TypeScript, the type of a function can be given a name, like any other type. On an unrelated example:

```ts
type Predicate<T> = (value: T) => boolean;

const isEven: Predicate<number> = n => n % 2 === 0;
```

A function can also take a function and return a new one. This one returns a predicate that means the opposite of the one it got:

```ts
function not<T>(predicate: Predicate<T>): Predicate<T> {
    return value => !predicate(value);
}

const isOdd = not(isEven);
```

Write:

- **`type Comparator<T>`**: a function of two `T` values that returns a `number`. Export it.
- **`compareNumbers(a, b)`**: compares two numbers in ascending order.
- **`compareStrings(a, b)`**: compares two strings in ascending order using `<` and `>`, which compare by character code. So `"Zebra"` comes before `"apple"`, because capital letters have smaller codes. Don't use `localeCompare`: its order depends on the language settings of the machine.
- **`reverse(compare)`**: takes a `Comparator<T>` and returns a new `Comparator<T>` for the opposite order.

### Test that:

Write these in `tests/comparators.test.ts`.

- `compareNumbers` and `compareStrings` return a negative number, zero and a positive number in the three cases. Check the sign with `toBeLessThan(0)` and `toBeGreaterThan(0)`, not an exact value.
- `compareStrings("Zebra", "apple")` is negative.
- `[10, 9, 1].sort(compareNumbers)` is `[1, 9, 10]`.
- `[1, 3, 2].sort(reverse(compareNumbers))` is `[3, 2, 1]`.

---

## Part 2 — The tree: `put` and `get`

**File:** `src/bst.ts`

### The node

Each node holds a key, a value, a link to its left child, a link to its right child, and the **number of nodes in its subtree**, itself included. A leaf's size is 1. A missing child is `null`.

Write a class `Node<K, V>` for this in `bst.ts`, and **don't export it**. It's a detail of the tree: code outside the tree never sees a node.

The subtree size is the one field that isn't obvious. It costs a little extra work in every `put` and `delete`, and in return `size()` takes constant time and Part 4 becomes possible.

### The class

Write **`class BST<K, V>`**:

- **`constructor(compare: Comparator<K>)`**: stores the comparator. The tree is empty.
- The root is a **`private`** field, `null` when the tree is empty.
- **`size()`**: the number of keys. Read it from the root, don't count.
- **`isEmpty()`**.
- **`get(key)`**: the value for `key`, or `undefined`.
- **`has(key)`**: whether `key` is in the tree.
- **`put(key, value)`**: adds the key, or replaces its value if it's already there.

For `get`: start at the root, compare the key with the node's key, and go left if it's smaller, right if it's larger, until you find it or reach `null`.

### The recursive pattern for changing a tree

`put` has to change a link somewhere deep in the tree, then fix the size of every node on the way back up. The standard way to write it is a private recursive helper that takes a subtree, changes it, and **returns the root of the changed subtree**. The caller then stores what it gets back. The same pattern on an unrelated structure, appending to the end of a linked list:

```ts
type ListNode = { value: number; next: ListNode | null };

function append(node: ListNode | null, value: number): ListNode {
    if (node === null) {
        return { value, next: null };   // empty list: the new node is the list
    }
    node.next = append(node.next, value); // store whatever the call returns
    return node;                        // this node is still the head here
}

head = append(head, 5);
```

There is no special case for an empty list, and no need to remember the parent of the place where the new node goes: every level just reassigns its own link. In the tree, the helper also recomputes the node's size after the recursive call, from the sizes of its two children.

### Test that:

Write the tests for Parts 2–7 in `tests/bst.test.ts`.

- A new tree has size 0, is empty, and `get` returns `undefined`.
- After three `put`s with string keys, `get` returns each value, `size()` is 3, and `has` is `true` for a key that's there and `false` for one that isn't.
- `put` with an existing key replaces the value and doesn't change the size.
- **The comparator decides what "the same key" is.** With object keys, for example `{ name: string; day: number }`, and a comparator that compares only `day`, `get` with a *different* object that has the same `day` finds the value.

---

## Part 3 — Smallest, largest, floor and ceiling

**File:** `src/bst.ts`

Add:

- **`min()`** and **`max()`**: the smallest and the largest key.
- **`floor(key)`**: the largest key in the tree that is **less than or equal to** `key`.
- **`ceiling(key)`**: the smallest key in the tree that is **greater than or equal to** `key`.

All four return `undefined` when there is no such key. `floor` and `ceiling` take any key, not only keys that are in the tree.

The minimum is the leftmost node: keep going left until there is no left child. For floor, compare `key` with the node's key at each step:

- Equal: the node's key is the floor.
- Smaller: the floor, if there is one, is in the left subtree.
- Larger: the floor is in the right subtree if anything there is at most `key`. If not, it's this node's key.

`ceiling` is the mirror image. Section 3.2 of the reading has a diagram of this.

### Test that:

Build a tree with the keys 50, 30, 70, 20, 40, 60 and 80, inserted in that order.

- `min()` is 20 and `max()` is 80.
- `floor(45)` is 40, `floor(40)` is 40, and `floor(10)` is `undefined`.
- `ceiling(45)` is 50 and `ceiling(90)` is `undefined`.
- On an empty tree, `min()` and `floor(1)` are `undefined`.
- With `reverse(compareNumbers)`, the order flips: after putting 1, 2 and 3, `min()` is 3.

---

## Part 4 — Rank and select

**File:** `src/bst.ts`

Add:

- **`rank(key)`**: the number of keys in the tree that are **smaller than** `key`. The key doesn't have to be in the tree.
- **`select(k)`**: the key whose rank is `k`, so `select(0)` is the smallest key. If `k` isn't an integer between `0` and `size() - 1`, it throws a **`RangeError`**.

Both use the subtree sizes from Part 2, and neither may visit the whole tree. At a node, the size of the left subtree tells you how many keys in this subtree are smaller than the node's key. For `select(k)`, compare `k` with that number `t`: if `k` is smaller, the answer is in the left subtree. If it's equal, it's this node. If it's larger, the answer is in the right subtree, at rank `k - t - 1` within it. `rank` uses the same idea in reverse.

`select` throws instead of returning `undefined`, unlike the other methods. A rank outside the range is a mistake by the caller, like an array index out of bounds, not a normal "not found" answer.

### Test that:

Use the tree from Part 3.

- `rank(20)` is 0, `rank(50)` is 3, `rank(45)` is 3 (45 isn't in the tree), and `rank(100)` is 7.
- `select(0)` is 20.
- For every `i` from 0 to `size() - 1`, `rank(select(i))` is `i`.
- `select(7)` and `select(-1)` throw `RangeError`.

---

## Part 5 — Visiting the keys in order

**File:** `src/bst.ts`

An **in-order traversal** visits the left subtree, then the node, then the right subtree. Because of the BST rule, this visits the keys in sorted order.

Add:

- **`keys()`**: all keys, in order, as an array.
- **`keysBetween(lo, hi)`**: the keys `k` with `lo ≤ k ≤ hi`, in order. If `lo` is greater than `hi`, the result is empty. Don't visit subtrees that can't contain keys in the range: if `lo` is greater than the node's key, nothing in its left subtree can be in range.
- **`[Symbol.iterator]()`**: makes the tree usable in `for...of`, yielding `[key, value]` pairs in key order.

### Generators

A **generator function**, written `function*`, returns its values one at a time with `yield`. The caller gets each value when it asks for the next one, so nothing is collected into an array first. `yield*` hands over to another generator and yields everything it produces, which is what makes a recursive generator possible. On an unrelated example, flattening nested arrays:

```ts
type Nested = (number | Nested)[];

function* flatten(items: Nested): Generator<number> {
    for (const item of items) {
        if (Array.isArray(item)) {
            yield* flatten(item);   // everything the inner call yields
        } else {
            yield item;
        }
    }
}

[...flatten([1, [2, [3]], 4])];   // [1, 2, 3, 4]
```

A class becomes iterable when it has a method named `[Symbol.iterator]` that returns an iterator. A generator method is the simplest way to write one:

```ts
class Countdown {
    constructor(private from: number) {}

    *[Symbol.iterator](): Generator<number> {
        for (let i = this.from; i > 0; i--) {
            yield i;
        }
    }
}

for (const n of new Countdown(3)) { /* 3, 2, 1 */ }
```

### Test that:

Use the tree from Part 3, where each key's value is `` `v${key}` ``.

- `keys()` is `[20, 30, 40, 50, 60, 70, 80]`, and it's `[]` for an empty tree.
- `keysBetween(35, 65)` is `[40, 50, 60]`, `keysBetween(30, 30)` is `[30]`, and `keysBetween(65, 35)` is `[]`.
- The first two entries of `[...tree]` are `[20, "v20"]` and `[30, "v30"]`.
- A `for...of` loop over the tree sees the keys in the same order as `keys()`.

---

## Part 6 — Deletion

**File:** `src/bst.ts`

Add:

- **`deleteMin()`**: removes the smallest key. On an empty tree, it does nothing.
- **`delete(key)`**: removes `key` and returns `true`, or returns `false` if the key isn't in the tree.

Both use the recursive pattern from Part 2, and both must keep every subtree size correct.

**`deleteMin`:** go left until a node has no left child. That node is the minimum. Replace it with its right subtree, which may be `null`.

**`delete`** finds the node, then has three cases:

1. **No children:** replace it with `null`.
2. **One child:** replace it with that child.
3. **Two children:** this is **Hibbard deletion**. Replace the node with its **successor**, the smallest key in its right subtree. The successor takes the deleted node's place: its left subtree is the deleted node's left subtree, and its right subtree is the deleted node's right subtree with the successor removed from it (which is `deleteMin` on that subtree).

Cases 1 and 2 can be handled by the same code: if the left child is `null`, return the right child, and the other way round.

### Test that:

Use the tree from Part 3.

- After `deleteMin()`, `min()` is 30 and the size is 6.
- Deleting 80 (a leaf), 30 (one child, after the `deleteMin`) and 50 (the root, two children) each returns `true`, and `keys()` is then `[40, 60, 70]`.
- `delete(999)` returns `false`, and the size stays 3.
- `deleteMin()` on an empty tree leaves its size at 0.

---

## Part 7 — The shape of the tree

**File:** `src/bst.ts`

Every operation in this assignment walks one path from the root down, so its cost depends on the **height** of the tree: the number of links on the longest path from the root to a leaf. Insertion order decides that height.

Add **`height()`**: the height of the tree. A tree with one node has height 0, and an empty tree has height -1.

### Test that:

- An empty tree has height -1, and a tree with one key has height 0.
- **Sorted insertion is the worst case.** Insert the keys 0 to 999 in increasing order: the height is 999. Every node has only a right child, so the tree is a linked list.
- **Random insertion is short.** Insert the same 1,000 keys in the order `shuffle(keys, seededRandom(2026))`: the size is 1,000 and the height is at most **40**. For comparison, a perfectly balanced tree with 1,000 keys has height 9.
- **The tree agrees with a `Map`.** Using `seededRandom(7)`, do 5,000 random operations on keys between 0 and 299: with probability 0.6, `put` a key on both a `BST<number, number>` and a `Map<number, number>`, and otherwise `delete` it from both, checking that `delete` on the tree returns the same as `delete` on the map. At the end:
  - the sizes are equal,
  - `keys()` equals the map's keys sorted with `compareNumbers`,
  - `get` returns the map's value for every key in the map,
  - for every key at position `i` in that sorted list, `rank(key)` is `i` and `select(i)` is the key.

The last test checks every operation at once against a structure you already trust, over thousands of steps. It catches bugs that hand-picked cases miss, most often a subtree size that isn't updated in one of the deletion cases.

---

## Compile-error checks

**File:** `tests/compile-errors.ts`

As in OOP02, prove that the compiler rejects wrong code: put each line on its own, with `// @ts-expect-error` directly above it.

For a `const tree = new BST<number, string>(compareNumbers)`:

- `tree.put("x", "y")`: a key of the wrong type.
- `const n: number = tree.get(1)`: `get` returns `string | undefined`, not `number`.
- `new BST<number, string>(compareStrings)`: a comparator for the wrong key type.
- `tree.root`: the root is private.

---

## Running the tests

```
npx tsc --noEmit     # type check, including the compile-error checks
npx vitest run       # tests
```
