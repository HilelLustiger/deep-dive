// Compile-error checks: one @ts-expect-error line per rule.
import { LibraryItem, Book, DVD } from "../src/items";

// @ts-expect-error: LibraryItem is abstract and cannot be instantiated
const item = new LibraryItem("test", 1);

const item2 = new Book("testBook", 1, "testAuthor")
// @ts-expect-error: can't read availableCopies outside of the class
console.log(item2.avaliableCopies)

const item3 = new DVD("testDVD", 1, 60)
// @ts-expect-error: can't reserve a DVD
item3.reserve(11)