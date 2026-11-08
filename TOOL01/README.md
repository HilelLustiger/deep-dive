# C++ Build and Test Setup (C++ · CMake)

Based on chapters 0 and 2 of [Learn C++](https://www.learncpp.com/), the official [CMake tutorial](https://cmake.org/cmake/help/latest/guide/tutorial/index.html), the [GoogleTest](https://google.github.io/googletest/) documentation, and the Clang sanitizer documentation, with chapter 7 ("Linking") of *Computer Systems: A Programmer's Perspective* by Bryant and O'Hallaron for the background.

A small text library used to build the C++ toolchain that every later C++ project in this repository starts from: header and source files, compiling and linking by hand, a CMake project with strict warnings, GoogleTest and CTest, presets, UndefinedBehaviorSanitizer and leak checking on macOS, and AddressSanitizer in a Linux container.

The full task is in [ASSIGNMENT.md](ASSIGNMENT.md).
