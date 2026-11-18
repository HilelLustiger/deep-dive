import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./server.ts";
import { calculator, createNoteTools } from "./tools.ts";

const server = createServer([calculator, ...createNoteTools()]);
await server.connect(new StdioServerTransport());
console.error("MCP server running on stdio");
