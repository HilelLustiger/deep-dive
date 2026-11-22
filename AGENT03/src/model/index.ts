// Picks a ChatModel from environment variables. Given code: don't change it.
//   PROVIDER=ollama     a local model through Ollama (the default)
//   PROVIDER=anthropic  Claude; needs ANTHROPIC_API_KEY
//   MODEL=...           the model name; each provider has a default
import { AnthropicModel, DEFAULT_ANTHROPIC_MODEL } from "./anthropic.ts";
import { DEFAULT_OLLAMA_MODEL, OllamaModel } from "./ollama.ts";
import type { ChatModel } from "./types.ts";

export function modelFromEnv(env: Record<string, string | undefined> = process.env): ChatModel {
    const provider = env.PROVIDER || "ollama";
    switch (provider) {
        case "ollama":
            return new OllamaModel(env.MODEL || DEFAULT_OLLAMA_MODEL);
        case "anthropic":
            if (!env.ANTHROPIC_API_KEY) {
                throw new Error("PROVIDER=anthropic needs ANTHROPIC_API_KEY");
            }
            return new AnthropicModel(env.MODEL || DEFAULT_ANTHROPIC_MODEL);
        default:
            throw new Error(`Unknown PROVIDER "${provider}": use "ollama" or "anthropic"`);
    }
}
