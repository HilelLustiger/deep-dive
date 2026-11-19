import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport, type McpServer } from "@modelcontextprotocol/server";

// Connects a client to a server in the same process, with no subprocess and no network.
export async function connect(server: McpServer): Promise<Client> {
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await server.connect(serverSide);
    const client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(clientSide);
    return client;
}
