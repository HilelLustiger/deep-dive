import type { ChatModel } from "./model/types.ts";
import type { SearchHit, VectorStore } from "./store.ts";

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