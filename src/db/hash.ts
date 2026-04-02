interface Node<T> {
    key: number;
    value: T;
}

export default class ConsistentHash<T> {
    #ring: Node<T>[] = [];

    constructor(nodes: T[], replicas = 100) {
        for (const node of nodes) {
            for (let i = 0; i < replicas; i++) {
                const hash = this.#hash(`${(node as any).id}:${i}`);
                this.#ring.push({ key: hash, value: node });
            }
        }

        this.#ring.sort((a, b) => a.key - b.key);
    }

    #hash(str: string) {
        let h = 0;

        for (let i = 0; i < str.length; i++) {
            h = (h * 31 + str.charCodeAt(i)) >>> 0;
        }

        return h;
    }

    get(key: string | number): T {
        const h = this.#hash(String(key));

        for (const node of this.#ring) {
            if (node.key >= h) return node.value;
        }

        return this.#ring[0].value;
    }
}
