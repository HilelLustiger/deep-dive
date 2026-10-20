import { Member } from "./member";
import { LibraryItem } from "./items";
import { Borrowable, Reservable } from "./interfaces";
import { ItemUnavailableError, InvalidReturnError, NotFoundError, AlreadyReservedError} from "./errors";

export class Library {

    private static instance: Library | undefined;
    private members: Member[];
    private items: LibraryItem[];

    private constructor() {
        this.members = [];
        this.items = [];
    }

    static getInstance(): Library {
        if (!Library.instance) {
            Library.instance = new Library();
        }
        return Library.instance;
    }

    // Used only by tests: forgets the current instance, so the next
    // getInstance() starts with an empty library.
    static resetForTests(): void {
        Library.instance = undefined;
    }

    addItem(item: LibraryItem): void {
        if (!item || this.items.indexOf(item) !== -1) {
            throw new Error("Invalid item or item already exists in the library");
        }
        this.items.push(item);
    }

    addMember(member: Member): void {
        if (!member || this.members.indexOf(member) !== -1) {
            throw new Error("Invalid member or member already exists in the library");
        }
        this.members.push(member);
    }

    checkout(memberId: number, itemId: number): void {
        const member = this.findMemberById(memberId);
        const item = this.find(itemId);

        if (!member || !item) {
            throw new NotFoundError();
        }

       this.checkoutBorrowable(item);
       member.addItem(item);
    }

    returnItem(memberId: number, itemId: number): void {
        const member = this.findMemberById(memberId);
        const item = this.find(itemId);

        if (!member || !item) {
            throw new NotFoundError();
        }

        if (!member.getItems().includes(item)) {
            throw new InvalidReturnError();
        }

        this.returnBorrowable(item);
        member.removeItem(item);
    }

    printCatalog(): void {
        this.items.forEach((item) => console.log(item.describe()));
    }

    private checkoutBorrowable(item: Borrowable): void {
        item.checkout();
    }

    private returnBorrowable(item: Borrowable): void {
        item.returnCopy();
    }

    find(id: number): LibraryItem | undefined;
    find(title: string): LibraryItem[];
    find(input: number | string): LibraryItem | LibraryItem[] | undefined {
        if (typeof input === "number") {
            return this.findItemById(input);
        }

        if (typeof input === "string") {
            const title = input.toLowerCase();
            return this.items.filter((item) => item.title.toLowerCase() === title);
        }
    }
    
    private findMemberById(id: number): Member | undefined {
        return this.members.find(member => member.id === id);
    }

    private findItemById(id: number): LibraryItem | undefined {
        return this.items.find(item => item.id === id);
    }
}