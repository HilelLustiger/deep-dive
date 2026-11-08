// ChatModel for a local model served by Ollama, over its HTTP API. Given code: don't change it.
// Ollama's format differs from Claude's in three ways that this file hides:
// tool calls have no id, tool results are matched by tool name, and there's no error flag.
import { randomUUID } from "node:crypto";
import type { ChatModel, Message, ModelReply, ModelRequest, ToolCall } from "./types.ts";

export const DEFAULT_OLLAMA_MODEL = "qwen3";
const OLLAMA_URL = "http://localhost:11434/api/chat";

interface OllamaToolCall {
    function: { name: string; arguments: Record<string, unknown> };
}

interface OllamaMessage {
    role: "user" | "assistant" | "tool";
    content: string;
    tool_calls?: OllamaToolCall[];
    tool_name?: string;
}

interface OllamaResponse {
    message: OllamaMessage;
    done_reason?: string;
}

export class OllamaModel implements ChatModel {
    private model: string;

    constructor(model: string = DEFAULT_OLLAMA_MODEL) {
        this.model = model;
    }

    async complete(request: ModelRequest): Promise<ModelReply> {
        const messages: Array<OllamaMessage | { role: "system"; content: string }> = [];
        if (request.system) {
            messages.push({ role: "system", content: request.system });
        }
        messages.push(...toOllamaMessages(request.messages));

        const body = JSON.stringify({
            model: this.model,
            stream: false,
            messages,
            tools: request.tools.map(tool => ({
                type: "function",
                function: { name: tool.name, description: tool.description, parameters: tool.inputSchema },
            })),
        });
        let response: Response;
        try {
            response = await fetch(OLLAMA_URL, { method: "POST", headers: { "content-type": "application/json" }, body });
        } catch (error) {
            throw new Error(`Can't reach Ollama at ${OLLAMA_URL}. Is it running? Start it with: ollama serve`, { cause: error });
        }
        if (!response.ok) {
            throw new Error(`Ollama returned ${response.status}: ${await response.text()}`);
        }
        const reply = (await response.json()) as OllamaResponse;

        // Ollama gives no ids, so make one per call.
        const toolCalls: ToolCall[] = (reply.message.tool_calls ?? []).map(call => ({
            id: randomUUID(),
            name: call.function.name,
            input: call.function.arguments,
        }));

        return {
            message: { role: "assistant", text: reply.message.content, toolCalls, raw: reply.message },
            stopReason: toolCalls.length > 0 ? "tool_calls" : reply.done_reason === "length" ? "max_tokens" : "end",
        };
    }
}

function toOllamaMessages(messages: Message[]): OllamaMessage[] {
    // Ollama matches a result to its call by tool name, so remember each call's name by id.
    const nameById = new Map<string, string>();
    const out: OllamaMessage[] = [];

    for (const message of messages) {
        switch (message.role) {
            case "user":
                out.push({ role: "user", content: message.text });
                break;
            case "assistant":
                for (const call of message.toolCalls) {
                    nameById.set(call.id, call.name);
                }
                out.push(
                    (message.raw as OllamaMessage | undefined) ?? {
                        role: "assistant",
                        content: message.text,
                        tool_calls: message.toolCalls.map(call => ({
                            function: { name: call.name, arguments: call.input },
                        })),
                    },
                );
                break;
            case "tool":
                // One Ollama message per result. There's no error flag, so the text says it.
                for (const result of message.results) {
                    out.push({
                        role: "tool",
                        tool_name: nameById.get(result.callId) ?? "unknown",
                        content: result.isError ? `Error: ${result.content}` : result.content,
                    });
                }
                break;
        }
    }
    return out;
}
