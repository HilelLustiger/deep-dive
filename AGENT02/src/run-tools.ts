import type { ToolCall, ToolResult, ToolResultsMessage } from "./model/types.ts";
import type { Tool } from "./tools.ts"

export async function runToolCalls(calls: ToolCall[], tools: Tool[]): Promise<ToolResultsMessage> {
    const toolResults: ToolResult[] = [];

    for (const call of calls) {
        const tool: Tool | undefined = tools.find(tool => tool.name === call.name);

        if (!tool) {
            const content = `Unknown tool "${call.name}". Available tools: ${tools.map(t => t.name).join(", ")}`;
            toolResults.push({callId: call.id, content: content, isError: true})
            continue;
        } 
        
        try {
            toolResults.push({callId: call.id, content: await tool.run(call.input), isError: false});
        } catch (error) {
            toolResults.push({callId: call.id, content: error instanceof Error? error.message : String(error), isError: true});
        }
    }
        
    return {role: "tool", results: toolResults};
}
