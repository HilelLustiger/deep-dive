import { ModelError, TimeoutError } from "./model/errors.ts";
import type { ChatModel, ModelRequest } from "./model/types.ts";

const RETRYABLE_STATUSES = new Set([408, 409, 429]);

export function isRetryable(error: unknown): boolean {
    if (error instanceof TimeoutError) {
        return true;
    }
    if (!(error instanceof ModelError)) {
        return false;
    }
    const status = error.status;
    return status === undefined || status >= 500 || RETRYABLE_STATUSES.has(status);
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError(`No reply after ${ms} ms`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export interface RetryOptions {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    timeoutMs: number;
    sleep?: (ms: number) => Promise<void>;
    random?: () => number;
}

export function withRetry(model: ChatModel, options: RetryOptions): ChatModel {
    const sleep = options.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
    const random = options.random ?? Math.random;
    return {
        complete: async (request: ModelRequest) => {
            for (let attempt = 1; ; attempt++) {
                try {
                    return await withTimeout(model.complete(request), options.timeoutMs);
                } catch (error) {
                    if (attempt >= options.maxAttempts || !isRetryable(error)) {
                        throw error;
                    }
                    const retryAfterMs = error instanceof ModelError ? error.retryAfterMs : undefined;
                    const backoff = Math.min(options.maxDelayMs, options.baseDelayMs * 2 ** (attempt - 1));
                    await sleep(retryAfterMs ?? random() * backoff);
                }
            }
        },
    };
}