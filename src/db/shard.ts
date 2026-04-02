import shards from ".";
import ConsistentHash from "./hash";

let ring = new ConsistentHash(shards);

export function rebuildRing(nodes: typeof shards) {
    ring = new ConsistentHash(nodes);
}

export function getShard(key: string | number) {
    return ring.get(key);
}

export function getDB(key: string | number, read = false) {
    const shard = getShard(key);

    if (read && shard.replicas.length) {
        return shard.replicas[
            Math.floor(Math.random() * shard.replicas.length)
        ];
    }

    return shard.primary;
}
