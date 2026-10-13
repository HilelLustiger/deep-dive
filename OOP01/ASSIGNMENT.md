# Assignment OOP01 — Library System (Python)

**Topics:** classes and constructors, encapsulation, inheritance, polymorphism, composition, abstract classes

## Introduction

In this assignment you will write the core of a lending system for a small library.

The library owns **items**. Right now there are two kinds: books and DVDs. The library may own several copies of each item. People register as **members**, and a member can borrow a copy of an item and return it later. At any time, the library can print its **catalog**: every item it owns and how many copies are available.

There is no user interface. You will write Python classes, and tests that show those classes behave correctly.

The assignment has five parts. Do them in order, and write the tests for each part before moving to the next one.

The file for each part is already created. Class and method names given in **bold code** are required, because the tests and the examples depend on them. Everything else is up to you.

---

## Reading

### Before you start

The goal here is to know the vocabulary and the shape of each problem before you write code, not to know the solution.

1. **[Real Python — Object-Oriented Programming (OOP) in Python](https://realpython.com/python3-object-oriented-programming/)**
   Classes vs. instances, `__init__` and `self`, instance vs. class attributes, methods, inheritance, overriding a parent's method, and calling it with `super()`.
   *Parts 2–4.*
2. **[Python tutorial — Private Variables](https://docs.python.org/3/tutorial/classes.html#private-variables)**
   Python has no truly private attributes. There's the `_name` convention ("don't touch this from outside") and name mangling for `__name`. This is why Part 2 protects the copy count with a property rather than a keyword.
   *Parts 2–3.*
3. **[Real Python — Python's property(): Add Managed Attributes to Your Classes](https://realpython.com/python-property/)**
   What `@property` is, and how a getter with no setter makes an attribute read-only from outside.
   *Parts 2–3.*
4. **Python docs — `abc`**: [`abc.ABC`](https://docs.python.org/3/library/abc.html#abc.ABC) and [`@abstractmethod`](https://docs.python.org/3/library/abc.html#abc.abstractmethod)
   Short. What makes a class abstract in Python, and why creating one raises `TypeError`.
   *Part 2.*
5. **[Python tutorial — User-defined Exceptions](https://docs.python.org/3/tutorial/errors.html#user-defined-exceptions)**
   Defining your own exception class by inheriting from `Exception`. If `raise` and `try`/`except` feel rusty, read the sections just before it too.
   *Part 1.*
6. **[Real Python — Inheritance and Composition: A Python OOP Guide](https://realpython.com/inheritance-composition-python/)**
   "Is a" vs. "has a", when to choose each, and how different classes can be used through one shared interface, which is polymorphism.
   *Parts 2 and 4.*
7. **pytest docs**: [Get Started](https://docs.pytest.org/en/stable/getting-started.html), [Assertions about expected exceptions](https://docs.pytest.org/en/stable/how-to/assert.html#assertions-about-expected-exceptions) and [How to capture stdout/stderr output](https://docs.pytest.org/en/stable/how-to/capture-stdout-stderr.html)
   How pytest finds and runs tests, `pytest.raises`, and the `capsys` fixture.
   *All parts' tests.*

### Going deeper

The source this assignment is based on:

- ***Python Object-Oriented Programming For Beginners*** by Donald K. Fleck. The exercises this assignment is built from.

Python's object model:

- ***Fluent Python*, 2nd ed.** by Luciano Ramalho (not free):
  - ch. 11 "A Pythonic Object": private and "protected" attributes, `__repr__`, `__slots__`.
  - ch. 13 "Interfaces, Protocols, and ABCs": duck typing vs. ABCs vs. static protocols, and when each fits.
  - ch. 14 "Inheritance: For Better or for Worse": `super()`, the method resolution order, mixins, and why inheritance is often the wrong tool.
  - ch. 22 "Dynamic Attributes and Properties" and ch. 23 "Attribute Descriptors": how `@property` works.
- **[Real Python — Python Classes: The Power of Object-Oriented Programming](https://realpython.com/python-classes/)**. A longer, more complete tour of classes than the intro article above.
- **[Python docs — Descriptor HowTo Guide](https://docs.python.org/3/howto/descriptor.html)**. What `@property` really is: a descriptor, the mechanism behind properties, methods, `classmethod` and `staticmethod`.
- **[Python docs — Data model](https://docs.python.org/3/reference/datamodel.html)**. The reference for special methods such as `__init__`, `__repr__` and `__eq__`: how your objects plug into the language.
- **[Raymond Hettinger — Python's super() considered super!](https://rhettinger.wordpress.com/2011/05/26/super-considered-super/)**. What `super()` actually calls, and how cooperative multiple inheritance works.
- **[Python docs — The Python 2.3 Method Resolution Order](https://docs.python.org/3/howto/mro.html)**. The C3 algorithm that decides which parent's method wins. Still how Python works today.

Design:

- **[Brandon Rhodes — The Composition Over Inheritance Principle](https://python-patterns.guide/gang-of-four/composition-over-inheritance/)**. The Gang of Four principle, shown with Python examples: why a class explosion from subclassing is fixed by composing objects.
- **[PEP 544 — Protocols: Structural subtyping](https://peps.python.org/pep-0544/)**. Interfaces by shape instead of by inheritance (`typing.Protocol`). This is the bridge to TypeScript's interfaces in assignment OOP02.

---

## Part 1 — Errors

**File:** `library/errors.py`

Some operations in this system can fail: borrowing an item that has no copies left, returning something the member never borrowed, or using an ID that doesn't exist. Each kind of failure gets its own exception class, so calling code can tell them apart.

Define three exception classes. Each one inherits from `Exception` and needs no body:

- **`ItemUnavailableError`**: there are no available copies of the item.
- **`InvalidReturnError`**: the return is not allowed.
- **`NotFoundError`**: no item or member exists with the given ID.

There is nothing to test in this part.

---

## Part 2 — Library items

**File:** `library/items.py`

This part practices **abstract classes**, **inheritance** and **encapsulation**.

Every item in the library, whatever its kind, has an ID, a title, a total number of copies and a number of copies currently available. Every item can have a copy checked out and returned. The only thing that differs between a book and a DVD is the extra information it carries and how it describes itself.

So you will write one base class that holds everything the items share, and one subclass per kind of item.

### 2a. The base class

Write the class **`LibraryItem`**.

- Its constructor is **`LibraryItem(item_id, title, copies)`**. When an item is created, all its copies are available.
- It exposes **`item_id`**, **`title`**, **`total_copies`** and **`available_copies`** as read-only properties.
- **`checkout()`** takes one copy out: the number of available copies goes down by one. If there are no copies available, it raises `ItemUnavailableError`.
- **`return_copy()`** puts one copy back: the number of available copies goes up by one. If all copies are already in the library, it raises `InvalidReturnError`.
- **`describe()`** returns a one-line string describing the item.

Two important restrictions:

1. **It must be abstract.** A "library item" with no kind makes no sense, so it should be impossible to create one directly. Make `LibraryItem` inherit from `abc.ABC` and mark `describe()` as an `@abstractmethod`. Python will then refuse to create a `LibraryItem`, and every subclass will be forced to implement `describe()`.
2. **The copy count must be protected.** Code outside the class may read `available_copies`, but must not be able to change it. The only way to change it is through `checkout()` and `return_copy()`. Store the value in a private attribute and expose it through a `@property` with no setter.

### 2b. The subclasses

Write **`Book`** and **`DVD`**, both inheriting from `LibraryItem`.

- **`Book(item_id, title, copies, author)`** also stores the author.
- **`DVD(item_id, title, copies, minutes)`** also stores the length in minutes.

Each constructor must call `super().__init__(...)` for the shared fields, then store its own extra field.

Each class implements `describe()` in its own way. For example:

```
[Book] Dune by Frank Herbert (2/3 available)
[DVD] Alien, 117 min (0/1 available)
```

### Test that:

- Creating `LibraryItem(...)` directly raises `TypeError`.
- A new `Book` has all copies available.
- `checkout()` lowers the available copies, and `return_copy()` raises them.
- `checkout()` with no copies left raises `ItemUnavailableError`.
- `return_copy()` when all copies are in raises `InvalidReturnError`.
- Assigning to `available_copies` from outside raises an error.
- `describe()` of a `Book` and of a `DVD` returns the expected text.

---

## Part 3 — Members

**File:** `library/member.py`

A member is a person registered with the library. The library needs to know which items each member currently holds.

Write the class **`Member`**.

- Its constructor is **`Member(member_id, name)`**. A new member holds no items.
- It exposes **`member_id`** and **`name`** as read-only properties.
- It exposes **`borrowed_items`**: the items the member currently holds. Return a tuple, not your internal list, so that outside code can't add or remove items behind the library's back.

The library will need a way to add an item to a member and remove it. Add whatever methods you think are right for that. This is your design decision.

The tests for this part are written together with Part 4.

---

## Part 4 — The library

**File:** `library/library.py`

This part practices **composition** and **polymorphism**.

The `Library` class does not inherit from anything. It *contains* the items and the members, and all borrowing goes through it. This is composition: a library *has* items and members, it isn't one.

Write the class **`Library`**. Its constructor takes no arguments. It has these methods:

- **`add_item(item)`** adds a book or a DVD to the library.
- **`add_member(member)`** registers a member.
- **`checkout(member_id, item_id)`**: the member borrows one copy of the item. One copy of the item is checked out, and the item is added to the member's borrowed items.
- **`return_item(member_id, item_id)`**: the member returns the item. The copy goes back to the library, and the item is removed from the member's borrowed items.
- **`print_catalog()`** prints every item in the library, one per line.

Rules:

- If `member_id` or `item_id` doesn't exist, `checkout` and `return_item` raise `NotFoundError`.
- If the member doesn't hold the item they are trying to return, `return_item` raises `InvalidReturnError`.
- `print_catalog()` must **not** check what kind each item is (no `isinstance`, no `type()`). It just calls `describe()` on every item, and each item describes itself correctly. That is polymorphism: the library treats all items the same way, and each one behaves according to its own class.

### Test that:

- After `checkout`, the item is in the member's `borrowed_items` and its available copies went down by one.
- After `return_item`, both changes are undone.
- `checkout` and `return_item` with an unknown member or item raise `NotFoundError`.
- Returning an item the member doesn't hold raises `InvalidReturnError`.
- `print_catalog()` prints one line per item. Use pytest's `capsys` fixture to capture the printed output.

---

## Part 5 — Wrap up

Complete `README.md` in this folder with two short sections:

- **What I learned**: a few sentences.
- **A design decision**: one choice you made that wasn't dictated by the assignment, and why. For example, how `Member` updates its borrowed items, or how `Library` stores items.

---

## Example

When everything is done, this should work:

```python
from library.items import Book, DVD
from library.member import Member
from library.library import Library

lib = Library()
lib.add_item(Book(1, "Dune", 3, "Frank Herbert"))
lib.add_item(DVD(2, "Alien", 1, 117))
lib.add_member(Member(10, "Dana"))

lib.checkout(10, 2)
lib.print_catalog()
# [Book] Dune by Frank Herbert (3/3 available)
# [DVD] Alien, 117 min (0/1 available)

lib.checkout(10, 2)   # raises ItemUnavailableError
```

## Running the tests

From this folder, with the virtual environment active:

```
python -m pytest
```

## Done when

- [ ] All five parts are complete
- [ ] Every "Test that" item has a passing test
- [ ] The example above runs as shown
- [ ] `README.md` is completed
