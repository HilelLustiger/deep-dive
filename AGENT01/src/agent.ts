import type { ChatModel, Message, StopReason } from "./model/types.ts";
import { runToolCalls } from "./run-tools.ts";
import { toSpecs, type Tool } from "./tools.ts";

export interface AgentOptions {
    system?: string;
    maxSteps?: number;
}

export interface AgentResult {
    text: string;
    messages: Message[];
    steps: number;
    stopReason: Exclude<StopReason, "tool_calls"> | "max_steps";
}

export async function runAgent(model: ChatModel, tools: Tool[], prompt: string, options: AgentOptions = {}): Promise<AgentResult> {
    const maxSteps = options.maxSteps ?? 10;
    const toolSpecs = toSpecs(tools);
    const messages: Message[] = [{ role: "user", text: prompt }];

    for (let step = 1; step <= maxSteps; step++) {
        const reply = await model.complete({ system: options.system, messages, tools: toolSpecs });
        messages.push(reply.message);

        if (reply.stopReason !== "tool_calls") {
            return { text: reply.message.text, messages, steps: step, stopReason: reply.stopReason };
        }

        messages.push(await runToolCalls(reply.message.toolCalls, tools));
    }

    return { text: "", messages, steps: maxSteps, stopReason: "max_steps" };
}
