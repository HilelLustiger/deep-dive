export type Comparator<T> = (a: T, b: T) => number;

export function compareNumbers(a: number, b: number): number {
    return a - b;
}

export function compareStrings(a: string, b: string): number {
    if (a > b) {
        return 1;
    }
    if (a < b) {
        return -1;
    }
    return 0;
}

export function reverse<T>(compare: Comparator<T>): Comparator<T> {
    return (a: T, b: T) => compare(b, a);
}