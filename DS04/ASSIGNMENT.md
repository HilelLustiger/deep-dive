# Assignment DS04 — Priority Queue (Java)

**Topics:** priority queues, binary heaps, the heap-order property, complete binary trees in an array, sift-up and sift-down, building a heap in linear time, heapsort, top-k, generic classes, bounded type parameters, wildcards (`? super T`, `? extends T`), `Comparator` and `Comparable`, `Iterable` and `Iterator`, fail-fast iterators, Maven, JUnit

## Introduction

A **priority queue** hands items back by priority, not by arrival: you add items in any order, and each `poll` returns the smallest one left. Schedulers pick the next task with one, Dijkstra's shortest-path algorithm picks the next closest node with one, and "the 10 largest of a billion numbers" is answered with one.

A sorted list would do it, but each insertion costs O(n) to keep the order. An unsorted list makes insertion O(1) but finding the minimum O(n). A **binary heap** does both in O(log n), by keeping only a partial order:

- It's a binary tree in which every node is less than or equal to its children: the **heap-order property**. So the smallest item is always at the root. Siblings are in no particular order.
- The tree is **complete**: every level is full except maybe the last, which fills from the left. A complete tree has height about log₂ n, and it fits in an array with no gaps and no pointers: the root at index 0, and the children of index `i` at `2i + 1` and `2i + 2`.

Adding an item puts it at the end of the array and moves it up while it's smaller than its parent: **sift-up**. Removing the minimum moves the last item to the root and moves it down while it's larger than a child: **sift-down**. Each walks one path of the tree, so each is O(log n).

You'll build a generic min-heap, `MinHeap<T>`, ordered by any `Comparator`, then use it to sort and to find the top k. Along the way you'll meet three things Java does differently from Python and TypeScript: generics with **bounds** and **wildcards**, **checked iteration** that fails fast when the collection changes underneath it, and a **build tool**, Maven, that compiles, fetches libraries and runs the tests.

The assignment has seven parts, 0 to 6. Do them in order, and write the tests for each part before moving to the next one.

Class, method and file names given in **bold code** are required, because the tests and later parts use them. Everything else is up to you.

### What you build

| Part | File | What |
|---|---|---|
| 0 | `pom.xml`, the folder layout | The project |
| 1 | `src/main/java/pq/MinHeap.java` | The class, its constructors, and the index arithmetic |
| 2 | `MinHeap.java` | `add` with sift-up, `peek`, `size`, `isEmpty`, and a heap checker |
| 3 | `MinHeap.java` | `poll` with sift-down |
| 4 | `MinHeap.java` | A constructor that builds a heap from a collection in linear time |
| 5 | `MinHeap.java` | `Iterable`, with a fail-fast iterator |
| 6 | `src/main/java/pq/Heaps.java` | `sorted` (heapsort) and `topK` |

In all, about 200 lines of code, plus tests.

### Learning outcomes

By the end of this assignment you can:

1. Explain the heap-order property, and why it's enough for a priority queue.
2. Store a complete binary tree in an array, and compute parent and child indexes.
3. Implement sift-up and sift-down, and explain why each is O(log n).
4. Build a heap from n items in O(n), and explain why that beats n insertions.
5. Use a heap to sort, and to find the k largest items of a stream in O(n log k).
6. Write a generic class with bounded type parameters and wildcards, and explain `<T extends Comparable<? super T>>`.
7. Implement `Iterable` with an iterator that detects concurrent modification.
8. Build and test a Java project with Maven and JUnit.

### Conventions

- **Min-heap.** The smallest item comes out first. For "largest first", pass a reversed comparator: the same class serves both.
- **Indexes start at 0.** *Algorithms* by Sedgewick and Wayne, in the reading, starts at 1 and leaves slot 0 empty, which makes the formulas `k/2`, `2k` and `2k+1`. With 0, they're `(i-1)/2`, `2i+1` and `2i+2`. Same idea.
- **No `null` items.** `add(null)` throws `NullPointerException`. A heap can't order `null`, and Java's own `PriorityQueue` refuses it too.
- **Store the items in an `ArrayList<T>`.** It grows by itself, and a raw generic array (`new T[n]`) isn't allowed in Java. Growing an array by hand is MEM01's subject.
- Don't use `java.util.PriorityQueue` in `src/main`. Tests may use anything.

---

## Reading

### Before you start

The goal here is to know the vocabulary and the shape of each problem before you write code, not to know the solution.

1. **[Algorithms, 4th ed. — 2.4 Priority Queues](https://algs4.cs.princeton.edu/24pq/)** by Sedgewick and Wayne, from "Heap definitions" to "Heap-based priority queue", and the section "Heapsort".
   Heap order, the array representation, swim and sink (their names for sift-up and sift-down), why building with sink from right to left takes linear time, and heapsort. Their indexes start at 1; see **Conventions**.
   *Parts 1–4 and 6.*
2. **[The Java Tutorials — Bounded Type Parameters](https://docs.oracle.com/javase/tutorial/java/generics/bounded.html)**, and in the same lesson **[Upper Bounded Wildcards](https://docs.oracle.com/javase/tutorial/java/generics/upperBounded.html)**, **[Lower Bounded Wildcards](https://docs.oracle.com/javase/tutorial/java/generics/lowerBounded.html)** and **[Guidelines for Wildcard Use](https://docs.oracle.com/javase/tutorial/java/generics/wildcardGuidelines.html)**.
   `<T extends Comparable<T>>`, `? extends T` and `? super T`, and the rule of thumb for which to use: a parameter you read items *from* is `extends`, one you give items *to* is `super`.
   *Parts 1, 4 and 6.*
3. **[Maven in 5 Minutes](https://maven.apache.org/guides/getting-started/maven-in-five-minutes.html)**, the sections "The POM" and "Maven Phases".
   What `pom.xml` declares, the standard folders `src/main/java` and `src/test/java`, and the phases `compile` and `test`.
   *Part 0.*
4. **[JUnit User Guide — Writing Tests](https://docs.junit.org/current/user-guide/writing-tests/intro.html)** and **[Assertions](https://docs.junit.org/current/user-guide/writing-tests/assertions.html)**.
   `@Test`, `assertEquals`, `assertTrue` and `assertThrows`. The equivalent of pytest and Vitest.
   *All parts.*

### Going deeper

- **[MIT 6.006, Spring 2020 — Lecture 8: Binary Heaps](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/lecture-8-binary-heaps/)**. Priority queues as an interface, and the proof that building a heap is linear.
- **[Algorithms, 4th ed. — 2.4 Priority Queues](https://algs4.cs.princeton.edu/24pq/)**, the exercises: index priority queues, which can change an item's priority, and multiway heaps.
- **[Java SE 25 — `java.util.PriorityQueue`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/PriorityQueue.html)**. The real one: its constructors, its complexity note, and its iterator, which also promises no order.
- **[The Java Tutorials — Generics](https://docs.oracle.com/javase/tutorial/java/generics/index.html)**, the whole lesson, including type erasure: why `new T[n]` isn't allowed.

---

## Part 0 — Project setup

### Java and Maven

Install Maven with Homebrew. It brings a JDK (Java Development Kit) with it, so this one command installs both:

```
brew install maven
mvn -v                # shows Maven's version and the Java version it runs on
```

### The project

Maven expects a fixed layout. Create it in this folder:

```
pom.xml
src/main/java/pq/       your code, in the package pq
src/test/java/pq/       your tests, in the same package
```

Tests in the same package can call package-private methods: ones with no `public`, `private` or `protected`. That's how they reach the index helpers and the heap checker without making them part of the public API.

`pom.xml` declares the project, the Java version, and the libraries: JUnit for tests. Copy it as it is. It's build configuration, not part of the assignment:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>deepdive</groupId>
    <artifactId>ds04-priority-queue</artifactId>
    <version>1.0</version>

    <properties>
        <maven.compiler.release>25</maven.compiler.release>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>6.1.3</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.16.0</version>
                <configuration>
                    <compilerArgs>
                        <arg>-Xlint:all</arg>
                    </compilerArgs>
                </configuration>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-surefire-plugin</artifactId>
                <version>3.6.1</version>
            </plugin>
        </plugins>
    </build>
</project>
```

- `maven.compiler.release` 25: compile for Java 25, the current long-term-support version. A newer JDK compiles for it fine.
- `<scope>test</scope>`: JUnit is only on the class path when tests compile and run, not for the main code.
- `-Xlint:all`: the compiler reports every warning, unchecked generic casts included. Fix them all.
- Surefire is the plugin that runs the tests in `mvn test`.

`mvn test` compiles everything and runs the tests. The first run downloads the plugins and JUnit into `~/.m2`, Maven's local cache, so it's slow once. `target/` holds the build output, and the repository's `.gitignore` already keeps it out of git.

A test class, to check the setup:

```java
package pq;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class SetupTest {
    @Test
    void works() {
        assertEquals(4, 2 + 2);
    }
}
```

Delete it once Part 1 has real tests.

---

## Part 1 — The class and its indexes

**File:** `src/main/java/pq/MinHeap.java`

### The class

**`public class MinHeap<T> implements Iterable<T>`**. (`Iterable` is Part 5. Until then, leave `implements Iterable<T>` out.)

- Fields: `private final ArrayList<T> items = new ArrayList<>();` and `private final Comparator<? super T> comparator;`.
- **`public MinHeap(Comparator<? super T> comparator)`**: store it. Reject `null` with `this.comparator = Objects.requireNonNull(comparator);`, which throws `NullPointerException` right away instead of on the first comparison.
- **`public static <T extends Comparable<? super T>> MinHeap<T> natural()`**: a heap in the type's own order, `return new MinHeap<>(Comparator.naturalOrder());`.

The two type signatures are the generics part of this assignment. Read them slowly:

**`Comparator<? super T>`**: "a comparator for `T` or for any supertype of `T`". A comparator that can compare any two `Number`s can certainly compare two `Integer`s, so a `MinHeap<Integer>` should accept a `Comparator<Number>`. With plain `Comparator<T>`, it wouldn't compile. The heap gives items **to** the comparator, so the rule from the reading says `super`.

**`<T extends Comparable<? super T>>`** on `natural()`: `natural()` only makes sense for types that know how to compare themselves, like `Integer` and `String`. The bound says "only for a `T` that is `Comparable`", so `MinHeap.<Object>natural()` doesn't compile. The `? super T` inside is for classes that inherit their `compareTo`: if `Fruit implements Comparable<Fruit>` and `Apple extends Fruit`, then `Apple` is a `Comparable<Fruit>`, not a `Comparable<Apple>`, and the bound still accepts it.

`natural()` is a **static factory**: a static method that returns a new instance. It's needed here because a constructor can't add a bound to the class's `T`; a static method has its own type parameter, which can have one.

### The indexes

The tree lives in the array level by level: index 0 is the root, 1 and 2 its children, 3 to 6 the next level, and so on.

```
        0
      /   \
     1     2
    / \   / \
   3   4 5   6
```

Write three static, package-private helpers:

- **`static int parent(int i)`**: `(i - 1) / 2`. Integer division drops the remainder, so both 3 and 4 give 1.
- **`static int left(int i)`**: `2 * i + 1`.
- **`static int right(int i)`**: `2 * i + 2`.

### Test that:

In `src/test/java/pq/MinHeapTest.java`, a package-private class `MinHeapTest` with `@Test` methods:

- `parent(1)` and `parent(2)` are `0`, `parent(3)` is `1`, and `parent(6)` is `2`.
- `left(0)` is `1`, `right(0)` is `2`, `left(3)` is `7`, and `right(3)` is `8`.
- For every `i` from 0 to 99, `parent(left(i))` and `parent(right(i))` are `i`.

---

## Part 2 — Adding

**File:** `MinHeap.java`

- **`public int size()`** and **`public boolean isEmpty()`**.
- **`public T peek()`**: the smallest item, which is at index 0, without removing it. On an empty heap, throw `NoSuchElementException` with the message `"heap is empty"`.
- **`public void add(T item)`**: reject `null` with `Objects.requireNonNull(item)`, append the item at the end of the list, and **sift it up** from its index.
- **`private void siftUp(int i)`**: while `i` isn't the root and the item at `i` is less than its parent's, swap them and continue from the parent's index.
- Two private helpers make the sifts readable: **`less(int i, int j)`**, `comparator.compare(items.get(i), items.get(j)) < 0`, and **`swap(int i, int j)`**.
- **`boolean isHeap()`**, package-private, for tests: `true` if no item is less than its parent. Checking every index from 1 to the end against its parent covers the whole tree.

Why does sift-up keep the heap order? Before the swap, the parent was ≤ all of its descendants except, maybe, the new item. If the new item is smaller, it takes the parent's place and is smaller than everything below; the old parent moves down, and it was already ≤ its new children. The only possible violation moves up one level each step, and ends at the root at the latest: log₂ n steps.

### Test that:

- **Adding keeps the order:** a `MinHeap.natural()` of `Integer` is empty at first. Add `5, 3, 8, 1, 9, 2`, one at a time, and after **each** add, `isHeap()` is true. Then `size()` is `6`, `peek()` is `1`, and `size()` is still `6`.
- **Errors:** on an empty heap, `peek()` throws `NoSuchElementException`, and `add(null)` throws `NullPointerException`. Use `assertThrows(NoSuchElementException.class, heap::peek)` and `assertThrows(NullPointerException.class, () -> heap.add(null))`.

---

## Part 3 — Removing the minimum

**File:** `MinHeap.java`

- **`public T poll()`**: remove and return the smallest item. On an empty heap, throw `NoSuchElementException`, like `peek` (calling `peek()` first does both). Otherwise:
  1. Keep the root item: it's the result.
  2. Remove the **last** item from the list: `items.remove(items.size() - 1)`. Removing from the end of an `ArrayList` is O(1); removing from the front would shift every item.
  3. If the list isn't empty now, put that last item at the root, and **sift it down** from index 0.
  4. Return the kept root.
- **`private void siftDown(int i)`**: repeat: find the smallest of the item at `i` and its children (a child exists only if its index is less than `size()`). If it's the item at `i` itself, stop. Otherwise swap with that child, and continue from the child's index.

Sift-down swaps with the **smaller** child. Swapping with the larger one would put the larger child above the smaller one, and break the order right there.

### Test that:

- **Polling gives sorted order:** add `5, 3, 8, 1, 9, 2, 7, 3` (with a duplicate `3`), then poll until empty, checking `isHeap()` after each poll. The polled items, in order, equal the input sorted: build the expected list with `new ArrayList<>(input)` and `Collections.sort(expected)`.
- **Random operations against a model:** with `new Random(42)`, 50 rounds, each with a new heap and an empty `ArrayList<Integer>` as the model. In each round, 300 steps: with `rng.nextInt(3) < 2`, add `rng.nextInt(100)` to both; otherwise, if the model isn't empty, remove `Collections.min(model)` from the model (`model.remove(min)`, where `min` is an `Integer`, removes that value, not an index) and check that `poll()` returns it. After each step, the sizes are equal. After each round, `isHeap()` is true.
- **The comparator decides:** a `new MinHeap<String>(Comparator.comparingInt(String::length))` with `"banana", "fig", "apple", "kiwi"` polls `"fig"`, then `"kiwi"`. A `new MinHeap<Integer>(Comparator.reverseOrder())` with `4, 9, 1` polls `9`: a max-heap.

---

## Part 4 — Building a heap all at once

**File:** `MinHeap.java`

To make a heap from n items you already have, you could add them one by one: n sift-ups of up to log₂ n steps each, O(n log n). There's a faster way. Put the items in the array in any order, then sift **down** every node that has children, from the last one up to the root.

Why is it faster? Half the nodes are leaves and need no work at all. A quarter are one level above the leaves and sift down at most one step, an eighth at most two steps, and so on. The total is n/4 · 1 + n/8 · 2 + n/16 · 3 + ..., which adds up to less than n swaps, and at most two comparisons per step: **O(n)**. Sift-up from the leaves would be the opposite: the many nodes at the bottom are the ones that travel far.

Write **`public MinHeap(Collection<? extends T> items, Comparator<? super T> comparator)`**:

1. Call the first constructor: `this(comparator);` as the first line.
2. Add every item to the list, rejecting `null`s.
3. For `i` from `parent(size() - 1)`, the parent of the last item and so the last node with a child, down to `0`: `siftDown(i)`. For an empty collection, that's `parent(-1)`, which is `(-1 - 1) / 2 = -1`, so the loop doesn't run.

`Collection<? extends T>`: "a collection of `T` or of any subtype". A `MinHeap<Number>` can be built from a `List<Integer>`. The heap reads items **from** the collection, so `extends`.

### Counting comparisons

To see the difference, count the comparisons. Copy this test helper to `src/test/java/pq/CountingComparator.java`:

```java
package pq;

import java.util.Comparator;

/** Natural order, counting how many comparisons were made. */
final class CountingComparator<T extends Comparable<? super T>> implements Comparator<T> {
    int count = 0;

    @Override
    public int compare(T a, T b) {
        count++;
        return a.compareTo(b);
    }
}
```

### Test that:

- **It builds a heap:** from `List.of(9, 8, 7, 6, 5, 4, 3, 2, 1, 0)` with `Comparator.naturalOrder()`: `isHeap()` is true, `size()` is `10`, and `peek()` is `0`. An empty list gives an empty heap, and `List.of(7)` gives a heap whose `peek()` is `7`.
- **It's linear:** with `n = 1 << 14` (16,384), make the list `n, n-1, ..., 1`: `IntStream.range(0, n).map(i -> n - i).boxed().toList()`. Descending order is the worst case for a min-heap, since every item is in the wrong place.
  - Build a heap from it with a `CountingComparator`: at most `2 * n` comparisons.
  - Add the same items one by one to a heap with another `CountingComparator`: at least `10 * n` comparisons. Each new item is the smallest so far and sifts all the way to the root.

---

## Part 5 — Iterating

**File:** `MinHeap.java`

Make **`MinHeap<T> implements Iterable<T>`**, so `for (T item : heap)` works. Iterating visits every item once, in **array order**, which is **not** sorted order: only the first item is guaranteed to be the smallest. Java's `PriorityQueue` says the same about its iterator. To get items in order, poll them.

**`public Iterator<T> iterator()`** returns an object with two methods: `hasNext()`, true while items are left, and `next()`, which returns the next item, or throws `NoSuchElementException` when there's none. Write it as an anonymous class, a class defined right where it's used:

```java
@Override
public Iterator<T> iterator() {
    return new Iterator<>() {
        private int next = 0;

        @Override
        public boolean hasNext() {
            return ...;
        }

        @Override
        public T next() {
            ...
        }
    };
}
```

The anonymous class can read the heap's fields, like `items`, the way a closure would.

### Failing fast

What should happen if the heap changes during iteration?

```java
for (int x : heap) {
    if (x == 3) heap.add(0);    // the array changes under the iterator
}
```

The add may move items around, so the loop could skip items or see one twice. Java's collections choose to fail loudly instead: the next `next()` throws `ConcurrentModificationException`. That's called **fail-fast**. The mechanism:

- A field **`private int modCount`**, increased by 1 in every `add` and `poll`.
- The iterator copies `modCount` when it's created. `next()` first checks that `modCount` is still that value, and throws `ConcurrentModificationException` if not.

### Test that:

- **Every item once:** with `5, 3, 8, 1` added, a for-each loop collects the items into a list. The first collected item is `1`. Sorted, the list is `[1, 3, 5, 8]`. Iterating doesn't change the heap: `size()` is still `4`.
- **Failing fast:** with `5, 3, 8` added, take an iterator and call `next()` once. Then `add(1)`, and the iterator's next `next()` throws `ConcurrentModificationException`.
- **The end:** a new iterator on the same heap, now with 4 items, returns 4 items, then `hasNext()` is false and `next()` throws `NoSuchElementException`.

---

## Part 6 — Using the heap

**File:** `src/main/java/pq/Heaps.java`

A class of static helpers: **`public final class Heaps`** with a private constructor, so it can't be instantiated, like `java.util.Collections`.

### Heapsort

**`public static <T extends Comparable<? super T>> List<T> sorted(Collection<? extends T> items)`**: a new list of the items in ascending order. Build a heap from all of them at once (Part 4), and poll until it's empty. O(n) to build, plus n polls of O(log n): O(n log n) in total. The real heapsort does it inside one array, with no extra space; this version is the same algorithm, written with your class.

### Top k

The 10 largest of a billion numbers: sorting all of them is O(n log n) and needs them all in memory. A heap of just k items does it in one pass:

**`public static <T> List<T> topK(Iterable<? extends T> items, int k, Comparator<? super T> comparator)`**: the k largest items according to `comparator`, largest first.

1. If `k` is negative, throw `IllegalArgumentException`. If `k` is `0`, return an empty list.
2. Keep a **min**-heap with the comparator. For each item:
   - While the heap has fewer than `k` items, add it.
   - Otherwise, if the item is greater than the heap's minimum (`comparator.compare(item, heap.peek()) > 0`), poll the minimum and add the item. If it isn't greater, it can't be among the k largest: skip it.
3. The heap now holds the k largest. Poll them all into a list, which gives them smallest first, and reverse it with `Collections.reverse`.

Why a **min**-heap for the **largest** items? The heap's root is the smallest of the k kept so far: the one to beat. Each item costs O(log k), so the whole pass is O(n log k), and memory is O(k).

With fewer than k items, all of them come back.

### Test that:

In `src/test/java/pq/HeapsTest.java`:

- `sorted(List.of(3, 9, 1, 3, 2))` is `[1, 2, 3, 3, 9]`. `sorted(List.of("kiwi", "apple", "fig"))` is `["apple", "fig", "kiwi"]`. An empty list gives an empty list: write it as `List.<Integer>of()`, so Java knows the type.
- With `nums = List.of(5, 1, 9, 3, 7, 9, 2)`:
  - `topK(nums, 3, Comparator.naturalOrder())` is `[9, 9, 7]`.
  - `topK(nums, 2, Comparator.reverseOrder())` is `[1, 2]`: the "largest" by a reversed order are the smallest.
  - `k` `0` gives `[]`, `k` `10` gives all 7 items, and `k` `-1` throws `IllegalArgumentException`.
- With `List.of("kiwi", "banana", "fig", "cherry")` and the comparator `Comparator.comparingInt(String::length).thenComparing(Comparator.naturalOrder())` (by length, then alphabetically), `topK` with `k` `2` is `["cherry", "banana"]`: both have 6 letters, and `"cherry"` comes after `"banana"` alphabetically, so it's larger.

---

## Running the tests

```
mvn test                       # compile and run all tests
mvn test -Dtest=HeapsTest      # one test class
```

---

## Cleaning up

What this assignment installed, and how to remove it when you're done:

- **The build output:** `rm -rf target` in this folder.
- **Maven's cache** of plugins and JUnit: `rm -rf ~/.m2`. Other Maven projects fill it again when they build.
- **Maven and the JDK:** `brew uninstall maven openjdk`. Maven installed `openjdk` as a dependency; `brew uses --installed openjdk` shows whether anything else still needs it, and if something does, uninstall only `maven`.
