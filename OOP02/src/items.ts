import { Borrowable, Reservable } from "./interfaces";
import { ItemUnavailableError, InvalidReturnError, AlreadyReservedError } from "./errors";


export abstract class LibraryItem implements Borrowable {
    static nextId = 1;
    id: number;
    readonly title: string;
    protected copies: number;
    private avaliableCopies: number;
    

    constructor(title: string, copies: number) {
        this.title = title
        this.avaliableCopies = copies
        this.copies = copies
        this.id = LibraryItem.nextId
        LibraryItem.nextId = this.id + 1
    }

    checkout() {
        if (this.avaliableCopies == 0){
            throw new ItemUnavailableError()
        }

        this.avaliableCopies -= 1
    }

    returnCopy(){
        if (this.avaliableCopies == this.copies){
            throw new InvalidReturnError()
        }

        this.avaliableCopies += 1
    }

    isAvailable(){
        return (0 < this.avaliableCopies) && ( this.avaliableCopies <= this.copies)
    }

    describe(): string {
        return `${this.title} (${this.avaliableCopies}/${this.copies} available)`
    }
}


export class Book extends LibraryItem implements Reservable {
    author: string;
    reservedBy: number | null;

    constructor(title: string, copies: number, author: string) {
        super(title, copies)
        this.author = author
        this.reservedBy = null
    }

    describe(): string {
        return '[Book] ' + super.describe() + ` by ${this.author}`
    }

    reserve(memberId: number): void {
        if (this.reservedBy != null) {
            throw new AlreadyReservedError()
        }

        this.reservedBy = memberId
    }
}

export class DVD extends LibraryItem {
    minutes: number;

    constructor(title: string, copies: number, minutes: number) {
        super(title, copies)
        this.minutes = minutes
    }

    describe(): string {
        return '[DVD] ' + super.describe() + `, ${this.minutes} min`
    }
}