// Helpers every pattern uses. Given code: don't change it.
import type { z } from "zod";
import type { ChatModel } from "./model/types.ts";

// One model call: a system prompt and one user message, no tools. Returns the reply's text.
export async function ask(model: ChatModel, system: string, text: string): Promise<string> {
    const reply = await model.complete({ system, messages: [{ role: "user", text }], tools: [] });
    return reply.message.text.trim();
}

// One model call whose reply must be JSON that matches `schema`. Takes the text from the first "{"
// to the last "}", so words or a code fence around the JSON don't matter. Throws if it isn't valid.
export async function askJson<T>(model: ChatModel, system: string, text: string, schema: z.ZodType<T>): Promise<T> {
    const reply = await ask(model, system, text);
    const json = reply.slice(reply.indexOf("{"), reply.lastIndexOf("}") + 1);
    let value: unknown;
    try {
        value = JSON.parse(json);
    } catch {
        throw new Error(`Not JSON: ${reply}`);
    }
    const result = schema.safeParse(value);
    if (!result.success) {
        throw new Error(`Wrong JSON shape: ${reply}`);
    }
    return result.data;
}
