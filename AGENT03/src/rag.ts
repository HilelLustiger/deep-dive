import type { AgentResult } from "./agent.ts";
import type { ChatModel } from "./model/types.ts";
import type { SearchHit, VectorStore } from "./store.ts";
import type { Tool } from "./tools.ts"

export function formatHits(hits: SearchHit[]): string {
    return hits.map(hit => `[${hit.chunk.id}]\n${hit.chunk.text}`).join("\n\n");
}

export interface RagAnswer{
    text: string        // The model's answer
    sources: string[]   // The ids of the chunks the model was given
}

export async function answerWithContext(model: ChatModel, store: VectorStore, question: string, k = 3): Promise<RagAnswer> {
    const hits = await store.search(question, k);
    const prompt = [
        "Answer the question using only the context below. Cite the chunk ids you used in square brackets, like [vacation.md#0]. If the context doesn't contain the answer, say that you don't know.",
        "",
        "Context:",
        formatHits(hits),
        "",
        `Question: ${question}`,
    ].join("\n");

    const reply = await model.complete({ messages: [{ role: "user", text: prompt }], tools: [] });

    return {
        text: reply.message.text,
        sources: hits.map(hit => hit.chunk.id),
    };
        
}

export function createSearchTool(store: VectorStore, k = 3): Tool {
    return({
        name: "search_docs",
        description: "Search the company handbook. Returns the most relevant passages, each with its id in square brackets. Search again with other words if the results don't answer the question.",
        inputSchema: {
            type: "object",
            properties: {
                query: {
                    description: "What to look for, in a few words",
                    type: "string"
                },
            },
            required: ["query"]
        },
        run: async (input) => {
            const query = input.query;
            if (typeof query !== "string" || query.trim() === "") {
                throw new Error("query must be a non-empty string");
            }
            const hits = await store.search(query.trim(), k);
            if (hits.length === 0) {
                return "No results.";
            }
            return formatHits(hits);
        },
    })
}

export function citations(text: string): string[] {
    const matches = text.match(/\[[^\[\]\s]+#\d+\]/g) ?? [];
    const ids = matches.map(match => match.slice(1, -1));
    return [...new Set(ids)];
}

export function unsupportedCitations(result: AgentResult): string[] {
    const retrieved = new Set<string>();
    for (const message of result.messages) {
        if (message.role !== "tool") {
            continue;
        }
        for (const toolResult of message.results) {
            for (const id of citations(toolResult.content)) {
                retrieved.add(id);
            }
        }
    }
    return citations(result.text).filter(id => !retrieved.has(id));
}
