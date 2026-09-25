# Assignment 02 — Library System (TypeScript)

**Topics:** class inheritance, access modifiers, static members and singletons, `super`, abstract classes, method overloading, interfaces, programming to interfaces

## Overview

In this assignment you will rebuild the library system from [Assignment 01](../01-library-system-python/ASSIGNMENT.md) in TypeScript. The domain is the same: books and DVDs, members who borrow and return copies, and a printable catalog.

The difference is the language. TypeScript enforces many OOP rules at compile time, so some requirements are proven by showing that invalid code **does not compile**.

## What you need to do

1. Set up a TypeScript project with the file structure below.
2. Implement the interfaces and classes listed under **Required API**, with exactly the names and behavior described.
3. Write runtime tests for every **Rule**, and a compile-error file for every **Compile rule**.
4. After finishing, complete `README.md` with what you learned, including when you would choose an abstract class over an interface.

## File structure (required)

```
02-library-system-ts/
├── src/
│   ├── errors.ts        # error classes
│   ├── interfaces.ts    # Borrowable, Reservable
│   ├── items.ts         # LibraryItem, Book, DVD
│   ├── member.ts        # Member
│   └── library.ts       # Library
├── tests/
│   ├── library.test.ts
│   └── compile-errors.ts
├── package.json
├── tsconfig.json        # "strict": true
├── ASSIGNMENT.md
└── README.md
```

## Required API

### `errors.ts`

Four classes extending `Error`: `ItemUnavailableError`, `InvalidReturnError` and `NotFoundError` (same meaning as in Assignment 01), and `AlreadyReservedError`.

### `interfaces.ts`

```ts
interface Borrowable {
  checkout(): void;
  returnCopy(): void;
  isAvailable(): boolean;
}

interface Reservable extends Borrowable {
  reserve(memberId: number): void;
  readonly reservedBy: number | null;
}
```

### `items.ts`

**`abstract class LibraryItem implements Borrowable`**

| Member | Description |
|--------|-------------|
| `readonly id: number` | Assigned automatically from a **static** counter: 1, 2, 3… |
| `constructor(readonly title: string, protected readonly totalCopies: number)` | All copies start as available. |
| `private availableCopies: number` | |
| `checkout()`, `returnCopy()`, `isAvailable()` | Implement `Borrowable`. |
| `protected abstract readonly kind: string` | `"Book"` or `"DVD"`, set by the subclass. |
| `describe(): string` | Returns e.g. `[Book] Dune (2/3 available)`. |

- **Compile rule:** `new LibraryItem(...)` does not compile.
- **Compile rule:** Reading or writing `item.availableCopies` from outside the class does not compile.
- **Rule:** `checkout()` throws `ItemUnavailableError` when no copies are available. `returnCopy()` throws `InvalidReturnError` when all copies are already available.
- **Rule:** Items get consecutive IDs.

**`class Book extends LibraryItem implements Reservable`**
Constructor: `new Book(title, copies, author)`.

- The constructor calls `super(...)`. `describe()` returns `super.describe()` plus the author: `[Book] Dune (2/3 available) by Frank Herbert`.
- **Rule:** `reserve(memberId)` records the reservation in `reservedBy`. Reserving an item that is already reserved throws `AlreadyReservedError`.

**`class DVD extends LibraryItem`**
Constructor: `new DVD(title, copies, minutes)`. `describe()` builds on `super.describe()` and adds the duration.

### `member.ts`

**`class Member`**: `constructor(readonly id: number, readonly name: string)`, plus a read-only list of borrowed items (`readonly LibraryItem[]`).

### `library.ts`

**`class Library`** — a singleton.

| Member | Description |
|--------|-------------|
| `private constructor()` | |
| `static getInstance(): Library` | Always returns the same instance. |
| `addItem(item: LibraryItem): void` | |
| `addMember(member: Member): void` | |
| `find(id: number): LibraryItem \| undefined`<br>`find(title: string): LibraryItem[]` | Two overload signatures, one implementation. Title search is case-insensitive. |
| `checkout(memberId: number, itemId: number): void` | |
| `returnItem(memberId: number, itemId: number): void` | |
| `printCatalog(): void` | Prints `describe()` of every item, one per line. |

- **Compile rule:** `new Library()` does not compile.
- **Rule:** `Library.getInstance() === Library.getInstance()`.
- **Rule:** `checkout` and `returnItem` behave as in Assignment 01: unknown IDs throw `NotFoundError`; returning an item the member does not hold throws `InvalidReturnError`.
- **Rule:** The code that performs the checkout and return on an item must use it only through the `Borrowable` type, not `LibraryItem`, `Book` or `DVD`.
- **Rule:** `printCatalog` does not check item types (no `instanceof`).

## What you decide yourself

- How `Library` stores items and members internally.
- How `Member` updates its borrowed list. You may add methods for this.
- How to keep singleton state from leaking between tests (for example a reset method used only in tests). Explain your choice in `README.md`.
- Any extra helpers, as long as the required API exists unchanged.

## Example

```ts
const lib = Library.getInstance();
lib.addItem(new Book("Dune", 3, "Frank Herbert"));   // id 1
lib.addItem(new DVD("Alien", 1, 117));               // id 2
lib.addMember(new Member(10, "Dana"));

lib.checkout(10, 2);
lib.find("dune");        // [Book]
lib.find(2);             // DVD
lib.checkout(10, 2);     // throws ItemUnavailableError
```

## Testing and running

- Node 20+, TypeScript with `"strict": true`, tests with Vitest.
- `npx tsc --noEmit` must pass, and `npx vitest run` must pass.
- `tests/compile-errors.ts` contains one line per **Compile rule**, each preceded by `// @ts-expect-error`. If the invalid code ever compiles, `tsc` fails, which proves the rule.

## Submission checklist

- [ ] File structure matches the one above
- [ ] Every interface, class and method in the Required API exists with the given name and signature
- [ ] Every Rule has a passing test, and every Compile rule has a line in `compile-errors.ts`
- [ ] `tsc --noEmit` and `vitest run` both pass
- [ ] `README.md` is completed
