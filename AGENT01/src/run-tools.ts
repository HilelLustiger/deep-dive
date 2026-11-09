import type { ToolCall, ToolResult, ToolResultsMessage } from "./model/types.ts";
import type { Tool } from "./tools.ts"

export async function runToolCalls(calls: ToolCall[], tools: Tool[]): Promise<ToolResultsMessage> {
    const toolResults: ToolResult[] = [];

    for (const call of calls) {
        const tool: Tool | undefined = tools.find(tool => tool.name === call.name);

        if (!tool) {
            throw new Error("No tool found");
        }
        const toolOutput: string = await tool.run(call.input);
        const result: ToolResult = {
            callId: call.id,
            content: toolOutput,
            isError: false
        };

        toolResults.push(result);
    }

    return {
        "role": "tool",
        "results": toolResults
    };
}