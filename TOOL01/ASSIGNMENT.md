# Assignment TOOL01 — C++ Build and Test Setup (C++ · CMake)

**Topics:** the C++ compilation model, header and source files, compiling and linking, object files and symbols, CMake targets and usage requirements, compiler warnings, GoogleTest and CTest, CMake presets, sanitizers, leak checking, a Linux build container

## Introduction

In Python you run `python file.py`, and in TypeScript `npx vitest run`. In C++ there is no such single step. Before a program runs, a **compiler** turns each source file into an **object file** of machine code, and a **linker** combines the object files and libraries into one executable. When something goes wrong, the error message comes from one of these two stages, and they mean different things.

Real C++ projects don't run these tools by hand. A **build system** describes the project once, and works out what to compile and link. Here you'll use **CMake**, the most common one.

C++ also lets you write code that compiles, runs, and is still wrong: reading memory that has already been freed, writing past the end of an array, or forgetting to free memory at all. Nothing stops the program, and the bug may only show up much later as a crash or as wrong data. **Sanitizers** are compiler features that add checks to the program, so it stops with a clear report at the moment the bug happens.

This assignment builds a very small library of text functions. The functions are deliberately simple: the work is everything around them. At the end you will have a project template that every later C++ project in this repository starts from: DS01, MEM01, MEM02, CONC03, NET02 and SEC03.

The assignment has nine parts. Do them in order.

File, target, function and preset names given in **bold code** are required. Everything else is up to you.

### Learning outcomes

By the end of this assignment you can:

1. Explain what the compiler does and what the linker does, and tell a compile error from a link error by its message.
2. Split C++ code into a header and a source file, and explain why the header has declarations and the source file has definitions.
3. Describe a C++ project in CMake with library and executable targets, and explain what `PUBLIC` and `PRIVATE` mean on a target.
4. Turn on strict compiler warnings, as errors, for your own code only.
5. Write unit tests with GoogleTest and run them through CTest.
6. Explain what AddressSanitizer, UndefinedBehaviorSanitizer and a leak checker each catch, and run all three.
7. Start a new C++ project from this template.

### AddressSanitizer on your machine

On macOS 26 with Apple's compiler, programs built with AddressSanitizer currently hang as soon as they start, even an empty one. UndefinedBehaviorSanitizer works normally. Because of this, the project uses two environments:

- **On the Mac**, for everyday work: building, tests, UndefinedBehaviorSanitizer, and Apple's `leaks` tool for memory leaks (Parts 2–6).
- **In a Linux container**, for the full memory check: AddressSanitizer, which on Linux also detects leaks (Part 7).

Both run the same code and the same tests.

---

## Reading

### Before you start

The goal here is to know the vocabulary and the shape of each problem before you write anything, not to know the solution.

1. **Learn C++ — [0.5 Introduction to the compiler, linker, and libraries](https://www.learncpp.com/cpp-tutorial/introduction-to-the-compiler-linker-and-libraries/)**
   The two stages of a build: compiling each `.cpp` file into an object file, then linking. Also what a library is.
   *Parts 1 and 2.*
2. **Learn C++ — [2.8 Programs with multiple code files](https://www.learncpp.com/cpp-tutorial/programs-with-multiple-code-files/)**, **[2.11 Header files](https://www.learncpp.com/cpp-tutorial/header-files/)** and **[2.12 Header guards](https://www.learncpp.com/cpp-tutorial/header-guards/)**
   Why a function used in one file and defined in another needs a declaration, what `#include` actually does, and why a header must be protected from being included twice.
   *Part 1.*
3. **Learn C++ — [5.7 Introduction to std::string](https://www.learncpp.com/cpp-tutorial/introduction-to-stdstring/)**, **[5.8 Introduction to std::string_view](https://www.learncpp.com/cpp-tutorial/introduction-to-stdstring_view/)**, **[12.6 Pass by const lvalue reference](https://www.learncpp.com/cpp-tutorial/pass-by-const-lvalue-reference/)** and **[16.2 Introduction to std::vector](https://www.learncpp.com/cpp-tutorial/introduction-to-stdvector-and-list-constructors/)**
   The C++ you need for the library: owning strings, read-only views of strings, passing a large object without copying it, and a growable array. Use **[cppreference — `std::basic_string_view`](https://en.cppreference.com/w/cpp/string/basic_string_view)** as the reference for `find`, `find_first_not_of`, `find_last_not_of` and `substr`.
   *Part 1.*
4. **CMake tutorial — [Step 1: Getting Started with CMake](https://cmake.org/cmake/help/latest/guide/tutorial/Getting%20Started%20with%20CMake.html)**
   A first `CMakeLists.txt`: a project, an executable, a library, and building in a separate directory.
   *Part 2.*
5. **CMake tutorial — [Step 4: In-Depth CMake Target Commands](https://cmake.org/cmake/help/latest/guide/tutorial/In-Depth%20CMake%20Target%20Commands.html)**
   `target_include_directories`, `target_compile_options` and `target_link_libraries`, and how a target passes requirements on to the targets that use it.
   *Parts 2 and 3.*
6. **GoogleTest — [Quickstart: Building with CMake](https://google.github.io/googletest/quickstart-cmake.html)** and **[GoogleTest Primer](https://google.github.io/googletest/primer.html)**
   Getting GoogleTest into a CMake project, and writing tests: `TEST`, `EXPECT_EQ`, and the difference between `EXPECT_*` and `ASSERT_*`.
   *Part 4.*
7. **CMake tutorial — [Step 8: Testing and CTest](https://cmake.org/cmake/help/latest/guide/tutorial/Testing%20and%20CTest.html)**
   How CMake registers tests and how `ctest` runs them.
   *Part 4.*
8. **[cmake-presets(7)](https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html)**, the sections on configure, build and test presets.
   Saving a build configuration in a file, so it's one command instead of a list of options.
   *Part 5.*
9. **Clang — [UndefinedBehaviorSanitizer](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html)** and **[AddressSanitizer](https://clang.llvm.org/docs/AddressSanitizer.html)**, the introduction and "Usage" of each.
   What each sanitizer detects, how to turn it on, and what its reports look like.
   *Parts 5 and 7.*
10. **`man leaks`**, in the terminal: the description of `-atExit` and the "EXIT STATUS" section.
    Apple's leak checker, and the exit codes that tell a script whether it found leaks.
    *Part 6.*

### Going deeper

The sources this assignment is based on:

- **[Learn C++](https://www.learncpp.com/)**, chapters 0 and 2: the compilation model and multi-file programs.
- **[CMake tutorial](https://cmake.org/cmake/help/latest/guide/tutorial/index.html)**, Steps 1, 4 and 8, and the rest of it for packaging and installing.
- **[MIT — The Missing Semester of Your CS Education](https://missing.csail.mit.edu/)**, the lectures "Development Environment and Tools", "Debugging and Profiling" and "Packaging and Shipping Code".

How builds work underneath:

- ***Computer Systems: A Programmer's Perspective*, 3rd ed.** by Bryant and O'Hallaron, chapter 7 "Linking" (not free). What is inside an object file, how the linker resolves symbols, and static vs. shared libraries.
- **[Compiler Explorer](https://godbolt.org/)**. Paste a function and see the machine code the compiler produces for it.

CMake:

- **[An Introduction to Modern CMake](https://cliutils.gitlab.io/modern-cmake/)** (free). The "targets, not variables" style this assignment uses, in more depth.
- ***Professional CMake*** by Craig Scott (not free). The complete reference, by one of CMake's maintainers.
- **[CMake — FetchContent](https://cmake.org/cmake/help/latest/module/FetchContent.html)** and **[GoogleTest module](https://cmake.org/cmake/help/latest/module/GoogleTest.html)**. The two modules used in Part 4.

Compilers:

- **[Clang — Diagnostic flags](https://clang.llvm.org/docs/DiagnosticsReference.html)**. What every `-W` warning catches.

---

## Part 0 — The tools

Check that the tools are installed and print their versions:

```
clang++ --version
cmake --version
docker --version
```

`clang++` comes with Apple's Command Line Tools, `cmake` is installed with Homebrew (`brew install cmake`), and `docker` comes with Docker Desktop, which must be running for Part 7.

Then compile and run a one-line program by hand, to see the compiler work:

```cpp
// hello.cpp
#include <iostream>

int main() {
    std::cout << "hello\n";
    return 0;
}
```

```
clang++ -std=c++20 hello.cpp -o hello
./hello
```

`-std=c++20` selects the version of the C++ language, and `-o hello` names the output file. Delete `hello.cpp` and `hello` when you are done: they are not part of the project.

---

## Part 1 — Compiling and linking by hand

**Files:** `include/textutil/textutil.h`, `src/textutil.cpp`, `app/main.cpp`, `scripts/build-by-hand.sh`

### Header and source files

C++ compiles every `.cpp` file separately. A file that calls a function defined in another file still has to know that the function exists and what its types are. It learns this from a **declaration**: the function's signature, without a body. Declarations go in a **header file** (`.h`), which other files `#include`. The **definitions**, with the bodies, go in a source file (`.cpp`). On an unrelated example:

```cpp
// include/geometry/geometry.h
#pragma once

namespace geometry {
double circle_area(double radius);
}
```

```cpp
// src/geometry.cpp
#include "geometry/geometry.h"

namespace geometry {
double circle_area(double radius) {
    return 3.14159 * radius * radius;
}
}
```

- `#pragma once` stops the header from being included twice into the same file. It does the same job as the header guards in the reading, in one line.
- A **namespace** groups names, so the function is called `geometry::circle_area` and can't clash with another `circle_area`.
- The header lives in `include/<library name>/`, so code includes it as `"geometry/geometry.h"`. The library name in the path makes it clear where the header comes from.

### The library

Write the library **`textutil`**, in the namespace **`textutil`**, with three functions:

- **`std::string trim(std::string_view text)`**: returns `text` without spaces, tabs (`\t`) and newlines (`\n`) at its start and end. A text made only of those characters, or an empty text, becomes `""`.
- **`std::vector<std::string> split(std::string_view text, char separator)`**: splits `text` at every `separator` and returns the parts in order, **keeping empty parts**. `split("a,,b", ',')` is `{"a", "", "b"}`, `split(",a,", ',')` is `{"", "a", ""}`, `split("abc", ',')` is `{"abc"}`, and `split("", ',')` is `{""}`.
- **`std::string join(const std::vector<std::string>& parts, std::string_view separator)`**: puts the parts together with `separator` between each two. An empty vector gives `""`.

`std::string_view` is a read-only view of characters that someone else owns, so passing it doesn't copy anything. Use its `find_first_not_of`, `find_last_not_of`, `find` and `substr` (reading item 3). `std::string_view::npos` is the value `find` returns when it finds nothing. To turn a `string_view` into an owned `std::string`, write `std::string(view)`.

The parameter of `join` is a `const` reference (`const std::vector<std::string>&`): the function reads the vector the caller already has, instead of copying it.

### The program

`app/main.cpp` is a small program that uses the library: it trims `"  red,green,blue  "`, splits it at the commas, joins the parts with `" | "`, and prints the result with `std::cout`, which gives `red | green | blue`.

### Building it by hand

Write **`scripts/build-by-hand.sh`**, a shell script that builds the program with three commands, one per stage:

1. Compile `src/textutil.cpp` to `build/by-hand/textutil.o`.
2. Compile `app/main.cpp` to `build/by-hand/main.o`.
3. Link the two object files into `build/by-hand/demo`.

`-c` tells `clang++` to compile only, and to write an object file instead of linking. `-I include` tells it where to look for headers, so that `#include "textutil/textutil.h"` is found. Compile with `-std=c++20 -Wall -Wextra`, and create the output folder first with `mkdir -p`. Make the script executable with `chmod +x`.

`nm -C build/by-hand/textutil.o` lists the **symbols** in an object file: names of functions it defines (marked `T`) and functions it uses but expects someone else to define (marked `U`). The linker's job is to match every `U` with a `T`.

### Check that:

- `./scripts/build-by-hand.sh` followed by `./build/by-hand/demo` prints `red | green | blue`.
- `nm -C build/by-hand/textutil.o` shows `textutil::trim`, `textutil::split` and `textutil::join` with `T`.

---

## Part 2 — A CMake project

**File:** `CMakeLists.txt`

CMake works with **targets**: a library or an executable, each with its own sources, include directories and options. A target can **link** to another target, and then it receives what that target says its users need.

Write `CMakeLists.txt`:

1. `cmake_minimum_required(VERSION 3.25)` and a `project` named **`textutil`**, with `LANGUAGES CXX`.
2. C++20 for the whole project: set `CMAKE_CXX_STANDARD` to `20`, `CMAKE_CXX_STANDARD_REQUIRED` to `ON`, and `CMAKE_CXX_EXTENSIONS` to `OFF`, so the compiler uses standard C++ and not its own dialect.
3. Set `CMAKE_EXPORT_COMPILE_COMMANDS` to `ON`. CMake then writes `compile_commands.json` into the build folder: the exact compiler command for every file, which editors use to understand the code.
4. A library target **`textutil`** built from `src/textutil.cpp`, with `include` as a **`PUBLIC`** include directory.
5. An executable target **`demo`** built from `app/main.cpp`, linked to `textutil`.

**`PUBLIC` and `PRIVATE`** say who an option is for. `PRIVATE` means only this target uses it. `PUBLIC` means this target uses it, *and* every target that links to it gets it too. The include directory is `PUBLIC` because code that uses the library needs to find its header. That's why `demo` doesn't need its own include directory: linking to `textutil` gives it one.

Build in a separate folder, so build files never mix with your sources:

```
cmake -S . -B build/plain     # configure: read CMakeLists.txt, write the build files
cmake --build build/plain     # build
./build/plain/demo
```

Add **`build/`** to a `.gitignore` in this folder.

### Check that:

- The three commands above print `red | green | blue`.
- `build/plain/compile_commands.json` exists, and contains the compiler commands for `textutil.cpp` and `main.cpp`.
- Changing only `app/main.cpp` and building again recompiles `main.cpp` and doesn't recompile `textutil.cpp`. The output of `cmake --build` lists every file it compiles.

---

## Part 3 — Warnings as errors

**File:** `CMakeLists.txt`

Compiler warnings point at code that is legal but probably wrong, like a variable that shadows another one, or a number silently converted to a smaller type. In a project you start from scratch, the best policy is to have no warnings at all, enforced by making every warning an error.

The flags should apply to **your** targets only. GoogleTest, added in Part 4, is someone else's code, and it may not compile cleanly under your rules. The standard way to share settings between your own targets is an **interface library**: a target with no sources of its own, which exists only to pass its options to the targets that link to it.

Add an `INTERFACE` library named **`project_options`**, give it these compile options with `target_compile_options(project_options INTERFACE ...)`:

- `-Wall -Wextra -Wpedantic`: the common warnings, plus warnings for non-standard code.
- `-Wconversion`: implicit conversions that can lose data.
- `-Wshadow`: a variable that hides another variable with the same name.
- `-Werror`: every warning is an error.

Then link `textutil` and `demo` to it with `PRIVATE`. It is `PRIVATE` because these are rules for building *your* code, not requirements for code that uses your library.

### Check that:

- The project builds with no warnings.
- `compile_commands.json` shows the warning flags on the commands for your two files.

---

## Part 4 — Tests with GoogleTest

**Files:** `CMakeLists.txt`, `tests/textutil_test.cpp`

**FetchContent** downloads a dependency while CMake configures the project, and adds it to the build as if it were part of it. Add GoogleTest with it:

```cmake
include(FetchContent)
FetchContent_Declare(
    googletest
    URL https://github.com/google/googletest/archive/refs/tags/v1.18.0.zip
)
FetchContent_MakeAvailable(googletest)
```

Then:

1. Call `enable_testing()`.
2. Add an executable target **`textutil_tests`** built from the test files, linked to `textutil`, `project_options` and **`GTest::gtest_main`**. The last one provides a `main` function that runs every test.
3. `include(GoogleTest)` and `gtest_discover_tests(textutil_tests)`, so CTest finds each test in the executable.

A GoogleTest test is a `TEST(Group, Name)` block. On an unrelated example:

```cpp
#include <gtest/gtest.h>
#include "geometry/geometry.h"

TEST(CircleArea, ZeroRadiusIsZero) {
    EXPECT_EQ(geometry::circle_area(0.0), 0.0);
}
```

`EXPECT_EQ(a, b)` checks that `a == b`. To compare against a vector, put the expected value in parentheses, because the commas inside braces confuse the macro: `EXPECT_EQ(result, (std::vector<std::string>{"a", "b"}))`.

### Test that:

- `trim` removes spaces, tabs and newlines at both ends, and keeps the ones in the middle.
- `trim` of a text made only of whitespace, and of `""`, is `""`.
- `split` splits at the separator, keeps empty parts (including at the start and the end), and returns one part when the separator doesn't appear.
- `split("", ',')` is `{""}`.
- `join` puts the separator between parts, and gives `""` for an empty vector and the part itself for a vector of one.
- `join(split(text, ','), ",")` gives back `text`, for a text with empty parts, like `"x,,y,z"`.

Run them with CTest:

```
cmake --build build/plain
ctest --test-dir build/plain --output-on-failure
```

---

## Part 5 — Presets and UndefinedBehaviorSanitizer

**Files:** `CMakeLists.txt`, `CMakePresets.json`

### Undefined behavior

Some C++ mistakes have **undefined behavior**: the language says nothing about what happens, so the program may crash, print nonsense, or seem to work. Overflowing a signed integer, or shifting a number by more bits than it has, are two examples. **UndefinedBehaviorSanitizer** (UBSan) adds a check before each such operation.

By default, UBSan only prints a report and lets the program continue, which a test can easily miss. The flag `-fno-sanitize-recover=undefined` makes it stop the program instead, so the test fails.

Add two options to `CMakeLists.txt`, both `OFF` by default:

- **`ENABLE_UBSAN`**: adds `-fsanitize=undefined -fno-sanitize-recover=undefined` to the compile options of `project_options`, and `-fsanitize=undefined` to its link options (`target_link_options`).
- **`ENABLE_ASAN`**: adds `-fsanitize=address -fno-omit-frame-pointer` to the compile options and `-fsanitize=address` to the link options, and the compile definition **`ASAN_ENABLED`** (`target_compile_definitions`). It's only used in Part 7, inside the container.

A sanitizer has to be on when compiling *and* when linking, because it adds both checks to your code and a runtime library to the program. That's why each option sets both.

### Presets

Typing `-D` options on every configure is easy to get wrong. A **preset** saves them in `CMakePresets.json`, under a name. Write `CMakePresets.json` with `"version": 6` and a configure preset **`dev`**:

- `binaryDir`: `build/dev`.
- Cache variables: `CMAKE_BUILD_TYPE` set to `Debug`, and `ENABLE_UBSAN` set to `ON`.

Add a build preset and a test preset, both named `dev` and pointing to the `dev` configure preset. In the test preset, set `"output": { "outputOnFailure": true }`.

From now on the project is built and tested with:

```
cmake --preset dev
cmake --build --preset dev
ctest --preset dev
```

### Test that:

**File:** `tests/build_test.cpp`, added to `textutil_tests`.

- A test **`BuildConfig.AddressSanitizerIsActiveWhenRequested`**: if `ASAN_ENABLED` is defined, it checks that AddressSanitizer is really compiled in. Otherwise it is skipped with `GTEST_SKIP()`. Clang reports AddressSanitizer through `__has_feature(address_sanitizer)`. Since `__has_feature` isn't standard, define a fallback at the top of the file:

  ```cpp
  #ifndef __has_feature
  #define __has_feature(x) 0
  #endif
  ```

  This test proves that an option in `CMakeLists.txt` actually reaches the compiler. On the Mac it is skipped. In Part 7 it runs.

### Check that:

- `ctest --preset dev` runs all the tests, with the build-config test reported as skipped.
- `compile_commands.json` in `build/dev` shows `-fsanitize=undefined` on the commands for your files.

---

## Part 6 — Leak checking on the Mac

**File:** `scripts/check-leaks.sh`

A **memory leak** is memory a program allocated and never freed. The program keeps working, but it grows, and a long-running server eventually runs out of memory. In this library everything is managed by `std::string` and `std::vector`, so there should be no leaks. From DS01 on you will manage memory yourself, and this check will matter.

Apple's `leaks` tool runs a program and, when it exits, reports every allocation that nothing points to anymore:

```
leaks --atExit -- ./build/dev/textutil_tests
```

It exits with `0` when it found no leaks, `1` when it found some, and more than 1 on an error (`man leaks`).

Write **`scripts/check-leaks.sh`** that builds the `dev` preset and runs the test executable under `leaks --atExit`. The script's exit code must be the exit code of `leaks`, so a script or a CI job can rely on it. Put `set -euo pipefail` at the top, so the script stops at the first command that fails.

### Check that:

- `./scripts/check-leaks.sh` reports `0 leaks for 0 total leaked bytes` and exits with `0`. Check the exit code with `echo $?` right after it.

---

## Part 7 — Full memory checking in a Linux container

**Files:** `Dockerfile`, `.dockerignore`, `CMakePresets.json`, `scripts/check-asan.sh`

**AddressSanitizer** (ASan) catches the bugs that UBSan and `leaks` don't: reading or writing outside an array, and using memory after it was freed. On Linux it also checks for leaks when the program exits. It doesn't run on your Mac (see **AddressSanitizer on your machine**), so you'll run it in a Linux container with the same project.

### The image

Write a `Dockerfile`:

1. `FROM ubuntu:24.04`.
2. One `RUN` that installs `clang`, `libclang-rt-18-dev`, `cmake`, `make` and `ca-certificates` with `apt-get install -y --no-install-recommends`, after an `apt-get update`, and deletes `/var/lib/apt/lists/*` at the end. `libclang-rt-18-dev` contains the sanitizer runtime libraries, which `--no-install-recommends` would otherwise leave out. `ca-certificates` lets CMake download GoogleTest over HTTPS.
3. `WORKDIR /src`.

The image contains only the tools. The source code isn't copied into it: it's mounted into the container when it runs, so the container always builds the files as they are on your Mac right now.

Add a `.dockerignore` with `build/`.

Build the image and name it **`cpp-toolchain`**:

```
docker build -t cpp-toolchain .
```

### The preset

Add a configure preset **`linux-asan`** with `binaryDir` `build/linux-asan`, and cache variables `CMAKE_BUILD_TYPE` `Debug`, `CMAKE_CXX_COMPILER` `clang++`, `ENABLE_ASAN` `ON` and `ENABLE_UBSAN` `ON`. Add a build preset and a test preset for it, like for `dev`. It has its own build folder because the Mac and Linux builds can't share one: they are different operating systems.

### The script

Write **`scripts/check-asan.sh`** that runs, inside the container, the three preset commands for `linux-asan`:

```
docker run --rm -v "$PWD":/src cpp-toolchain bash -c "cmake --preset linux-asan && cmake --build --preset linux-asan && ctest --preset linux-asan"
```

`-v "$PWD":/src` mounts this folder at `/src` inside the container, which is the `WORKDIR`. `--rm` deletes the container when it exits. The script runs from this folder, and its exit code is the exit code of `ctest`.

### Check that:

- `./scripts/check-asan.sh` passes all tests, and the build-config test **runs** this time instead of being skipped.
- `ctest --preset dev` on the Mac still passes. The two build folders don't interfere.

---

## Part 8 — The template

**File:** `README.md`

This folder is now the starting point for every C++ project that follows. Add a section **Starting a new C++ project** to `README.md` with the steps to create one from it:

- which files and folders to copy,
- which names to change, in which files: the project name, the library target, the namespace and the header folder,
- the commands to build and test on the Mac, to check for leaks, and to run the full check in the container.

Then follow your own steps once, in a temporary folder outside the repository, with a library called `scratch`, and check that `ctest --preset dev` passes there. Fix the steps if anything was missing, and delete the temporary folder.

---

## Running

```
cmake --preset dev && cmake --build --preset dev && ctest --preset dev   # build and test on the Mac
./scripts/check-leaks.sh                                                 # memory leaks, on the Mac
./scripts/check-asan.sh                                                  # full memory check, in the container
```
