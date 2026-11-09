import { expect, test } from "vitest";
import { calculator, createNoteTools, toSpecs } from "../src/tools.ts";

test("calculator computes and returns text", () => {
    expect(calculator.run({ a: 6, b: 7, op: "multiply" })).toBe("42");
    expect(calculator.run({ a: 1, b: 4, op: "divide" })).toBe("0.25");
});

test("calculator rejects bad input", () => {
    expect(() => calculator.run({ a: 1, b: 0, op: "divide" })).toThrow("Cannot divide by zero");
    expect(() => calculator.run({ a: "1", b: 2, op: "add" })).toThrow();
    expect(() => calculator.run({ a: 1, b: 2, op: "power" })).toThrow("power");
});

test("note tools add and search", () => {
    const notes: string[] = [];
    const [addNote, searchNotes] = createNoteTools(notes);

    expect(addNote.run({ text: "Dentist on Tuesday" })).toBe("Saved note 1");
    expect(addNote.run({ text: "Rent is 4200" })).toBe("Saved note 2");
    expect(searchNotes.run({ query: "dentist" })).toBe("Dentist on Tuesday");
    expect(searchNotes.run({ query: "gym" })).toBe("No notes match.");
    expect(notes).toHaveLength(2);
});

test("two calls to createNoteTools don't share notes", () => {
    const [addA] = createNoteTools();
    const [, searchB] = createNoteTools();

    addA.run({ text: "secret" });

    expect(searchB.run({ query: "secret" })).toBe("No notes match.");
});

test("toSpecs keeps only what the model sees", () => {
    const specs = toSpecs([calculator]);

    expect(specs).toEqual([
        { name: "calculator", description: calculator.description, inputSchema: calculator.inputSchema },
    ]);
    expect("run" in specs[0]).toBe(false);
});
