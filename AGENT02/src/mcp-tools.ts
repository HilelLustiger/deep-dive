import type { JsonSchema } from "./model/types.ts";
import type { Tool } from "./tools.ts"
import type { Client } from "@modelcontextprotocol/client"

export async function toolsFromServer(client: Client): Promise<Tool[]> {
    const {tools} = await client.listTools();

    return tools.map(tool => ({
        name: tool.name,
        description: tool.description ?? "",
        inputSchema: tool.inputSchema as JsonSchema,
        run: async (input: Record<string, unknown>) => {
            const res = await client.callTool({name: tool.name, arguments: input});
            const text = res.content.filter(block => block.type === "text")
            .map(block => block.text)
            .join("\n");
            
            if (res.isError) throw new Error(text);
            return text
        }
    }))
}