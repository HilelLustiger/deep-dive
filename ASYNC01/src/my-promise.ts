export type State = "pending" | "fulfilled" | "rejected";
export type Executor<T> = (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: unknown) => void) => void;

export class MyPromise<T> implements PromiseLike<T> {
    private state: State = "pending";
    private result: unknown = undefined;
    private reactions: Array<() => void> = [];

    constructor(executor: Executor<T>){

        let called: boolean = false;

        const resolve = (value: T | PromiseLike<T>): void => {
            if (!called) {
                called = true;
                this.resolveWith(value);
            }
        }

        const reject = (reason?: unknown): void => {
            if (!called) {
                called = true;
                this.settle(reason, "rejected");
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

    private settle (value: unknown, state: State): void {
        if (this.state !== "pending") {
            return;
        }

        this.state = state;
        this.result = value;
        for (const fn of this.reactions) {
            queueMicrotask(fn);
        }
        this.reactions = []
    }

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

    static resolve<T>(value: T | PromiseLike<T>): MyPromise<T> {
        if (value instanceof MyPromise) {
            return value;
        } else {
            return new MyPromise(resolve => resolve(value));
        }
    }

    static reject<T = never>(reason?: unknown): MyPromise<T> {
        return new MyPromise<T>((_, reject) => reject(reason));
    }

    static withResolvers<T>(): { promise: MyPromise<T>;
         resolve: (value: T | PromiseLike<T>) => void;
          reject: (reason?: unknown) => void 
        }{
        let resolve!: (value: T | PromiseLike<T>) => void;
        let reject!: (reason?: unknown) => void;

        const promise = new MyPromise<T>((res, rej) => {
            resolve = res;
            reject = rej;
        })

        return {promise, resolve, reject};
    }

    private resolveWith(x: unknown): void {
        if (x === this) {
            this.settle(new TypeError("can't resolve a promise with itself"), "rejected");
        } else if ((typeof x === "object" && x !== null) || typeof x === "function") {
            let then: unknown;
            try {
                then = (x as {then: unknown}).then;
            } catch (e) {
                this.settle(e, "rejected");
                return;
            }

            if (typeof then === "function") {
                let called = false;
                
                const resolvePromise = (y: unknown) => {
                    if (called) return;
                        called = true;
                        this.resolveWith(y);
                }

                const rejectPromise = (r: unknown) => {
                    if (called) return;
                    called = true;
                    this.settle(r, "rejected");
                }

                try {
                    then.call(x, resolvePromise, rejectPromise);
                } catch (e) {
                    if (!called) {
                        called = true;
                        this.settle(e, "rejected");
                    }
                }
                return;
            }

            this.settle(x, "fulfilled");

        } else {
            this.settle(x, "fulfilled");
        }
    }

    finally(onFinally?: (() => unknown) | null): MyPromise<T> {
        if (typeof onFinally !== "function") {
            return this.then();
        }

        const onFulfilled = (value: T) => {
            const res = onFinally();
            return MyPromise.resolve(res).then(() => value);
        }

        const onRejected = (reason: unknown) => {
            const res = onFinally();
            return MyPromise.resolve(res).then(() => {throw reason});
        }
            
        return this.then(onFulfilled, onRejected);
    }
}