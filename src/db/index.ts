import postgres from "postgres";

interface Shard {
    id: number;
    primary: ReturnType<typeof postgres>;
    replicas: ReturnType<typeof postgres>[];
}

function loadShards(): Shard[] {
    const shards: Record<number, Shard> = {};

    for (const [key, value] of Object.entries(process.env)) {
        if (!key.startsWith("DB_")) continue;

        const match = key.match(/^DB_(\d+)(?:_REPLICA_(\d+))?$/);
        if (!match) continue;

        const shardId = Number(match[1]);
        const replicaId = match[2] ? Number(match[2]) : null;

        if (!shards[shardId]) {
            shards[shardId] = {
                id: shardId,
                primary: null as any,
                replicas: [],
            };
        }

        if (replicaId === null) {
            shards[shardId].primary = postgres(value!, { max: 20 });
        } else {
            shards[shardId].replicas[replicaId] = postgres(value!, { max: 10 });
        }
    }

    return Object.values(shards).sort((a, b) => a.id - b.id);
}

export default loadShards();
