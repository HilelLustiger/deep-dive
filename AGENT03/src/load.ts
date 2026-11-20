import { readdir, readFile } from "node:fs/promises";
import { type Chunk, chunkDocument } from "./chunk.ts";
import { join } from "node:path";

export async function loadDocuments(dir: string, maxChars?: number): Promise<Chunk[]>{
    const names = (await readdir(dir))
    .filter(name => name.endsWith(".md"))
    .sort();

    const chunks: Chunk[] = [];
    for (const name of names) {
        const text = await readFile(join(dir, name), "utf8");
        chunks.push(...chunkDocument(name, text, maxChars));
    }
    return chunks;
}