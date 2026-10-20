export interface Borrowable {
    checkout() : void;
    returnCopy(): void;
    isAvailable(): boolean;
}

export interface Reservable extends Borrowable {
    readonly reservedBy: number | null;
    reserve(memberId: number): void;
}