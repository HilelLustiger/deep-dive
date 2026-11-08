// Resolves after every microtask queued so far, and every microtask those queue, has run.
// A setTimeout callback is a task, and the event loop runs a task only when the microtask queue is empty.
export function nextTask(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
}

// Waits the given number of milliseconds.
export function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
