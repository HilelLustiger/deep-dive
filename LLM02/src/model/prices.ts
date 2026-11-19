// Prices per million tokens, in US dollars. Given code.
// Prices change: check the provider's pricing page before trusting these.
// Claude prices are from https://platform.claude.com/docs/en/about-claude/pricing (November 2026).

export interface Price {
    inputPerMTok: number;
    outputPerMTok: number;
}

export const PRICES: Record<string, Price> = {
    "claude-opus-5-5": { inputPerMTok: 4, outputPerMTok: 20 },
    "claude-sonnet-5-5": { inputPerMTok: 2, outputPerMTok: 10 },
    "claude-haiku-5-5": { inputPerMTok: 0.1, outputPerMTok: 0.5 },
};

// A local model costs nothing per token (you pay in hardware and time instead).
export function priceFor(model: string): Price {
    return PRICES[model] ?? { inputPerMTok: 0, outputPerMTok: 0 };
}
