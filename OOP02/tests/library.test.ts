// Tests for Parts 4 and 5: Member and Library.
import { test, expect, beforeEach, vi } from "vitest";
import { Library } from "../src/library";
import { Member } from "../src/member";
import { DVD, Book } from "../src/items";
import { NotFoundError, InvalidReturnError } from "../src/errors";

beforeEach(() => {
    Library.resetForTests();
});

test("getInstance() returns the same object every time", () => {
    const library1 = Library.getInstance();
    const library2 = Library.getInstance();
    expect(library1).toBe(library2);
});

test("checkout() moves a copy to the member, and returnItem() undoes it", () => {
    const lib = Library.getInstance();
    const member1 = new Member(1, "Alice");
    const item1 = new DVD("Inception", 1, 148);

    lib.addItem(item1);
    lib.addMember(member1);

    expect((member1.getItems().length)).toBe(0);
    
    lib.checkout(member1.id, item1.id);

    expect(member1.getItems().length).toBe(1);
    expect(member1.getItems()[0]).toBe(item1);
    expect(item1.isAvailable()).toBe(false);

    lib.returnItem(member1.id, item1.id);

    expect(member1.getItems().length).toBe(0);
    expect(item1.isAvailable()).toBe(true);
});

test("unknown IDs throw NotFoundError", () => {
    const lib = Library.getInstance();
    const member1 = new Member(1, "Alice");
    const item1 = new Book("Dune", 1, "Frank Herbert");
    lib.addMember(member1);
    lib.addItem(item1);

    expect(() => lib.checkout(999, item1.id)).toThrow(NotFoundError);
    expect(() => lib.checkout(member1.id, 999)).toThrow(NotFoundError);
    expect(() => lib.returnItem(999, item1.id)).toThrow(NotFoundError);
    expect(() => lib.returnItem(member1.id, 999)).toThrow(NotFoundError);
});

test("returning an item the member doesn't hold throws InvalidReturnError", () => {
    const lib = Library.getInstance();
    const member1 = new Member(1, "Alice");
    const member2 = new Member(2, "Bob");
    const item1 = new Book("Dune", 2, "Frank Herbert");
    lib.addMember(member1);
    lib.addMember(member2);
    lib.addItem(item1);

    lib.checkout(member2.id, item1.id);

    expect(() => lib.returnItem(member1.id, item1.id)).toThrow(InvalidReturnError);
});

test("find() by ID and by title returns the right results", () => {
    const lib = Library.getInstance();
    const book = new Book("Dune", 1, "Frank Herbert");
    const dvd = new DVD("Alien", 1, 117);
    lib.addItem(book);
    lib.addItem(dvd);

    expect(lib.find(book.id)).toBe(book);
    expect(lib.find(999)).toBeUndefined();
    expect(lib.find("dUNE")).toEqual([book]);
    expect(lib.find("Nothing")).toEqual([]);
});

test("printCatalog() prints one line per item", () => {
    const lib = Library.getInstance();
    const book = new Book("Dune", 3, "Frank Herbert");
    const dvd = new DVD("Alien", 1, 117);
    lib.addItem(book);
    lib.addItem(dvd);

    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    lib.printCatalog();

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, book.describe());
    expect(spy).toHaveBeenNthCalledWith(2, dvd.describe());

    spy.mockRestore();
});
