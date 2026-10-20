// Tests for Part 3: LibraryItem, Book and DVD.
import { test, expect } from "vitest";
import { Book, DVD } from "../src/items";
import { ItemUnavailableError, InvalidReturnError, AlreadyReservedError} from "../src/errors";


test("items get consecutive IDs", () => {
    const first = new Book("testBook", 1, "testAuthor")
    const second = new DVD("testDVD", 1, 60)
    expect(second.id).toBe(first.id + 1)
});

test("checkout() with no copies left throws ItemUnavailableError", () => {
    const item = new Book("testBook", 0, "testAuthor")
    expect(() => item.checkout()).toThrow(ItemUnavailableError)
})

test("returnCopy() when all copies are in throws InvalidReturnError", () => {
    const item = new DVD("testDVD", 1, 60)
    expect(() => item.returnCopy()).toThrow(InvalidReturnError)
})

test("isAvailable() becomes false after the last copy is checked out", () => {
    const item = new Book("testBook", 1, "testAuthor")
    expect(item.isAvailable()).toBe(true)
    item.checkout()
    expect(item.isAvailable()).toBe(false)
})

test("describe() of a Book and of a DVD returns the expected text", () => {
    const book = new Book("testBook", 1, "testAuthor")
    const dvd = new DVD("testDvd", 1, 60)
    expect(book.describe()).toBe("[Book] testBook (1/1 available) by testAuthor")
    expect(dvd.describe()).toBe("[DVD] testDvd (1/1 available), 60 min")
})

test("reserve() sets reservedBy, and reserving again throws AlreadyReservedError", () => {
    const item = new Book("testBook", 1, "testAuthor")
    item.reserve(11)
    expect(item.reservedBy).toBe(11)
    expect(() => item.reserve(12)).toThrow(AlreadyReservedError)
})