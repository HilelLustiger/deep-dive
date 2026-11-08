// The provider-neutral interface the agent talks to. Given code: don't change it.
// Every provider implements ChatModel, so the agent never sees a provider's own format.

// A JSON Schema object that describes a tool's input.
export type JsonSchema = {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
};

// What the model is told about a tool: its name, what it's for, and the shape of its input.
export interface ToolSpec {
    name: string;
    description: string;
    inputSchema: JsonSchema;
}

// A request from the model to run one tool.
// `id` ties the call to its result: the result you send back carries the same id.
export interface ToolCall {
    id: string;
    name: string;
    input: Record<string, unknown>;
}

// The outcome of one tool call, sent back to the model.
export interface ToolResult {
    callId: string;
    content: string;
    isError: boolean;
}

export interface UserMessage {
    role: "user";
    text: string;
}

export interface AssistantMessage {
    role: "assistant";
    text: string;
    toolCalls: ToolCall[];
    // The provider's original message. A provider may need it back exactly as it sent it
    // (Claude does, for its thinking blocks), so always add the assistant message to the
    // conversation as you got it, never a copy you built yourself.
    raw?: unknown;
}

// The results of every tool call from one assistant message, in one message.
export interface ToolResultsMessage {
    role: "tool";
    results: ToolResult[];
}

export type Message = UserMessage | AssistantMessage | ToolResultsMessage;

export interface ModelRequest {
    system?: string;
    messages: Message[];
    tools: ToolSpec[];
}

// Why the model stopped:
// - "end": it finished its answer.
// - "tool_calls": it wants tools run; the calls are in message.toolCalls.
// - "max_tokens": the answer was cut off at the output limit.
// - "refusal": the model declined to answer.
export type StopReason = "end" | "tool_calls" | "max_tokens" | "refusal";

export interface ModelReply {
    message: AssistantMessage;
    stopReason: StopReason;
}

export interface ChatModel {
    complete(request: ModelRequest): Promise<ModelReply>;
}
