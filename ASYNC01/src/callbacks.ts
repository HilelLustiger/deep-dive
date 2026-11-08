export type Callback<R> = (error: Error | null, result?: R) => void;

export function delay(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });
}

export function promisify<A extends unknown[], R>(
fn: (...args: [...A, Callback<R>]) => void,
): (...args: A) => Promise<R> {
    return (...args: A) => new Promise((resolve, reject) => {
        fn(...args, (error: Error | null, result?: R) => {
            if (error) {
                reject(error);
            } else {
                resolve(result as R);
            }
        })
    })
};