# Assignment 01 — Library System (Python)

**Topics:** classes and constructors, encapsulation, inheritance, polymorphism, composition, abstract classes

## Overview

In this assignment you will build the core of a lending system for a small library. The library owns books and DVDs, each in one or more copies. Registered members can borrow a copy and return it later, and the library can print its catalog.

There is no user interface. You write a Python package and a test suite that proves it works.

## What you need to do

1. Create the file structure below.
2. Implement the classes and methods listed under **Required API**, with exactly the names and behavior described.
3. Write tests that cover every rule marked **Rule** below.
4. After finishing, complete `README.md` with what you learned and one design decision you made.

## File structure (required)

```
01-library-system-python/
├── library/
│   ├── __init__.py
│   ├── errors.py      # exception classes
│   ├── items.py       # LibraryItem, Book, DVD
│   ├── member.py      # Member
│   └── library.py     # Library
├── tests/
│   ├── test_items.py
│   └── test_library.py
├── ASSIGNMENT.md
└── README.md
```

## Required API

### `errors.py`

Three exception classes, each inheriting from `Exception`:

- `ItemUnavailableError`: raised when checking out an item with no available copies
- `InvalidReturnError`: raised when a return is not valid
- `NotFoundError`: raised when an item or member ID does not exist in the library

### `items.py`

**`LibraryItem`** — an abstract base class (inherit from `abc.ABC`).

| Member | Description |
|--------|-------------|
| `__init__(self, item_id: int, title: str, copies: int)` | All copies start as available. |
| `item_id`, `title`, `total_copies` | Read-only properties. |
| `available_copies` | Read-only property. The underlying value is private. |
| `checkout(self) -> None` | Decreases available copies by one. |
| `return_copy(self) -> None` | Increases available copies by one. |
| `describe(self) -> str` | Abstract method. |

- **Rule:** `LibraryItem(...)` cannot be instantiated directly (Python raises `TypeError` for you if `describe` is abstract).
- **Rule:** `checkout()` raises `ItemUnavailableError` when no copies are available.
- **Rule:** `return_copy()` raises `InvalidReturnError` when all copies are already available.
- **Rule:** Code outside the class cannot assign to `available_copies`.

**`Book(LibraryItem)`** adds `author: str`. Constructor: `Book(item_id, title, copies, author)`.
**`DVD(LibraryItem)`** adds `minutes: int`. Constructor: `DVD(item_id, title, copies, minutes)`.

Both constructors must call `super().__init__(...)`, and both implement `describe()`. Suggested output:

```
[Book] Dune by Frank Herbert (2/3 available)
[DVD] Alien, 117 min (0/1 available)
```

### `member.py`

**`Member`**

| Member | Description |
|--------|-------------|
| `__init__(self, member_id: int, name: str)` | |
| `member_id`, `name` | Read-only properties. |
| `borrowed_items` | Read-only view of the items the member currently holds (return a tuple, not the internal list). |

### `library.py`

**`Library`** holds items and members (composition).

| Method | Description |
|--------|-------------|
| `add_item(self, item: LibraryItem) -> None` | Adds an item to the catalog. |
| `add_member(self, member: Member) -> None` | Registers a member. |
| `checkout(self, member_id: int, item_id: int) -> None` | The member borrows one copy of the item. |
| `return_item(self, member_id: int, item_id: int) -> None` | The member returns a copy they hold. |
| `print_catalog(self) -> None` | Prints `describe()` of every item, one per line. |

- **Rule:** `checkout` and `return_item` raise `NotFoundError` for an unknown member or item ID.
- **Rule:** After a successful `checkout`, the item appears in the member's `borrowed_items` and its `available_copies` is one lower. `return_item` reverses both.
- **Rule:** `return_item` raises `InvalidReturnError` if the member does not hold that item.
- **Rule:** `print_catalog` must not check item types (no `isinstance`, no `type()`). It relies on polymorphism only.

## What you decide yourself

- How attributes are stored privately (`_x` or `__x`), and how `Library` stores items and members internally.
- How `Member` updates its borrowed items. You may add methods for this.
- Any additional helper methods or classes, as long as the required API above exists unchanged.
- The exact wording of `describe()`.

## Example

```python
from library.items import Book, DVD
from library.member import Member
from library.library import Library

lib = Library()
lib.add_item(Book(1, "Dune", 3, "Frank Herbert"))
lib.add_item(DVD(2, "Alien", 1, 117))
lib.add_member(Member(10, "Dana"))

lib.checkout(10, 2)
lib.checkout(10, 2)   # raises ItemUnavailableError
lib.print_catalog()
# [Book] Dune by Frank Herbert (3/3 available)
# [DVD] Alien, 117 min (0/1 available)
```

## Testing and running

- Python 3.11+, tests with `pytest`.
- Run from this folder: `python -m pytest`
- Every **Rule** above needs at least one test. Use `capsys` to test `print_catalog`.

## Submission checklist

- [ ] File structure matches the one above
- [ ] Every method in the Required API exists with the given name and signature
- [ ] Every Rule has a passing test
- [ ] `README.md` is completed
