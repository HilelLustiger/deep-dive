export interface Chunk {
    id: string
    source: string
    text: string
}

export function chunkDocument(source: string, text: string, maxChars: number = 500): Chunk[] {
   const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
   const pieces: string[] = [];

   paragraphs.forEach(par => {
        for (let i = 0; i < par.length; i += maxChars){
            pieces.push(par.slice(i, i + maxChars));
        }
   })

   const chunks: Chunk[] = [];

   let curr = "";

   for (const piece of pieces) {
        if (curr === "") {
            curr = piece;
        } else if (curr.length + 2 + piece.length <= maxChars) {
            curr += "\n\n" + piece;
        } else {
            chunks.push({ id: `${source}#${chunks.length}`, source, text: curr });
            curr = piece;
        }
   }
   if (curr !== "") {
        chunks.push({ id: `${source}#${chunks.length}`, source, text: curr });
   }

   return chunks;
}



