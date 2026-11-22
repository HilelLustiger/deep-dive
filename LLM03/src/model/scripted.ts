// A fake ChatModel for tests. Given code: don't change it.
// It plays a script in order: a reply is returned, an Error is thrown.
// It records every request it got, so a test can check what was sent.
import { ModelError } from "./errors.ts";
import type { ChatModel, ModelReply, ModelRequest, ToolCall, Usage } from "./types.ts";

const NO_USAGE: Usage = { inputTokens: 0, outputTokens: 0 };

export class ScriptedModel implements ChatModel {
    private script: Array<ModelReply | Error>;
    readonly requests: ModelRequest[] = [];

    constructor(script: Array<ModelReply | Error>) {
        this.script = [...script];
    }

    async complete(request: ModelRequest): Promise<ModelReply> {
        // A copy, so later changes to the caller's message list don't change what was recorded.
        this.requests.push(structuredClone(request));
        const next = this.script.shift();
        if (next === undefined) {
            throw new Error("ScriptedModel: nothing left in the script");
        }
        if (next instanceof Error) {
            throw next;
        }
        return next;
    }
}

// A reply with a final answer.
export function answer(text: string, usage: Usage = NO_USAGE): ModelReply {
    return { message: { role: "assistant", text, toolCalls: [] }, stopReason: "end", usage };
}

// A reply cut off at the output token limit.
export function cutOff(text: string, usage: Usage = NO_USAGE): ModelReply {
    return { message: { role: "assistant", text, toolCalls: [] }, stopReason: "max_tokens", usage };
}

// A reply that asks for tools. Each call is [id, name, input].
export function callTools(...calls: Array<[string, string, Record<string, unknown>]>): ModelReply {
    const toolCalls: ToolCall[] = calls.map(([id, name, input]) => ({ id, name, input }));
    return { message: { role: "assistant", text: "", toolCalls }, stopReason: "tool_calls", usage: NO_USAGE };
}

// A failed request, as a provider would throw it. Leave out the status for "no response at all".
export function fail(status?: number, retryAfterMs?: number): ModelError {
    return new ModelError(status === undefined ? "Connection failed" : `HTTP ${status}`, { status, retryAfterMs });
}
