import { LibraryItem } from "./items";

export class Member {
    readonly id: number;
    readonly name: string;
    private readonly items: LibraryItem[];

    constructor(id: number, name: string) {
        this.id = id;
        this.name = name;
        this.items = [];
    }

    getItems(): readonly LibraryItem[] {
        return this.items;
    }

    addItem(item: LibraryItem): void {
        this.items.push(item);
    }

    removeItem(item: LibraryItem): void {
        const index = this.items.indexOf(item);
        if (index != -1) {
            this.items.splice(index, 1);
        }
    }
}