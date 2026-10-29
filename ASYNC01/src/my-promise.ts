export type State = "pending" | "fulfilled" | "rejected";
export type Executor<T> = (resolve: (value: T) => void, reject: (reason?: unknown) => void) => void;

export class MyPromise<T> implements PromiseLike<T> {
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

    // Part 2 implementation.
    // then(onFulfilled?: (value: T) => void, onRejected?: (reason?: unknown) => void): void {
    //     const reaction = (): void => {
    //         if (this.state === "fulfilled" && typeof onFulfilled === "function") {
    //             onFulfilled(this.result as T);
    //         } else if (this.state === "rejected" && typeof onRejected === "function") {
    //             onRejected(this.result);
    //         }
    //     }
    //
    //     if (this.state === "pending") {
    //         this.reactions.push(reaction);
    //     } else {
    //         queueMicrotask(reaction);
    //     }
    // }


    // Part 3 Implementation.
    then<TResult1 = T, TResult2 = never>(
    onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
): MyPromise<TResult1 | TResult2> {
    return new MyPromise<TResult1 | TResult2>((resolve, reject) => {
        const reaction = (): void => {
            if (this.state === "fulfilled") {
                if (onFulfilled && typeof onFulfilled === "function") {
                    try {
                        resolve(onFulfilled(this.result as T) as TResult1);
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    resolve(this.result as TResult1);
                }
            } else if (this.state === "rejected") {
                if (onRejected && typeof onRejected === "function") {
                    try {
                        resolve(onRejected(this.result) as TResult2);
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(this.result);
                }
            }
        }

        if (this.state === "pending") {
            this.reactions.push(reaction);
        } else {
            queueMicrotask(reaction);
        }})
    }

    catch<TResult = never>(onRejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null): MyPromise<T | TResult> {
        return this.then(undefined, onRejected);
    }
}