export type State = "pending" | "fulfilled" | "rejected";
export type Executor<T> = (resolve: (value: T) => void, reject: (reason?: unknown) => void) => void;

export class MyPromise<T> {
    private state: State = "pending";
    private result: unknown = undefined;
    private reactions: Array<() => void> = [];

    constructor(executor: Executor<T>){

        let called: boolean = false;

        const settle = (value: unknown, state: State): void => {
            called = true;
            this.state = state;
            this.result = value;
            for (const fn of this.reactions) {
                queueMicrotask(fn);
            }
            this.reactions = []
        }

        const resolve = (value: T): void => {
            if (!called) {
                settle(value, "fulfilled");
            }
        }

        const reject = (reason?: unknown): void => {
            if (!called) {
                settle(reason, "rejected");
            }
        }

        try { 
            executor(resolve, reject);
        } catch (error) {
            reject(error);
        }
    }

    then(onFulfilled?: (value: T) => void, onRejected?: (reason?: unknown) => void): void {
        const reaction = (): void => {
            if (this.state === "fulfilled" && typeof onFulfilled === "function") {
                onFulfilled(this.result as T);
            } else if (this.state === "rejected" && typeof onRejected === "function") {
                onRejected(this.result);
            }
        }

        if (this.state === "pending") {
            this.reactions.push(reaction);
        } else {
            queueMicrotask(reaction);
        }
    }
}