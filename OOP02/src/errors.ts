
export class ItemUnavailableError extends Error {
    name: string = "ItemUnavailableError";

    constructor() {
        super("there are no available copies of the item")
    }
}

export class InvalidReturnError extends Error {
    name: string = "InvalidReturnError";

    constructor(){
        super("the return is not allowed")
    }
}

export class NotFoundError extends Error {
    name: string = "NotFoundError";

    constructor(){
        super("no item or member exists with the given ID")
    }
}

export class AlreadyReservedError extends Error {
    name: string = "AlreadyReservedError";
    
    constructor(){
        super("the book is already reserved by someone")
    }
}