import type { Price } from "./model/prices.ts";
import type { ChatModel, ModelRequest, StopReason, Usage } from "./model/types.ts";

export interface Span {
    name: string
    startMs: number
    durationMs: number
    inputTokens: number
    outputTokens: number
    costUsd: number
    stopReason?: StopReason
    error?: string
}

export function costUsd(usage: Usage, price: Price): number {
    return (usage.inputTokens * price.inputPerMTok + usage.outputTokens * price.outputPerMTok) / 1_000_000;
}

export function traced(model: ChatModel, options: { name: string; price: Price; spans: Span[]; now?: () => number }): ChatModel {
    const now = options.now ?? (() => performance.now());
    return {
        complete: async (request: ModelRequest) => {
            const startMs = now();
            try {
                const reply = await model.complete(request);
                options.spans.push({
                    name: options.name,
                    startMs,
                    durationMs: now() - startMs,
                    inputTokens: reply.usage.inputTokens,
                    outputTokens: reply.usage.outputTokens,
                    costUsd: costUsd(reply.usage, options.price),
                    stopReason: reply.stopReason,
                });
                return reply;
            } catch (error) {
                options.spans.push({
                    name: options.name,
                    startMs,
                    durationMs: now() - startMs,
                    inputTokens: 0,
                    outputTokens: 0,
                    costUsd: 0,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        },
    };
}


export function percentile(values: number[], p: number): number {
    if (values.length === 0){
        return 0;
    }
    const vals = ([...values].sort((a, b) => a - b));
    const rank = Math.max(1, Math.ceil(p / 100 * vals.length));
    return vals[rank - 1];
}

export interface Summary{
    calls: number
    errors: number
    inputTokens: number
    outputTokens: number
    costUsd: number
    p50Ms: number
    p95Ms: number
}

export function summarize(spans: Span[]): Summary {
    return {
        calls: spans.length,
        errors: spans.filter(span => span.error !== undefined).length,
        inputTokens: spans.reduce((sum, span) => sum + span.inputTokens, 0),
        outputTokens: spans.reduce((sum, span) => sum + span.outputTokens, 0),
        costUsd: spans.reduce((sum, span) => sum + span.costUsd, 0),
        p50Ms: percentile(spans.map(span => span.durationMs), 50),
        p95Ms: percentile(spans.map(span => span.durationMs), 95),
    }
}