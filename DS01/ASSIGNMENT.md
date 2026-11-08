# Assignment DS01 — Linked List (C++)

**Topics:** pointers, `nullptr`, dynamic allocation with `new` and `delete`, singly linked lists, head and tail pointers, a class that owns memory, destructors, deleted copy operations, exceptions, `std::optional`, in-place reversal, testing against a model

## Introduction

In this assignment you will build a **singly linked list** of integers in C++. Each element lives in its own **node**, and each node holds a value and a **pointer** to the next node. The list itself only remembers where the first node is, and where the last one is.

You met linked lists in Python and TypeScript, where the language frees memory for you. In C++ it doesn't. Every node you create with `new` must be destroyed with exactly one `delete`, at the right moment:

- Forget it, and the memory **leaks**.
- Do it twice, or use a node after deleting it, and the program has **undefined behavior**: it may crash, return garbage, or seem to work and fail later somewhere else.

The data structure is simple on purpose. The real subject is **ownership**: the list owns its nodes, so it is responsible for creating them, connecting them, and freeing them, in every operation and when the list itself goes away.

You will check all of this with the tools from TOOL01: strict warnings, UndefinedBehaviorSanitizer and `leaks` on the Mac, and AddressSanitizer in the Linux container. **Do TOOL01 first.** This project starts from its template.

The assignment has eight parts. Do them in order, and write the tests for each part before moving to the next one.

Class, function and file names given in **bold code** are required. Everything else is up to you.

### Learning outcomes

By the end of this assignment you can:

1. Explain what a pointer is, what `nullptr` means, and what `->` does.
2. Allocate an object with `new`, free it with `delete`, and explain what goes wrong when one of them is missing or happens twice.
3. Implement a singly linked list with head and tail pointers, and keep both correct in every operation, including the edge cases of an empty list and a list of one.
4. Write a class that owns memory: free everything in its destructor, and forbid copying it until you know how to copy it correctly.
5. Report errors with exceptions, and an absent result with `std::optional`.
6. Reverse a linked list in place by relinking its nodes.
7. Find memory bugs with sanitizers and a leak checker, and find logic bugs by comparing your structure against a model.

---

## Reading

### Before you start

The goal here is to know the vocabulary and the shape of each problem before you write code, not to know the solution.

1. **Learn C++ — [12.7 Introduction to pointers](https://www.learncpp.com/cpp-tutorial/introduction-to-pointers/)** and **[12.8 Null pointers](https://www.learncpp.com/cpp-tutorial/null-pointers/)**
   What a pointer holds, how `*` and `&` work, and why a pointer that points nowhere must be `nullptr` and must be checked before use.
   *All parts.*
2. **Learn C++ — [13.12 Member selection with pointers and references](https://www.learncpp.com/cpp-tutorial/member-selection-with-pointers-and-references/)**
   `node->next` as a short way to write `(*node).next`.
   *All parts.*
3. **Learn C++ — [19.1 Dynamic memory allocation with new and delete](https://www.learncpp.com/cpp-tutorial/dynamic-memory-allocation-with-new-and-delete/)**
   Creating an object that outlives the function that created it, freeing it, dangling pointers, and memory leaks.
   *Parts 1–4.*
4. **Learn C++ — [15.2 Classes and header files](https://www.learncpp.com/cpp-tutorial/classes-and-header-files/)** and **[15.4 Introduction to destructors](https://www.learncpp.com/cpp-tutorial/introduction-to-destructors/)**
   How to split a class between a header and a source file, and the function that runs automatically when an object is destroyed.
   *Part 1.*
5. **MIT 6.006 (Spring 2020) — [Lecture 2: Data Structures](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/mit6_006s20_lec2/)**, lecture notes, the section "Linked List Sequence".
   The linked list as a data structure, independent of any language: nodes and next pointers, a head pointer, and the cost of each operation compared with an array.
   *Parts 1–4.*
6. **[Open Data Structures (C++ edition) — 3.1 SLList: A Singly-Linked List](https://opendatastructures.org/ods-cpp/3_Linked_Lists.html)** by Pat Morin (free).
   A singly linked list with a head and a tail, and its push, pop and add operations, with diagrams.
   *Parts 1–3.*
7. **Learn C++ — [27.2 Basic exception handling](https://www.learncpp.com/cpp-tutorial/basic-exception-handling/)** and **[12.15 std::optional](https://www.learncpp.com/cpp-tutorial/stdoptional/)**
   `throw`, `try` and `catch`, and a type for "a value, or nothing".
   *Parts 1, 4 and 5.*
8. **Learn C++ — [14.14 Introduction to the copy constructor](https://www.learncpp.com/cpp-tutorial/introduction-to-the-copy-constructor/)**, **[11.4 Deleting functions](https://www.learncpp.com/cpp-tutorial/deleting-functions/)** and **[21.13 Shallow vs. deep copying](https://www.learncpp.com/cpp-tutorial/shallow-vs-deep-copying/)**
   What C++ does when an object is copied, why the default copy is wrong for a class that owns memory, and how to forbid copying with `= delete`. The last one ends with the "rule of three".
   *Part 7.*
9. **Learn C++ — [8.14 Generating random numbers using Mersenne Twister](https://www.learncpp.com/cpp-tutorial/generating-random-numbers-using-mersenne-twister/)**
   `std::mt19937` with a fixed seed, and `std::uniform_int_distribution` for a number in a range.
   *Part 8.*

### Going deeper

The sources this assignment is based on:

- **[MIT 6.006 (Spring 2020)](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/)**, Lecture 2 "Data Structures".
- **[Open Data Structures](https://opendatastructures.org/)** by Pat Morin, chapter 3 "Linked Lists".
- **[Learn C++](https://www.learncpp.com/)**, chapters 12, 15 and 19 on pointers, classes and dynamic memory.

More on linked lists:

- **[Open Data Structures — 3.2 DLList: A Doubly-Linked List](https://opendatastructures.org/ods-cpp/3_Linked_Lists.html)**. Each node also points back to the previous one, so removing from the end becomes cheap. The same chapter's 3.3 stores several elements per node, to use memory better.
- **[cppreference — `std::forward_list`](https://en.cppreference.com/w/cpp/container/forward_list)**. The standard library's singly linked list. Compare its interface with yours, for example why it has `insert_after` and no `push_back`.

Ownership in C++:

- **Learn C++ — chapter 22, "Move Semantics and Smart Pointers"**. `std::unique_ptr`, which frees memory automatically, and moving an object instead of copying it. This is project MEM02.

---

## Part 0 — Project setup

Create this project from the TOOL01 template, following the steps you wrote in TOOL01's `README.md`:

- The library is called **`intlist`**, in the namespace **`intlist`**, with its header at **`include/intlist/intlist.h`** and its source at **`src/intlist.cpp`**.
- The test executable is **`intlist_tests`**, built from **`tests/intlist_test.cpp`**.
- Drop TOOL01's text functions, `demo` program and `build-by-hand.sh` script. Keep everything else: the warnings, both sanitizer options, the `dev` and `linux-asan` presets, `check-leaks.sh`, `check-asan.sh`, the `Dockerfile`, and the build-config test.

Check that `ctest --preset dev`, `./scripts/check-leaks.sh` and `./scripts/check-asan.sh` all run.

---

## Part 1 — Nodes, `push_front`, and the destructor

**Files:** `include/intlist/intlist.h`, `src/intlist.cpp`

### Pointers and nodes

A pointer is a variable that holds the address of another object. `nullptr` is the pointer that points to nothing. `p->field` reads a field of the object `p` points to. A node is a small struct with a value and a pointer to the next node, and the last node's pointer is `nullptr`.

Walking a list means following the pointers until you reach `nullptr`. On an unrelated example, a chain of train cars:

```cpp
struct Car {
    int passengers;
    Car* next;
};

int count_passengers(const Car* first) {
    int total = 0;
    for (const Car* car = first; car != nullptr; car = car->next) {
        total += car->passengers;
    }
    return total;
}
```

### Creating and freeing nodes

`new Car{12, nullptr}` creates a car on the **heap**, memory that stays allocated until you free it, and returns a pointer to it. `delete car` destroys it and frees the memory. After `delete`, the pointer still holds the old address, but using it is undefined behavior. So if you need the next car, read `car->next` **before** you delete `car`:

```cpp
void delete_train(Car* first) {
    while (first != nullptr) {
        Car* next = first->next;   // read it while the car still exists
        delete first;
        first = next;
    }
}
```

### The class

Write the class **`IntList`**:

- A **private** nested struct `Node`, with an `int` value and a `Node*` next pointer. Code outside the class never sees a node.
- Three private fields: a pointer to the first node (the **head**), a pointer to the last node (the **tail**), and the size, of type `std::size_t`. An empty list has both pointers set to `nullptr` and size 0. Give them these values where you declare them, so the default constructor `IntList() = default;` is enough.
- **`std::size_t size() const`** and **`bool empty() const`**. `const` after a method means it doesn't change the list.
- **`void push_front(int value)`**: adds a value at the front.
- **`int front() const`**: the first value. On an empty list it throws **`std::out_of_range`** (from `<stdexcept>`), with a short message: `throw std::out_of_range("front of empty list");`.
- **`std::vector<int> to_vector() const`**: all values, from front to back. It's how tests check the whole list in one comparison.
- **`~IntList()`**: the **destructor**. It runs automatically when a list is destroyed, for example at the end of the function that declared it. It must `delete` every node.

The tail matters from Part 2 on, but keep it correct from the start: when `push_front` adds to an empty list, the new node is also the last one.

### Test that:

Write all tests in `tests/intlist_test.cpp`.

- A new list has size 0, is empty, and `to_vector()` is `{}`.
- After `push_front` of 3, then 2, then 1, `to_vector()` is `{1, 2, 3}`, the size is 3 and `front()` is 1.
- `front()` on an empty list throws `std::out_of_range`. Use `EXPECT_THROW(expression, std::out_of_range)`.
- A list with 10,000 values pushed onto it is destroyed at the end of the test. The test itself only checks the size. `./scripts/check-leaks.sh` is what proves the destructor freed every node.

From this part on, run `./scripts/check-leaks.sh` and `./scripts/check-asan.sh` after every part, not only `ctest`. Most bugs in this assignment pass the tests and are found only by these two.

---

## Part 2 — The tail: `push_back` and `back`

**File:** `src/intlist.cpp`

Add:

- **`void push_back(int value)`**: adds a value at the end, without walking the list. That's what the tail pointer is for.
- **`int back() const`**: the last value. On an empty list it throws `std::out_of_range`.

Adding at the end means: create the node, connect the current last node to it, and move the tail to it. On an empty list there is no last node to connect, and the new node becomes the head as well.

### Test that:

- `push_back` of 1 and 2, then `push_front` of 0, then `push_back` of 3: `to_vector()` is `{0, 1, 2, 3}` and `back()` is 3.
- A list of one value has the same `front()` and `back()`, whether the value was added with `push_back` or with `push_front`.
- `back()` on an empty list throws `std::out_of_range`.

---

## Part 3 — Removing from the front, and `clear`

**File:** `src/intlist.cpp`

Add:

- **`int pop_front()`**: removes the first value and returns it. On an empty list it throws `std::out_of_range`.
- **`void clear()`**: removes every value. The list stays usable afterwards.

The destructor and `clear` do the same work. Write it once, and call it from the other.

The edge case to watch in `pop_front` is removing the **last remaining** node. After that the list is empty, so the head *and* the tail must both be `nullptr`. If the tail still points to the deleted node, the next `push_back` writes into freed memory.

### Test that:

- `pop_front` returns 1, 2 and 3 in that order from a list built with `push_back` of 1, 2, 3, and the list is empty afterwards. Then `pop_front` throws `std::out_of_range`.
- `push_back(1)`, `pop_front()`, then `push_back(2)`: `to_vector()` is `{2}`, and both `front()` and `back()` are 2.
- `clear` empties a list of five values, after which `back()` throws, `push_back` works again, and calling `clear` twice in a row is safe.

---

## Part 4 — Access by position

**File:** `src/intlist.cpp`

Positions are counted from 0, like array indexes. Add:

- **`int at(std::size_t index) const`**: the value at `index`. Throws `std::out_of_range` if `index` is not less than `size()`.
- **`void insert_at(std::size_t index, int value)`**: inserts `value` so that it ends up at position `index`. `index` can be anything from 0 to `size()`: 0 is the front, `size()` is the end. Anything larger throws `std::out_of_range`.
- **`int remove_at(std::size_t index)`**: removes the value at `index` and returns it. Throws `std::out_of_range` if `index` is not less than `size()`.

In a singly linked list you can only change the node *after* one you are holding, so inserting or removing at `index` means walking to the node at `index - 1` first. Position 0 has no node before it, so handle it as a separate case. You already have code for both ends: `push_front`, `push_back` and `pop_front`.

When `remove_at` removes the last node, the node before it becomes the new tail.

### Test that:

- On the list `{10, 20, 30}`, `at(0)` is 10 and `at(2)` is 30, and `at(3)` throws `std::out_of_range`.
- Starting from an empty list, `insert_at(0, 2)`, `insert_at(0, 1)`, `insert_at(2, 4)` and `insert_at(2, 3)` give `{1, 2, 3, 4}`, and `back()` is 4. `insert_at(6, 0)` throws.
- On `{1, 2, 3, 4, 5}`, `remove_at(4)` returns 5 and `back()` becomes 4. Then `remove_at(1)` returns 2 and `remove_at(0)` returns 1, leaving `{3, 4}`. `remove_at(2)` throws. Then `push_back(6)` gives `{3, 4, 6}`, which proves the tail was updated.

---

## Part 5 — Searching

**File:** `src/intlist.cpp`

Add:

- **`std::optional<std::size_t> find(int value) const`**: the position of the **first** node with this value, or `std::nullopt` if there is none.
- **`bool contains(int value) const`**.
- **`bool remove_first(int value)`**: removes the first node with this value and returns `true`, or returns `false` if there is none.

`std::optional<T>` (from `<optional>`) holds either a `T` or nothing. It says in the type that a result may be missing, so the caller can't forget to check, which `-1` or a special value can't do. On an unrelated example:

```cpp
std::optional<int> parse_digit(char c) {
    if (c >= '0' && c <= '9') {
        return c - '0';
    }
    return std::nullopt;
}

if (auto digit = parse_digit('7')) {   // true when there is a value
    use(*digit);                       // *digit reads the value
}
```

In a test, `EXPECT_EQ(list.find(7), 1u)` compares the optional to a value, and `EXPECT_EQ(list.find(9), std::nullopt)` checks that it's empty. The `u` makes `1` an unsigned number, the same kind as `std::size_t`, which `-Werror` would otherwise reject.

### Test that:

- In `{5, 7, 5}`, `find(5)` is 0 (the first one), `find(7)` is 1, and `find(9)` is `std::nullopt`. `contains(7)` is `true` and `contains(9)` is `false`.
- In `{5, 7, 5}`, `remove_first(5)` returns `true` and leaves `{7, 5}`. `remove_first(9)` returns `false`. `remove_first(5)` again returns `true`, and `back()` is then 7.

---

## Part 6 — Reversing in place

**File:** `src/intlist.cpp`

Add **`void reverse()`**: reverses the order of the values **by relinking the nodes**. It doesn't create or delete any node, and doesn't copy values into another container.

Walk the list once, and at each node turn its `next` pointer around to point at the node before it. You need three pointers while walking: the previous node, the current one, and the next one, because changing `current->next` loses the only way forward. Draw it on paper first, for a list of three nodes. At the end, the old tail is the new head, and the old head is the new tail.

### Test that:

- `{1, 2, 3, 4}` becomes `{4, 3, 2, 1}`, with `front()` 4 and `back()` 1. After `push_back(0)` it is `{4, 3, 2, 1, 0}`.
- Reversing an empty list and a list of one value works and changes nothing.

---

## Part 7 — Forbidding copies

**File:** `include/intlist/intlist.h`

When a C++ object is copied, by default every field is copied as it is. For `IntList`, that copies the head and tail **pointers**, not the nodes. The two lists then share the same nodes, and when both are destroyed, each one deletes them: every node is deleted twice. This is the problem the "rule of three" in the reading is about.

Copying a list correctly means creating a new node for every value. That's part of MEM01. For now, make copying impossible, so the bug can't happen. Declare the copy constructor and the copy assignment operator as deleted:

```cpp
IntList(const IntList&) = delete;
IntList& operator=(const IntList&) = delete;
```

### Test that:

A test that copies a list wouldn't compile, so this is checked at compile time with `static_assert`, which fails the build if its condition is false. Add these two lines at the top of `tests/intlist_test.cpp`, after the includes (`std::is_copy_constructible_v` comes from `<type_traits>`):

```cpp
static_assert(!std::is_copy_constructible_v<intlist::IntList>);
static_assert(!std::is_copy_assignable_v<intlist::IntList>);
```

---

## Part 8 — Testing against a model

**File:** `tests/intlist_test.cpp`

Hand-written tests check the cases you thought of. The bugs in a linked list are usually in the cases you didn't: a tail that isn't updated after one particular sequence of operations. A **model test** catches those. It runs a long random sequence of operations on your list and, at the same time, on a structure that is already known to be correct, and checks after every step that the two agree. Here the model is `std::vector<int>`.

Write the test **`Model.AgreesWithVector`**:

1. Create a `std::mt19937` with the seed **7**, so the sequence is the same on every run, an `IntList`, and a `std::vector<int>`.
2. Repeat **5,000** times: pick an operation number from 0 to 7, and a value from 0 to 20, with `std::uniform_int_distribution<int>`, and apply the operation to both:

   | # | List | Vector |
   |---|------|--------|
   | 0 | `push_front(value)` | `insert(begin(), value)` |
   | 1 | `push_back(value)` | `push_back(value)` |
   | 2 | if not empty: `pop_front()`, which must return the vector's first value | `erase(begin())` |
   | 3 | `insert_at(i, value)`, with a random `i` from 0 to the size | `insert(begin() + i, value)` |
   | 4 | if not empty: `remove_at(i)`, with a random `i` from 0 to size − 1, which must return the vector's value at `i` | `erase(begin() + i)` |
   | 5 | `remove_first(value)`, which must return whether the vector contains the value | erase the first match, found with `std::find` |
   | 6 | `reverse()` | `std::reverse(begin(), end())` |
   | 7 | with probability 1 in 51 (a random number from 0 to 50 is 0): `clear()` | `clear()` |

3. After every step, check with `ASSERT_EQ` that the sizes are equal, and if the vector isn't empty, that `front()` and `back()` equal the vector's first and last values.
4. At the end, check that `to_vector()` equals the vector.

`ASSERT_EQ` stops the test at the first difference, instead of reporting thousands of failures after it. `std::find` and `std::reverse` come from `<algorithm>`. Under `-Wconversion`, adding a `std::size_t` to an iterator needs an explicit conversion: `begin() + static_cast<std::ptrdiff_t>(i)`.

Checking `front()` and `back()` after every step is what catches tail bugs: a wrong tail usually shows up in `back()` long before it corrupts the list.

### Check that:

- `ctest --preset dev` passes all the tests.
- `./scripts/check-leaks.sh` reports no leaks.
- `./scripts/check-asan.sh` passes all the tests, with no AddressSanitizer report.

---

## Running

```
cmake --preset dev && cmake --build --preset dev && ctest --preset dev   # build and test on the Mac
./scripts/check-leaks.sh                                                 # memory leaks, on the Mac
./scripts/check-asan.sh                                                  # full memory check, in the container
```
