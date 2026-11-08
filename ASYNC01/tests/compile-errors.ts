// Compile-error checks: one @ts-expect-error line per rule.
import { MyPromise } from "../src/my-promise";

// A MyPromise<number> can't be resolved with a string.
// @ts-expect-error
new MyPromise<number>(resolve => resolve("x"));

// The callback gets a number.
// @ts-expect-error
MyPromise.resolve(1).then(n => n.toUpperCase());

// Awaiting a MyPromise<number> gives a number.
// @ts-expect-error
const s: string = await MyPromise.resolve(1);

// The state is private.
// @ts-expect-error
MyPromise.resolve(1).state;
