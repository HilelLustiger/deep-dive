import { Comparator } from "./comparators";

class Node<K, V> {
    key: K;
    val: V;
    left: Node<K, V> | null;
    right: Node<K, V> | null;
    size: number;

    constructor(key: K, val: V, left: Node<K, V> | null, right: Node<K, V> | null) {
        this.key = key;
        this.val = val;
        this.left = left;
        this.right = right;
        this.size = sizeOf(this.left) + sizeOf(this.right) + 1
    }
}

export class BST<K, V> {
    private comparator: Comparator<K>;
    private root: Node<K, V> | null;

    constructor(comparator: Comparator<K>) {
        this.comparator = comparator
        this.root = null
    }

    size(): number {
        return sizeOf(this.root);
    } 

    isEmpty(): boolean {
        return this.root? false : true
    }

    get(key: K): V | undefined {
        return this.getValue(this.root, key);
    }
    
    has(key: K): boolean {
        return this.hasKey(this.root, key);
    }

    put(key: K, val: V): void {
        this.root = this.putNode(this.root, key, val);
    }

    min(): K | undefined {
        return this.getMinNode(this.root)?.key;
    }

    max(): K | undefined {
        return this.getMaxNode(this.root)?.key;
    }

    floor(key: K): K | undefined {
        return this.getFloorNode(this.root, key)?.key;
    }

    ceiling(key: K): K | undefined {
        return this.getCeilNode(this.root, key)?.key;
    }

    rank(key: K): number {
        return this.getRank(this.root, key);
    }

    select(k: number): K {
        if (!Number.isInteger(k) || k < 0 || k > this.size() - 1) {
            throw new RangeError();
        }
        return this.selectNode(this.root, k)!.key;
    }

    keys(): K[] {
        return this.getKeys(this.root, []);
    }

    keysBetween(lo: K, hi: K): K[] {
        const arr: K[] = [];
        this.getKeysBetween(this.root, lo, hi, arr);
        return arr;
    }

    *[Symbol.iterator](): Generator<[K, V]> {
        yield* this.helper(this.root);
    }

    deleteMin(): void {
        this.root = this.deleteMinNode(this.root);
    }

    delete(key: K): boolean {
        const output = this.has(key);
        if (output) {
            this.root = this.deleteNode(this.root, key);
        }
        return output;
    }

    height(): number {
        return this.getHeight(this.root);
    }


    // - - - helpers - - -

    private getValue(node: Node<K, V> | null, key: K): V | undefined {
        if (!node) {
            return undefined;
        }

        const res = this.comparator(node.key, key)
        if (res === 0) {
            return node.val;
        } else if (res < 0) {
            return this.getValue(node.right, key);
        } else {
            return this.getValue(node.left, key);
        }
    }
    
    private hasKey(node: Node<K, V> | null, key: K): boolean {
        if (!node) {
            return false
        }

        const res = this.comparator(node.key, key);
        if (res === 0) {
            return true;
        } else if (res < 0) {
            return this.hasKey(node.right, key);
        } else {
            return this.hasKey(node.left, key);
        }
    }

    private putNode(node: Node<K, V> | null, key: K, val: V): Node<K, V> {
        if (!node) {
            return new Node(key, val, null, null);
        }
        
        const res = this.comparator(node.key, key);
        
        if (res === 0) {
            node.val = val;
        } else if (res < 0) {
            node.right =  this.putNode(node.right, key, val);
        } else {
            node.left = this.putNode(node.left, key, val);
        }

        node.size = sizeOf(node.left) + sizeOf(node.right) + 1;
        
        return node
    }

    private getMinNode(node: Node<K, V> | null): Node<K, V> | null {
        if (!node) {
            return null;
        }

        while(node.left) {
            node = node.left;
        }

        return node;
    }

    private getMaxNode(node: Node<K, V> | null): Node<K, V> | null {
        if (!node) {
            return null;
        }

        while (node.right) {
            node = node.right;
        }

        return node;
    }

    private getFloorNode(node: Node<K, V> | null, key: K): Node<K, V> | null {
        if (!node) {
            return null;
        }
        const res = this.comparator(node.key, key);

        if (res === 0) {
            return node;
        } else if (res < 0) {
            const rightRes = this.getFloorNode(node.right, key);
            return rightRes? rightRes : node;
        } else {
            return this.getFloorNode(node.left, key);
        }
    }

    private getCeilNode(node: Node<K, V> | null, key: K): Node<K, V> | null {
        if (!node) {
            return null;
        }

        const res = this.comparator(node.key, key);
        if (res === 0) {
            return node;
        } else if (res < 0) {
            return this.getCeilNode(node.right, key);
        } else {
            const leftRes = this.getCeilNode(node.left, key);
            return leftRes? leftRes : node;
        }
    }

    private getRank(node: Node<K, V> | null, key: K): number {
        if (!node) {
            return 0;
        }
        const res = this.comparator(node.key, key);
        if (res === 0) {
            return sizeOf(node.left);
        } else if (res < 0) {
            return sizeOf(node.left) + this.getRank(node.right, key) + 1;
        } else {
            return this.getRank(node.left, key);
        }
    }

    private selectNode(node: Node<K, V> | null, k: number): Node<K, V> | null {
        if (!node) {
            return null;
        }
        
        const leftSize = sizeOf(node.left);
        const res = k - leftSize;

        if (res === 0){
            return node;
        } else if (res > 0) {
            return this.selectNode(node.right, res - 1);
        } else {
            return this.selectNode(node.left, k);
        }

    }

    private getKeys(node: Node<K, V> | null, arr: K[]): K[] {
        if(!node) {
            return arr;
        }

        this.getKeys(node.left, arr);
        arr.push(node.key);
        this.getKeys(node.right, arr);
        return arr;
    }

    private getKeysBetween(node: Node<K, V> | null, low: K, high: K, arr: K[]): void {
        if(!node) {
            return;
        }

        const lowRes = this.comparator(node.key, low);
        const highRes = this.comparator(node.key, high);

        if (lowRes < 0) { 
            this.getKeysBetween(node.right, low, high, arr);
        } else if (highRes > 0) {
            this.getKeysBetween(node.left, low, high, arr);
        } else {
            this.getKeysBetween(node.left, low, high, arr);
            arr.push(node.key);
            this.getKeysBetween(node.right, low, high, arr);
        }
    }

    private *helper(node: Node<K, V> | null): Generator<[K, V]> {
        if (!node) {
            return
        }

        yield* this.helper(node.left);
        yield [node.key, node.val];
        yield* this.helper(node.right);
    }

    private deleteMinNode(node: Node<K, V> | null): Node<K, V> | null {
        if (!node) {
            return null
        }
        
        if (!node.left) {
            return node.right;
        } else { 
            node.left = this.deleteMinNode(node.left);
        }
         
        node.size = sizeOf(node.right) + sizeOf(node.left) + 1;
        return node; 
    }

    private deleteNode(node: Node<K, V> | null, key: K): Node<K, V> | null {
        if (!node) {
            return null;
        }

        const res = this.comparator(node.key, key);
        if (res === 0) {
            if (!node.left) {
                return node.right;
            }
            if (!node.right) {
                return node.left;
            }
            const successor = this.getMinNode(node.right);
            const newVal = successor!.val
            const newKey = successor!.key
            
            node.right = this.deleteMinNode(node.right);
            node.val = newVal;
            node.key = newKey;


        } else if (res > 0) {
            node.left = this.deleteNode(node.left, key);
        } else {
            node.right = this.deleteNode(node.right, key);
        }
        
        node.size = sizeOf(node.left) + sizeOf(node.right) + 1;
        return node;
    }

    private getHeight(node: Node<K, V> | null): number {
        if (!node) {
            return -1;
        }

        const rightHeight = this.getHeight(node.right);
        const leftHeight = this.getHeight(node.left);

        return Math.max(rightHeight, leftHeight) + 1;
    }
}

function sizeOf<K, V>(node: Node<K, V> | null): number {
    return node? node.size : 0;
}