import { MyPromise } from "./my-promise";

export function run<T>(makeGenerator: () => Generator<unknown, T, any>): MyPromise<T> {

        return new MyPromise((resolve, reject) => {

            const gen = makeGenerator();
            
            function step(advance: () => IteratorResult<unknown , T>) {
                let result;
                try {
                    result = advance();
                } catch (error) {
                    reject(error);
                    return;
                }

                if (result.done) {
                    resolve(result.value);
                    return;
                }

                MyPromise.resolve(result.value).then(
                    val => step(() => gen.next(val)),
                    reason => step(() => gen.throw(reason))
                )
            }
            step(() => gen.next());
        })
    }