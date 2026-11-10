import type { ToolSpec } from "./model/types.ts"

export interface Tool extends ToolSpec {
    run(input: Record<string, unknown>): string | Promise<string>
}

export function toSpecs(tools: Tool[]): ToolSpec[] {
    return tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
    }))
}

export const calculator: Tool = {
    name: "calculator",
    description: "Do one arithmetic operation on two numbers. Use it for any arithmetic instead of computing in your head",
    inputSchema: {
        type: "object",
        "properties": {
            "a": {
                "description": "The first argument of the operation",
                "type": "number"
            },
            "b": {
                "description": "The second argument of the operation",
                "type": "number"
            },
            "op": {
                "description": "The name of the arithmetic operation",
                "type": "string",
                "enum": ["add", "subtract", "multiply", "divide"]
            },
        },
        required: ["a", "b", "op"],
    },
    run: (input) => {
        if (typeof input.a !== "number") {
            throw new Error("First argument isn't a number");
        }

        if (typeof input.b !== "number") {
            throw new Error("Second argument isn't a number");
        } 

        if (typeof input.op !== "string") {
            throw new Error("The operation isn't a string");
        }

        const validOps = ["add", "subtract", "multiply", "divide"];
        if (!validOps.includes(input.op)) {
            throw new Error(`Unknown op "${input.op}". Use one of: ${validOps.join(", ")}`);
        }

        const arg1: number = input.a;
        const arg2: number = input.b;
        const op: string = input.op;

        if (op === "add") {
            return String(arg1 + arg2);
        } else if (op === "subtract") {
            return String(arg1 - arg2);
        } else if (op === "divide") {
            if (arg2 === 0){
                throw new Error("Cannot divide by zero");
            }
            return String(arg1 / arg2);
        } else if (op === "multiply") {
            return String(arg1 * arg2);
        } else {
            throw new Error(`Unknown op "${op}". Use one of: ${validOps.join(", ")}`);
        }
    }
}

export function createNoteTools(notes: string[] = []): Tool[] {
        
    const add_note: Tool = {
        "name": "add_note",
        "description": "Save a short note for later. Use it when the user asks you to remember something.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "text": {
                    "description": "The text of a new note",
                    "type": "string",
                }
            },
            "required": ["text"],
        },
        "run": (input => {
            if (typeof input.text !== "string") {
                throw new Error("The input must be a string");
            } else if (input.text === "") {
                throw new Error("The input is an empty string")
            }

            notes.push(input.text);
            return `Saved note ${notes.length}`;
        })
    }

    const search_notes: Tool = {
        "name": "search_notes",
        "description": "Find saved notes that contain a word or phrase. Not case-sensitive. Returns the matching notes, one per line.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {
                    "description": "The word or phrase to look for",
                    "type": "string"
                }
            },
            "required": ["query"],
        },
        "run": (input => {
            if (typeof input.query !== "string") {
                throw new Error("The query must be a string");
            } else if (input.query === "") {
                throw new Error("The query is an empty string")
            }

            const query = input.query;
            const notesList = notes.filter(note => note.toLowerCase().includes(query.toLowerCase()));
            
            if (notesList.length === 0){
                return "No notes match."
            }

            return notesList.join("\n")
        })
    }

    return [add_note, search_notes];
}