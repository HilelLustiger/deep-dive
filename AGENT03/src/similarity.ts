export function cosineSimilarity(a: number[], b: number[]): number{
    if (a.length !== b.length) {
        throw new Error("vectors must have the same length");
    }

    let dot = 0;
    let sumA = 0;
    let sumB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        sumA += a[i] * a[i];
        sumB += b[i] * b[i];
    }

    const lengthA = Math.sqrt(sumA);
    const lengthB = Math.sqrt(sumB);
    if (lengthA === 0 || lengthB === 0) {
        return 0;
    }

    return dot / (lengthA * lengthB);

}