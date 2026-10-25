// Compile-error checks: one @ts-expect-error line per rule.
import { BST } from "../src/bst";
import { compareNumbers, compareStrings } from "../src/comparators";

const tree = new BST<number, string>(compareNumbers);

// @ts-expect-error: the key must be a number
tree.put("x", "y");

// @ts-expect-error: get returns string | undefined, not number
const n: number = tree.get(1);

// @ts-expect-error: a string comparator can't order number keys
new BST<number, string>(compareStrings);

// @ts-expect-error: the root is private
tree.root;
