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
}

function sizeOf<K, V>(node: Node<K, V> | null): number {
    return node? node.size : 0;
}