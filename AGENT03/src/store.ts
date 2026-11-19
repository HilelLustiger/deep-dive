import type { Chunk } from "./chunk.ts";
import type { Embedder } from "./embed/types.ts";
import { cosineSimilarity } from "./similarity.ts"

export interface SearchHit{
    chunk: Chunk
    score: number
}

export class VectorStore{
    private embedder: Embedder;
    private entries: {chunk: Chunk, vector: number[]}[] = [];


    constructor(embedder: Embedder){
        this.embedder = embedder;
    }

    get size(): number{
        return this.entries.length;
    }

    async add(chunks: Chunk[]): Promise<void>{
        if (chunks.length === 0){
            return
        }
        const vectors: number[][] = await this.embedder.embed(chunks.map(c => c.text));
        for (let i = 0; i < chunks.length; i++){
            this.entries.push({
                chunk: chunks[i],
                vector: vectors[i]
            })
        }
    }

    async search(query: string, k = 3): Promise<SearchHit[]>{
        if (this.entries.length === 0){
            return [];
        }

        const [queryVector] = await this.embedder.embed([query]);
        const scores = this.entries.map(entry => ({chunk: entry.chunk, score: cosineSimilarity(queryVector, entry.vector)}))
        .sort((a: SearchHit, b:SearchHit) => b.score - a.score);
        
        return scores.slice(0, k);
    }
}