// Picks a ChatModel from environment variables. Given code: don't change it.
//   PROVIDER=ollama     a local model through Ollama (the default)
//   PROVIDER=anthropic  Claude; needs ANTHROPIC_API_KEY
//   MODEL=...           the model name; each provider has a default
// Returns the model and its name, so the caller can look up its price.
import { AnthropicModel, DEFAULT_ANTHROPIC_MODEL } from "./anthropic.ts";
import { DEFAULT_OLLAMA_MODEL, OllamaModel } from "./ollama.ts";
import type { ChatModel } from "./types.ts";

export function modelFromEnv(env: Record<string, string | undefined> = process.env): { model: ChatModel; name: string } {
    const provider = env.PROVIDER || "ollama";
    switch (provider) {
        case "ollama": {
            const name = env.MODEL || DEFAULT_OLLAMA_MODEL;
            return { model: new OllamaModel(name), name };
        }
        case "anthropic": {
            if (!env.ANTHROPIC_API_KEY) {
                throw new Error("PROVIDER=anthropic needs ANTHROPIC_API_KEY");
            }
            const name = env.MODEL || DEFAULT_ANTHROPIC_MODEL;
            return { model: new AnthropicModel(name), name };
        }
        default:
            throw new Error(`Unknown PROVIDER "${provider}": use "ollama" or "anthropic"`);
    }
}
