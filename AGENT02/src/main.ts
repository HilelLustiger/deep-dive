import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { formatTranscript, runAgent } from "./agent.ts";
import { toolsFromServer } from "./mcp-tools.ts";
import { modelFromEnv } from "./model/index.ts";

const prompt = process.argv.slice(2).join(" ");
if (!prompt) {
    console.error('Usage: node src/main.ts "your request"');
    process.exit(1);
}

const client = new Client({ name: "agent", version: "1.0.0" });
await client.connect(new StdioClientTransport({ command: "node", args: ["src/serve.ts"] }));
try {
    const tools = await toolsFromServer(client);
    const result = await runAgent(modelFromEnv(), tools, prompt, {
        system: "You are a helpful assistant. Use the tools when they help.",
    });
    console.log(formatTranscript(result.messages).join("\n"));
    console.log(`(${result.steps} steps, stopped by: ${result.stopReason})`);
} finally {
    await client.close();
}
