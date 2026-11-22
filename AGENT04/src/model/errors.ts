// The errors a ChatModel throws. Given code: don't change it.
// Both providers turn their own failures into these, so the code above them
// decides what to do without knowing which provider failed.

// A request to the provider failed.
export class ModelError extends Error {
    // The HTTP status code, or undefined when no response came back at all
    // (the connection failed or was reset).
    readonly status: number | undefined;
    // How long the provider asked us to wait before trying again, from its Retry-After header.
    readonly retryAfterMs: number | undefined;

    constructor(message: string, options: { status?: number; retryAfterMs?: number; cause?: unknown } = {}) {
        super(message, { cause: options.cause });
        this.name = "ModelError";
        this.status = options.status;
        this.retryAfterMs = options.retryAfterMs;
    }
}

// No reply came back in time.
export class TimeoutError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "TimeoutError";
    }
}

// Retry-After is a number of seconds (or, rarely, a date, which this ignores).
export function parseRetryAfter(header: string | null | undefined): number | undefined {
    const seconds = Number(header);
    return header && Number.isFinite(seconds) ? seconds * 1000 : undefined;
}
