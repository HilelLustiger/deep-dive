# Hash Map (Python)

Based on section 3.4 ("Hash Tables") of *Algorithms*, 4th edition, by Robert Sedgewick and Kevin Wayne, chapter 5 ("Hash Tables") of Pat Morin's *Open Data Structures*, and the Python data model's rules for `__hash__`.

Two hash maps built from scratch: separate chaining with load-factor resizing, and open addressing with linear probing and tombstones. Both implement the full mapping protocol through `collections.abc.MutableMapping`, are shown failing gracefully with colliding keys and failing silently with mutated keys, and are checked against `dict` with seeded random operations.

The full task is in [ASSIGNMENT.md](ASSIGNMENT.md).
