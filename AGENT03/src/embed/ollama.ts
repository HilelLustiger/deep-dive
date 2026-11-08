// An Embedder that runs a local embedding model through Ollama. Given code: don't change it.
import type { Embedder } from "./types.ts";

// A small model: a 46 MB download, 384 numbers per vector, and up to 512 tokens of input.
export const DEFAULT_EMBED_MODEL = "all-minilm";
const OLLAMA_EMBED_URL = "http://localhost:11434/api/embed";

export class OllamaEmbedder implements Embedder {
    private model: string;

    constructor(model: string = DEFAULT_EMBED_MODEL) {
        this.model = model;
    }

    async embed(texts: string[]): Promise<number[][]> {
        let response: Response;
        try {
            response = await fetch(OLLAMA_EMBED_URL, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ model: this.model, input: texts }),
            });
        } catch (error) {
            throw new Error(`Can't reach Ollama at ${OLLAMA_EMBED_URL}. Is it running? Start it with: ollama serve`, { cause: error });
        }
        if (!response.ok) {
            throw new Error(`Ollama returned ${response.status}: ${await response.text()}`);
        }
        const body = (await response.json()) as { embeddings: number[][] };
        return body.embeddings;
    }
}
