// A fake ChatModel for tests. Given code: don't change it.
// It returns replies from a script, in order, and records every request it got,
// so a test decides what the "model" does and then checks what the agent sent it.
import type { ChatModel, ModelReply, ModelRequest, ToolCall } from "./types.ts";

export class ScriptedModel implements ChatModel {
    private replies: ModelReply[];
    readonly requests: ModelRequest[] = [];

    constructor(replies: ModelReply[]) {
        this.replies = [...replies];
    }

    async complete(request: ModelRequest): Promise<ModelReply> {
        // A copy, so later changes to the agent's message list don't change what was recorded.
        this.requests.push(structuredClone(request));
        const reply = this.replies.shift();
        if (reply === undefined) {
            throw new Error("ScriptedModel: no replies left in the script");
        }
        return reply;
    }
}

// A reply with a final answer.
export function answer(text: string): ModelReply {
    return { message: { role: "assistant", text, toolCalls: [] }, stopReason: "end" };
}

// A reply that asks for tools. Each call is [id, name, input].
export function callTools(...calls: Array<[string, string, Record<string, unknown>]>): ModelReply {
    const toolCalls: ToolCall[] = calls.map(([id, name, input]) => ({ id, name, input }));
    return { message: { role: "assistant", text: "", toolCalls }, stopReason: "tool_calls" };
}
