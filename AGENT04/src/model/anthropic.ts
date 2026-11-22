// ChatModel for Claude, through the official SDK. Given code: don't change it.
// It reports token usage, turns SDK errors into ModelError, and turns off the SDK's own retries
// (LLM02 is about writing your own).
import Anthropic from "@anthropic-ai/sdk";
import type { BetaContentBlockParam, BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { ModelError, parseRetryAfter } from "./errors.ts";
import type { ChatModel, Message, ModelReply, ModelRequest, StopReason, ToolCall } from "./types.ts";

export const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5-5";

export class AnthropicModel implements ChatModel {
    private client: Anthropic;
    private model: string;

    // The client reads ANTHROPIC_API_KEY from the environment.
    constructor(model: string = DEFAULT_ANTHROPIC_MODEL) {
        this.client = new Anthropic({ maxRetries: 0 });
        this.model = model;
    }

    async complete(request: ModelRequest): Promise<ModelReply> {
        const response = await this.create(request);

        const text = response.content
            .flatMap(block => (block.type === "text" ? [block.text] : []))
            .join("");
        const toolCalls: ToolCall[] = response.content.flatMap(block =>
            block.type === "tool_use"
                ? [{ id: block.id, name: block.name, input: block.input as Record<string, unknown> }]
                : [],
        );

        return {
            message: { role: "assistant", text, toolCalls, raw: response.content },
            stopReason: toStopReason(response.stop_reason),
            usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
        };
    }

    private async create(request: ModelRequest) {
        try {
            return await this.client.beta.messages.create({
                model: this.model,
                max_tokens: 16000,
                system: request.system,
                messages: request.messages.map(toClaudeMessage),
                tools: request.tools.map(tool => ({
                    name: tool.name,
                    description: tool.description,
                    input_schema: tool.inputSchema,
                })),
                // If the model declines for policy reasons, retry on a substitute model.
                betas: ["server-side-fallback-2026-07-01"],
                fallbacks: "default",
            });
        } catch (error) {
            // APIConnectionError (no response) is an APIError with no status.
            if (error instanceof Anthropic.APIError) {
                throw new ModelError(`Claude: ${error.message}`, {
                    status: error.status,
                    retryAfterMs: parseRetryAfter(error.headers?.get("retry-after")),
                    cause: error,
                });
            }
            throw error;
        }
    }
}

function toClaudeMessage(message: Message): BetaMessageParam {
    switch (message.role) {
        case "user":
            return { role: "user", content: message.text };
        case "assistant":
            // Claude's reply goes back exactly as it came, thinking blocks included.
            if (message.raw !== undefined) {
                return { role: "assistant", content: message.raw as BetaContentBlockParam[] };
            }
            return {
                role: "assistant",
                content: [
                    ...(message.text ? [{ type: "text" as const, text: message.text }] : []),
                    ...message.toolCalls.map(call => ({
                        type: "tool_use" as const,
                        id: call.id,
                        name: call.name,
                        input: call.input,
                    })),
                ],
            };
        case "tool":
            // Claude takes tool results in a user message, one tool_result block per call.
            return {
                role: "user",
                content: message.results.map(result => ({
                    type: "tool_result" as const,
                    tool_use_id: result.callId,
                    content: result.content,
                    is_error: result.isError,
                })),
            };
    }
}

function toStopReason(reason: string | null): StopReason {
    switch (reason) {
        case "tool_use":
            return "tool_calls";
        case "max_tokens":
            return "max_tokens";
        case "refusal":
            return "refusal";
        default:
            return "end";
    }
}
