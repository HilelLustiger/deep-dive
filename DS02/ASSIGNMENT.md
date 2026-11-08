# Assignment DS02 — Hash Map (Python)

**Topics:** hash functions, `hash()` and `__hash__`, the hash/equality contract, buckets, collisions, separate chaining, load factor, resizing and amortized cost, open addressing with linear probing, tombstones, the mapping protocol, `collections.abc.MutableMapping`, hash randomization, testing against a model

## Introduction

A **hash map** stores key–value pairs and finds a key's value in constant time on average, however many pairs it holds. Python's `dict` is one, and so are JavaScript's `Map` and Java's `HashMap`. In this assignment you build one from scratch, twice, with the two classic designs.

The idea: keep an array of **buckets**. To store a key, compute a number from it, its **hash**, and use `hash % capacity` as the bucket index. To find the key again, compute the same index and look only in that bucket. No search through everything.

Two different keys can land in the same bucket: a **collision**. Collisions can't be avoided, since there are more possible keys than buckets, so a hash map is mostly about handling them:

- **Separate chaining:** each bucket holds a small list of pairs. Colliding keys share the list.
- **Open addressing:** each bucket holds at most one pair. A key whose bucket is taken goes to the next free one, **linear probing**, and lookups follow the same path.

Either way, the map stays fast only while buckets stay nearly empty. The **load factor**, keys divided by buckets, measures that. When it passes a limit, the map **resizes**: it allocates twice as many buckets and moves every key to its new bucket. That costs time proportional to the size, but it happens rarely enough that the average cost per insertion stays constant: **amortized** O(1).

The map is only as good as the keys' hashes. Python asks one rule of every key: **objects that are equal must have equal hashes**. You'll see what happens when a key breaks it, and when a key changes after it was stored.

The assignment has eight parts, 0 to 7. Do them in order, and write the tests for each part before moving to the next one.

Class, function and file names given in **bold code** are required, because the tests and later parts use them. Everything else is up to you.

### What you build

| Part | File | What |
|---|---|---|
| 0 | `requirements-dev.txt`, `pytest.ini`, `hashmap/`, `tests/` | The project |
| 1 | `hashmap/hashing.py`, `hashmap/chained.py` | `bucket_index`, and `ChainedHashMap`: store, find and replace |
| 2 | `hashmap/chained.py` | Deleting keys |
| 3 | `hashmap/chained.py` | Load factor and resizing |
| 4 | `hashmap/chained.py`, `tests/keys.py` | Collisions on purpose, and keys that break the rules |
| 5 | `hashmap/chained.py` | The full mapping protocol, from `MutableMapping` |
| 6 | `hashmap/probing.py` | `ProbingHashMap`: open addressing with linear probing and tombstones |
| 7 | `tests/` | A random test against `dict` |

In all, about 170 lines of code, plus tests.

### Learning outcomes

By the end of this assignment you can:

1. Explain how a hash map turns a key into a bucket, and why lookups take constant time on average.
2. State the contract between `__eq__` and `__hash__`, and explain what breaks when a key violates it or changes after it was stored.
3. Implement separate chaining, and explain what the load factor measures.
4. Implement resizing, and explain why doubling gives amortized constant-time insertion.
5. Implement open addressing with linear probing, and explain why deletion needs tombstones.
6. Implement the mapping protocol with `MutableMapping`, and say which methods it gives you for free.
7. Test a data structure against a trusted model with random operations.

### Conventions

- **Use only the standard library** in `hashmap/`. Not `dict` or `set` to store the pairs: that would be a hash map inside your hash map. Lists and tuples are fine.
- **Python 3.12**, from Homebrew (`python3.12`), in a virtual environment in this folder.

### Where strings land changes every run

Python mixes a random number into the hash of every `str` and `bytes` when the interpreter starts, so `hash("apple")` is different in every run. It's a security measure: an attacker who knows the hash function can send many keys that all collide and slow a server down. You can see it:

```
python3.12 -c 'print(hash("apple"))'
python3.12 -c 'print(hash("apple"))'    # a different number
python3.12 -c 'print(hash(42))'         # 42, every time: small ints hash to themselves
```

So **a test must never depend on which bucket a string lands in**. When a test needs keys in known buckets, it uses small `int`s, whose hash is the number itself, or keys with a hash you choose (Part 4).

---

## Reading

### Before you start

The goal here is to know the vocabulary and the shape of each problem before you write code, not to know the solution.

1. **[Algorithms, 4th ed. — 3.4 Hash Tables](https://algs4.cs.princeton.edu/34hash/)** by Sedgewick and Wayne, the sections "Hash functions", "Hashing with separate chaining" and "Hashing with linear probing".
   The two designs you build, with pictures, and how the load factor decides their speed. The code is Java; read it for the ideas.
   *Parts 1, 3 and 6.*
2. **[Open Data Structures (in Python) — 5. Hash Tables](https://opendatastructures.org/ods-python/5_Hash_Tables.html)**, sections 5.1 "ChainedHashTable" and 5.2 "LinearHashTable".
   The same two designs again, and in 5.2 how deletion works with linear probing: why an emptied slot must be marked, not cleared. The book's `del` marker is the tombstone of Part 6.
   *Parts 2 and 6.*
3. **[Python — Data model, `object.__hash__`](https://docs.python.org/3/reference/datamodel.html#object.__hash__)**
   The one rule for hashes, "objects which compare equal have the same hash value", why a mutable object shouldn't be hashable, and the note on hash randomization of `str` and `bytes`.
   *Parts 1 and 4.*
4. **[Python — `collections.abc`](https://docs.python.org/3/library/collections.abc.html)**, the table "Collections Abstract Base Classes", the row `MutableMapping`.
   Implement five methods, get a dozen more.
   *Part 5.*

### Going deeper

- **[MIT 6.006, Spring 2020 — Lecture 4: Hashing](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/lecture-4-hashing/)**. Why hashing beats the lower bound for searching by comparisons, and universal hashing.
- **[Open Data Structures (in Python) — 5. Hash Tables](https://opendatastructures.org/ods-python/5_Hash_Tables.html)**, the rest of the chapter: 5.3 on how hash codes for numbers, strings and tuples are built.
- **[Algorithms, 4th ed. — 3.4 Hash Tables](https://algs4.cs.princeton.edu/34hash/)**, the Q + A and exercises, on resizing and on why `hash % capacity` needs care with negative numbers in Java (Python's `%` is never negative for a positive capacity).
- **CPython's `dict`:** the long comment at the top of [Objects/dictobject.c](https://github.com/python/cpython/blob/main/Objects/dictobject.c). Open addressing with a smarter probe sequence than yours, and a separate array that keeps insertion order.

---

## Part 0 — Project setup

Set up the project in this folder:

- A virtual environment: `python3.12 -m venv .venv`, then `source .venv/bin/activate`. The repository's `.gitignore` already keeps `.venv/` out of git.
- `requirements-dev.txt` with `pytest`, installed with `pip install -r requirements-dev.txt`.
- `pytest.ini`:
  ```ini
  [pytest]
  testpaths = tests
  ```
- A `hashmap/` package for the code and a `tests/` package for the tests, each with an empty `__init__.py`. Tests import from both: `from hashmap.chained import ChainedHashMap`, `from tests.keys import BadKey`.

Check that `pytest` runs.

---

## Part 1 — Buckets, storing and finding

**Files:** `hashmap/hashing.py`, `hashmap/chained.py`

### The bucket index

In `hashmap/hashing.py`, write **`bucket_index(key, capacity: int) -> int`**: `hash(key) % capacity`.

`hash(key)` calls the key's `__hash__`. It can be any integer, negative too, but Python's `%` with a positive right side is always between `0` and `capacity - 1`. A key that can't be hashed, like a `list`, makes `hash` raise `TypeError`, and so does `bucket_index`: lists can change, so they can't be keys.

### The map

In `hashmap/chained.py`, write **`class ChainedHashMap`**:

- **`__init__(self, capacity: int = 8)`**: raise `ValueError` if `capacity` is less than 1. The buckets are a list of `capacity` empty lists: `[[] for _ in range(capacity)]`. Not `[[]] * capacity`, which is `capacity` references to **one** list. Also keep the number of keys, starting at 0.
- Each bucket holds pairs as two-item lists, `[key, value]`. A list, not a tuple, so a value can be replaced in place.
- **`capacity`**, a property: the number of buckets.
- **`__setitem__(self, key, value)`**, which runs for `m[key] = value`: find the key's bucket. If a pair in it has a key equal (`==`) to `key`, replace its value. Otherwise append `[key, value]` and add 1 to the count.
- **`__getitem__(self, key)`**, for `m[key]`: the value of the pair with an equal key in the key's bucket, or raise `KeyError(key)`.
- **`__contains__(self, key) -> bool`**, for `key in m`.
- **`__len__(self) -> int`**, for `len(m)`: the count. Keep a counter rather than adding up bucket lengths, so `len` is O(1).

Why `==` and not `is`? Two keys can be equal without being the same object: `"hel" + "lo"` builds a new string equal to `"hello"`. The hash finds the bucket, and equality finds the pair inside it. That's why equal keys must have equal hashes: otherwise the two equal keys look in different buckets.

A **property** is a method read like an attribute, without parentheses:

```python
class Circle:
    def __init__(self, radius):
        self._radius = radius

    @property
    def area(self) -> float:
        return 3.14159 * self._radius ** 2

Circle(2).area    # 12.566...
```

### Test that:

In `tests/test_chained.py`:

- `bucket_index` is between `0` and `7` for the keys `"a"`, `"hello"`, `0`, `17`, `-5`, `(1, 2)` and `3.5` with capacity `8`. `"hello"` and `"hel" + "lo"` get the same index. `bucket_index(-1, 10)` equals `hash(-1) % 10`. `bucket_index([1, 2], 8)` raises `TypeError`.
- A new map has length `0`. After `m["a"] = 1` and `m["b"] = 2`, both values come back and the length is `2`. After `m["a"] = 10`, `m["a"]` is `10` and the length is still `2`. `"a" in m` is true, `"z" in m` is false, and `m["z"]` raises `KeyError`.
- `None` is a value like any other: after `m["n"] = None`, `"n" in m` is true and `m["n"]` is `None`.
- Different kinds of keys: `m[1] = "int"` and `m[(1, 2)] = "tuple"` come back. `m[1.0]` is `"int"` too: `1.0 == 1` and `hash(1.0) == hash(1)`, so for Python they're the same key.
- `ChainedHashMap(0)` raises `ValueError`.

---

## Part 2 — Deleting

**File:** `hashmap/chained.py`

Write **`__delitem__(self, key)`**, for `del m[key]`: remove the pair with an equal key from the key's bucket and subtract 1 from the count, or raise `KeyError(key)`. `del bucket[i]` removes the item at index `i`; `enumerate(bucket)` gives each pair with its index.

### Test that:

- After setting `"a"` and `"b"` and deleting `"a"`: `"a" not in m`, the length is `1`, and `m["b"]` is still `2`. Deleting `"a"` again raises `KeyError`. Setting `"a"` to `3` afterwards works, and the length is `2`.

---

## Part 3 — Load factor and resizing

**File:** `hashmap/chained.py`

With a fixed number of buckets, a map with 8 buckets and 8,000 keys has about 1,000 keys per bucket, and every lookup scans one of those lists. To keep buckets short, the map grows with the number of keys.

- **`load_factor`**, a property: the number of keys divided by `capacity`.
- **`MAX_LOAD = 0.75`**, a class attribute.
- At the end of `__setitem__`, after adding a **new** key (not after replacing a value), if `load_factor` is now greater than `MAX_LOAD`, resize to twice the capacity.
- **`_resize(self, new_capacity: int)`**: make `new_capacity` new empty buckets, and put every pair into its bucket in the **new** list. Each key's index has to be computed again, with the new capacity: a key in bucket 3 of 8 may belong in bucket 3 or 11 of 16.

Why double, and not add a fixed number of buckets? Each resize moves every key. With doubling, the resizes on the way to `n` keys move about `n + n/2 + n/4 + ... < 2n` keys in total: a constant amount of extra work per insertion, on average. Adding, say, 8 buckets each time would resize every 6 insertions, and the moves would add up to about n²/12.

### Test that:

- **Exactly when it grows:** a new map has capacity `8`. After the keys `0` to `5` (6 keys), the capacity is still `8` and `load_factor` is `0.75`: equal to the limit, not over it. After key `6`, the capacity is `16`, and all 7 keys still return their values.
- **Many keys:** after 1,000 keys `"key0"` to `"key999"`, each with its number as the value, the length is `1000`, every key returns its value, `load_factor` is at most `MAX_LOAD`, and the capacity is a power of two: `capacity & (capacity - 1) == 0`.

---

## Part 4 — Collisions

**Files:** `hashmap/chained.py`, `tests/keys.py`

To see collisions, make them happen on purpose. In `tests/keys.py`, write **`class BadKey`**, a test helper:

```python
class BadKey:
    """A key whose hash is always 0: every BadKey collides with every other."""

    def __init__(self, name):
        self.name = name

    def __eq__(self, other):
        return isinstance(other, BadKey) and self.name == other.name

    def __hash__(self):
        return 0

    def __repr__(self):
        return f"BadKey({self.name!r})"
```

It follows the rule, since equal keys have equal hashes, but it's the worst possible hash: every key goes to bucket 0. The map stays correct, and becomes a slow list.

In `hashmap/chained.py`, add **`bucket_lengths(self) -> list[int]`**: the number of pairs in each bucket, in bucket order. It's for tests and for curiosity.

The other way to break a map is to change a key after storing it. The pair stays in the bucket of the **old** hash, and a lookup with the new value goes to a different bucket. That's why `list` and `dict` can't be keys, and why a class that defines `__eq__` gets `__hash__ = None`, making it unhashable, unless it defines `__hash__` itself.

### Test that:

In `tests/test_chained.py`:

- **One bucket for all:** a `ChainedHashMap(16)` with five `BadKey`s, `"a"` to `"e"`, each with its name as the value. The largest bucket length is `5`, and every other bucket is `0`: `sorted(m.bucket_lengths(), reverse=True)[:2] == [5, 0]`. `m[BadKey("c")]` is `"c"`. After deleting `BadKey("b")`, it's gone, and `BadKey("e")` is still found.
- **A changed key is lost:** inside the test, define a class `Box` with a field `v`, an `__eq__` that compares `v`, and `__hash__` returning `hash(self.v)`. In a `ChainedHashMap(64)`, store `box = Box(1)`, then set `box.v = 2`. Now `box in m` is false, `Box(1) in m` is false too, and the length is still `1`: the pair is there, and nothing can find it. With capacity 64, `hash(1)` and `hash(2)` land in different buckets, so the test doesn't depend on luck.

---

## Part 5 — The mapping protocol

**File:** `hashmap/chained.py`

Your map does `[]`, `in`, `del` and `len`, but not `.get`, `.items()`, `.update()`, `for key in m`, or `==` with a `dict`. You could write each one, but Python can derive them all. `collections.abc.MutableMapping` is a base class with five abstract methods: `__getitem__`, `__setitem__`, `__delitem__`, `__iter__` and `__len__`. Implement those, and it supplies `get`, `keys`, `items`, `values`, `pop`, `popitem`, `clear`, `update`, `setdefault`, `__contains__`, `__eq__` and more, all built on your five.

- Make `ChainedHashMap` inherit from `MutableMapping`: `from collections.abc import MutableMapping`, then `class ChainedHashMap(MutableMapping):`.
- Write **`__iter__(self)`**: a generator that yields every key, bucket after bucket. The order is whatever the buckets give; nothing promises insertion order.
- Write **`__repr__(self) -> str`**: `ChainedHashMap({...})`, with the pairs shown as a dict: `f"ChainedHashMap({dict(self.items())!r})"`. An empty map is `ChainedHashMap({})`.

Your own `__contains__` from Part 1 stays: a method you define replaces the inherited one. Yours looks in one bucket; the inherited one would call `__getitem__` and catch the `KeyError`, which does the same work less directly.

A generator, on an unrelated example:

```python
def evens(limit):
    for n in range(limit):
        if n % 2 == 0:
            yield n

list(evens(7))    # [0, 2, 4, 6]
```

### Test that:

- After `m.update({"a": 1, "b": 2, "c": 3})`:
  - `sorted(m)` is `["a", "b", "c"]`: iteration gives every key once.
  - `dict(m) == {"a": 1, "b": 2, "c": 3}`, and `m == {"a": 1, "b": 2, "c": 3}`.
  - `sorted(m.items())` is `[("a", 1), ("b", 2), ("c", 3)]`, and `sorted(m.values())` is `[1, 2, 3]`.
  - `m.get("z")` is `None`, `m.get("z", 0)` is `0`, and `m.get("a")` is `1`.
  - `m.pop("a")` is `1`, and then `"a"` isn't in the map.
  - `m.setdefault("d", 4)` is `4`, and then `m.setdefault("d", 5)` is still `4`.
- `repr(ChainedHashMap())` is `"ChainedHashMap({})"`.

---

## Part 6 — Open addressing

**File:** `hashmap/probing.py`

The second design keeps every pair in the array itself, one per slot. No lists inside lists: one flat array, which is faster in practice because neighboring slots sit next to each other in memory.

Write **`class ProbingHashMap(MutableMapping)`**:

- **`__init__(self, capacity: int = 8)`**: raise `ValueError` if `capacity` is less than 2. The slots are `[None] * capacity` (here `None` is fine to repeat: it's not a list). Keep the number of keys, and the number of tombstones, both starting at 0.
- A slot holds one of three things: `None` (never used), a `(key, value)` tuple, or the **tombstone**: a module-level marker `_TOMBSTONE = object()`, a unique object that can't be mistaken for anything else. Compare with it using `is`.
- **`capacity`**, **`load_factor`** (keys divided by capacity) and **`tombstones`**: properties.
- **`MAX_LOAD = 0.5`**: probing slows down sharply as the array fills, so the limit is lower than for chaining.

### Probing

All operations start with the same search. Write **`_probe(self, key) -> tuple[int, bool]`**:

1. Start at `i = bucket_index(key, self.capacity)`, and remember no tombstone yet.
2. Look at slot `i`:
   - `None`: the key isn't in the map. Return `(i, False)`, or, if you passed a tombstone on the way, `(that tombstone's index, False)`: the first reusable slot is where the key should go.
   - The tombstone: remember its index if it's the first one, and go on.
   - A pair whose key equals `key`: return `(i, True)`.
   - Another pair: go on.
3. Go on means `i = (i + 1) % self.capacity`, wrapping around to slot 0 at the end. Then step 2 again.

The loop ends because the array always has a `None` slot: the load limit keeps keys and tombstones together to at most half of it.

### Why tombstones

Say `A`, `B` and `C` all hash to slot 2, so they sit in slots 2, 3 and 4. To find `C`, a lookup starts at 2 and walks past `A` and `B`. Now delete `B` by putting `None` in slot 3. The next lookup for `C` starts at 2, passes `A`, finds `None` at 3, and stops: "not found". `C` is still in slot 4, unreachable. A tombstone in slot 3 means "something was here, keep walking", so lookups go past it, and insertions can reuse it.

### The operations

- **`__getitem__`**: probe; if found, return the value from the slot, otherwise raise `KeyError(key)`.
- **`__setitem__`**: probe. If found, put `(key, value)` in that slot. If not, the returned slot is where the new pair goes: if it holds a tombstone, subtract 1 from the tombstone count; put the pair there and add 1 to the key count. Then, if keys plus tombstones are more than `MAX_LOAD` times the capacity, **rebuild**.
- **`__delitem__`**: probe; if not found, raise `KeyError(key)`. Otherwise put `_TOMBSTONE` in the slot, subtract 1 from the keys and add 1 to the tombstones.
- **`__iter__`**: yield the key of every slot that holds a pair.
- **`__len__`** and **`__repr__`** (`ProbingHashMap({...})`), as in `ChainedHashMap`.
- **`_rebuild(self)`**: tombstones take up room, so they count toward the load. A rebuild drops them: make a new array, and insert every pair again with `self[key] = value` (the counts start from 0 again). The new capacity is **twice** the old one if more than a quarter of the old slots hold keys (`keys * 4 > capacity`), and the **same** otherwise. A map that only had many deletions doesn't need to grow, just to be cleaned.

### Testing both maps with the same tests

Most tests from Parts 1, 2, 3 and 5 should pass for both maps. Instead of copying them, give them a **parametrized fixture**: pytest runs each test that asks for it once per value.

```python
import pytest

@pytest.fixture(params=[list, tuple])
def sequence_type(request):
    return request.param

def test_length(sequence_type):          # runs twice: once with list, once with tuple
    assert len(sequence_type([1, 2, 3])) == 3
```

Move the shared tests to `tests/test_maps.py`, with a fixture **`map_class`** whose params are `[ChainedHashMap, ProbingHashMap]`, and make them build `map_class()` instead of `ChainedHashMap()`. The tests about chaining in particular (the exact resize point of Part 3, and Part 4) stay in `tests/test_chained.py`. In the "many keys" test, compare `load_factor` with `map_class.MAX_LOAD`.

### Test that:

The shared tests pass for both classes. And in `tests/test_probing.py`:

- **Growing at half:** after keys `0` to `3`, the capacity is `8`. After key `4` (5 out of 8 is more than half), it's `16`.
- **Deleting inside a cluster:** in a `ProbingHashMap(16)`, add `BadKey("a")`, `BadKey("b")` and `BadKey("c")`, each with its name as the value: all three hash to 0, so they sit in slots 0, 1 and 2. Delete `BadKey("a")`. `tombstones` is `1`, and `BadKey("c")` is still found, past the tombstone. Add `BadKey("d")`: it reuses the tombstone's slot, so `tombstones` is `0`. `dict(m)` is `{BadKey("b"): "b", BadKey("c"): "c", BadKey("d"): "d"}`.
- **A rebuild clears tombstones without growing:** in a `ProbingHashMap(16)`, add keys `0` to `5`, then delete `0` to `4`. The length is `1` and `tombstones` is `5`. Add `6` and `7`: they go to the empty slots 6 and 7, so `tombstones` is still `5` and the capacity `16` (keys plus tombstones: 8, exactly half). Add `8`: now 9 is more than half, so the map rebuilds. `tombstones` is `0`, the capacity is still `16` (4 keys are a quarter of 16, not more), and `dict(m)` is `{5: 5, 6: 6, 7: 7, 8: 8}`.

---

## Part 7 — Testing against `dict`

**File:** `tests/test_maps.py`

Hand-written tests check the cases you thought of. A **model-based test** checks the ones you didn't: run thousands of random operations on your map and on a structure you trust, the built-in `dict`, and compare after every step. If they ever disagree, your map has a bug.

Write a test that takes the `map_class` fixture, and is also parametrized over 20 seeds with `@pytest.mark.parametrize("seed", range(20))`, so it runs 40 times:

1. `rng = random.Random(seed)`: a random generator of its own, so each run is repeatable, and a failure can be reproduced from its seed.
2. The keys to pick from: `[*range(30), *(f"s{i}" for i in range(30)), *(BadKey(i) for i in range(10))]`. Few keys means the same key comes up again and again, so replacements and deletions of existing keys happen often. The `BadKey`s make one long collision chain.
3. Repeat 2,000 times: pick a key with `rng.choice(keys)` and a number `op = rng.random()`.
   - `op < 0.5`: set the key to `rng.randrange(1000)`, in both your map and the `dict`.
   - `op < 0.8`: if the key is in the `dict`, delete it from both. If not, check that deleting it from your map raises `KeyError`.
   - Otherwise: check that `key in m` equals `key in model`, and `m.get(key)` equals `model.get(key)`.
   - After each step, check that the lengths are equal.
4. At the end, `dict(m) == model`.

---

## Running the tests

```
source .venv/bin/activate
pytest
PYTHONHASHSEED=0 pytest     # strings hash the same way every run: useful to reproduce a failure
```

---

## Cleaning up

What this assignment installed, and how to remove it when you're done:

- **The virtual environment:** `rm -rf .venv` in this folder. It holds pytest and nothing else.
- Python 3.12 itself came with Homebrew before this assignment, and other projects use it. Leave it.
