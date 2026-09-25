# Assignment 02 — Library System (TypeScript)

**Topics:** class inheritance, access modifiers, static members and singletons, `super`, abstract classes, method overloading, interfaces, programming to interfaces

## Introduction

In this assignment you will build the library system from [Assignment 01](../01-library-system-python/ASSIGNMENT.md) again, this time in TypeScript.

The system is the same: the library owns books and DVDs, each in one or more copies. Members borrow copies and return them. The library can print its catalog. This time you will also add two features: searching the library for an item, and reserving a book.

What changes is the language. In Python, most OOP rules are checked while the program runs. TypeScript checks many of them **before** the program runs, when the code is compiled. For example, if a field is `private`, code that tries to read it from outside the class is not just an error at runtime, it doesn't compile at all. So in this assignment, some things are proven not by a test but by showing that wrong code is rejected by the compiler.

The assignment has seven parts. Do them in order, and write the tests for each part before moving to the next one.

Class, interface and method names given in **bold code** are required. Everything else is up to you.

---

## Part 0 — Project setup

Set up a TypeScript project in this folder:

- `package.json` with `typescript` and `vitest` as dev dependencies.
- `tsconfig.json` with `"strict": true`, covering both `src/` and `tests/`.
- Two folders: `src/` for the code and `tests/` for the tests.

Check that `npx tsc --noEmit` and `npx vitest run` both run (with nothing to test yet).

---

## Part 1 — Errors

**File:** `src/errors.ts`

Define four error classes, each extending `Error`:

- **`ItemUnavailableError`**: there are no available copies of the item.
- **`InvalidReturnError`**: the return is not allowed.
- **`NotFoundError`**: no item or member exists with the given ID.
- **`AlreadyReservedError`**: the book is already reserved by someone.

There is nothing to test in this part.

---

## Part 2 — Interfaces

**File:** `src/interfaces.ts`

This part practices **interfaces**.

An interface is a contract. It says what an object can do, without saying how. In Assignment 01, "can be borrowed" was part of the base class. Here you will separate it into its own contract, so that code which only needs to borrow and return things doesn't have to know anything about books or DVDs.

Define the interface **`Borrowable`**, for anything that can be checked out and returned:

```ts
checkout(): void;
returnCopy(): void;
isAvailable(): boolean;
```

Not every item can be reserved; in this library, only books can. Define a second interface **`Reservable`** that **extends** `Borrowable` and adds:

```ts
reserve(memberId: number): void;
readonly reservedBy: number | null;
```

Anything that is `Reservable` is automatically also `Borrowable`.

There is nothing to test in this part. The compiler checks the interfaces when you implement them.

---

## Part 3 — Library items

**File:** `src/items.ts`

This part practices **abstract classes**, **inheritance**, **access modifiers**, **static members** and **`super`**.

### 3a. The base class

Write the abstract class **`LibraryItem`**, which implements `Borrowable`.

- Its constructor is **`constructor(title: string, copies: number)`**. When an item is created, all its copies are available.
- **`id`**: every item gets a unique ID automatically, 1, 2, 3 and so on, in the order the items are created. You can't know the next ID from inside one object, so keep the counter in a **`static`** field: one value shared by the whole class, not stored on each object.
- **`title`** is public and read-only.
- The number of available copies is **`private`**. Code outside the class can't read or change it, and TypeScript enforces this when compiling. Outside code only uses `isAvailable()`.
- The total number of copies is **`protected`**: hidden from outside code, but visible to the subclasses.
- **`checkout()`** lowers the available copies by one. If there are none left, it throws `ItemUnavailableError`.
- **`returnCopy()`** raises the available copies by one. If all copies are already in the library, it throws `InvalidReturnError`.
- **`isAvailable()`** returns whether at least one copy is available.
- **`describe()`** returns the part of the description that every item shares, for example `Dune (2/3 available)`.

The class must be **`abstract`**, so writing `new LibraryItem(...)` is a compile error.

### 3b. The subclasses

Write **`Book`** and **`DVD`**, both extending `LibraryItem`.

- **`new Book(title, copies, author)`** also stores the author.
- **`new DVD(title, copies, minutes)`** also stores the length in minutes.

Each constructor must call **`super(...)`** first, to let the base class set up the shared fields.

Each class overrides `describe()`, but doesn't repeat the shared part. It calls **`super.describe()`** and adds its own details:

```
[Book] Dune (2/3 available) by Frank Herbert
[DVD] Alien (0/1 available), 117 min
```

### 3c. Reserving a book

`Book` also implements **`Reservable`**:

- **`reserve(memberId)`** records which member reserved the book.
- **`reservedBy`** returns that member's ID, or `null` if nobody reserved it.
- Reserving a book that is already reserved throws `AlreadyReservedError`.

`DVD` doesn't implement `Reservable`. Calling `reserve` on a DVD should be a compile error.

### Test that:

- Items get consecutive IDs.
- `checkout()` with no copies left throws `ItemUnavailableError`.
- `returnCopy()` when all copies are in throws `InvalidReturnError`.
- `isAvailable()` becomes `false` after the last copy is checked out.
- `describe()` of a `Book` and of a `DVD` returns the expected text.
- `reserve()` sets `reservedBy`, and reserving again throws `AlreadyReservedError`.

### Prove that these don't compile:

- `new LibraryItem("x", 1)`
- Reading `availableCopies` from outside the class
- Calling `reserve` on a `DVD`

(See **Compile-error checks** at the end.)

---

## Part 4 — Members

**File:** `src/member.ts`

Write the class **`Member`**.

- Its constructor is **`constructor(id: number, name: string)`**. Both are public and read-only.
- It exposes the items the member currently holds as a read-only array, so outside code can't add or remove items directly.

The library will need a way to add an item to a member and remove it. Add whatever methods you think are right for that. This is your design decision.

The tests for this part are written together with Part 5.

---

## Part 5 — The library

**File:** `src/library.ts`

This part practices **singletons**, **method overloading** and **programming to interfaces**.

### 5a. A single library

There is only one library in this system, so the class should make it impossible to create a second one. This is the **singleton** pattern:

- Make the constructor **`private`**, so `new Library()` is a compile error.
- Add **`static getInstance()`**. The first call creates the library, and every later call returns that same object.

### 5b. Managing items and members

Add these methods to **`Library`**:

- **`addItem(item)`** and **`addMember(member)`**.
- **`checkout(memberId, itemId)`**: the member borrows one copy of the item.
- **`returnItem(memberId, itemId)`**: the member returns the item.
- **`printCatalog()`** prints every item's `describe()`, one per line.

The rules are the same as in Assignment 01:

- An unknown member or item ID throws `NotFoundError`.
- Returning an item the member doesn't hold throws `InvalidReturnError`.
- `printCatalog()` does not check what kind each item is (no `instanceof`).

**Programming to interfaces:** the code that actually checks out or returns a copy should treat the item as a **`Borrowable`**, not as a `LibraryItem`, `Book` or `DVD`. For example, write a private helper that takes a `Borrowable` parameter. That way, this code keeps working for any new kind of item that can be borrowed, even one that isn't a `LibraryItem` at all.

### 5c. Searching

Add a method **`find`** that can be called in two ways:

- **`find(id: number)`** returns the item with that ID, or `undefined`.
- **`find(title: string)`** returns all items whose title matches, ignoring case.

This is **method overloading**: two signatures with different parameter and return types, followed by one implementation that checks which kind of argument it got. The caller gets the correct return type for each call.

### A note on testing a singleton

Since there is only one library, anything one test adds to it is still there in the next test. Decide how to deal with that, for example with a reset method used only by tests, and explain your choice in `README.md`.

### Test that:

- `Library.getInstance()` returns the same object every time.
- After `checkout`, the item is in the member's list and is one copy lower. `returnItem` undoes both.
- Unknown IDs throw `NotFoundError`, and returning an item the member doesn't hold throws `InvalidReturnError`.
- `find` by ID and `find` by title both return the right results.
- `printCatalog()` prints one line per item.

### Prove that this doesn't compile:

- `new Library()`

---

## Part 6 — Wrap up

Complete `README.md` in this folder with short sections:

- **What I learned**: a few sentences.
- **Abstract class vs. interface**: this assignment uses both. When would you choose each one?
- **Singleton and tests**: how you kept tests independent, and why.

---

## Compile-error checks

Some rules in this assignment are enforced by the compiler, so a normal test can't check them: the wrong code doesn't compile in the first place. To prove them, create `tests/compile-errors.ts` and put each piece of wrong code on its own line, with this comment above it:

```ts
// @ts-expect-error
new LibraryItem("x", 1);
```

`@ts-expect-error` tells TypeScript: "the next line must be an error". If it is, everything compiles. If one day the line becomes valid, for example because someone made the constructor public, `tsc` fails. That proves the rule is enforced.

## Example

When everything is done, this should work:

```ts
const lib = Library.getInstance();
lib.addItem(new Book("Dune", 3, "Frank Herbert"));   // id 1
lib.addItem(new DVD("Alien", 1, 117));               // id 2
lib.addMember(new Member(10, "Dana"));

lib.checkout(10, 2);
lib.find("dune");      // [Book "Dune"]
lib.find(2);           // DVD "Alien"
lib.printCatalog();
// [Book] Dune (3/3 available) by Frank Herbert
// [DVD] Alien (0/1 available), 117 min

lib.checkout(10, 2);   // throws ItemUnavailableError
```

## Running

```
npx tsc --noEmit     # type check, including the compile-error checks
npx vitest run       # tests
```

## Done when

- [ ] All seven parts are complete
- [ ] Every "Test that" item has a passing test
- [ ] Every "doesn't compile" item has a line in `tests/compile-errors.ts`
- [ ] `npx tsc --noEmit` and `npx vitest run` both pass
- [ ] `README.md` is completed
