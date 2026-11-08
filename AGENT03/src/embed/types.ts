// The embedding interface. Given code: don't change it.

// Turns texts into vectors. Texts with similar meaning get vectors that point in similar directions.
// One call can embed many texts: the result has one vector per text, in the same order.
export interface Embedder {
    embed(texts: string[]): Promise<number[][]>;
}
