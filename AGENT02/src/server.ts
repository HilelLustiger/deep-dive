import type { Tool } from "./tools.ts"
import { McpServer, fromJsonSchema } from "@modelcontextprotocol/server";
import type { JsonSchemaType } from "@modelcontextprotocol/server";

export function createServer(tools: Tool[]): McpServer {
    const server = new McpServer({name: "agent-tools", version: "1.0.0"});
    
    tools.forEach(tool => {
        const config = {
            description: tool.description,
            inputSchema: fromJsonSchema(tool.inputSchema as JsonSchemaType),
        };

        server.registerTool(tool.name, config, async (input: unknown) => {
            try {
                const res = await tool.run(input as Record<string, unknown>);
                return {content: [{type: "text", text: res}]};
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error)
                return {content: [{type: "text", text: message}], isError: true};
            }
        });
    })

    return server;
}

