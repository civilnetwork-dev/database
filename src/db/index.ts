import postgres from "postgres";

interface Shard {
    id: number;
    primary: ReturnType<typeof postgres>;
    replicas: ReturnType<typeof postgres>[];
}

function loadShards(): Shard[] {
    const shards: Record<number, Shard> = {};

    for (const [key, rawValue] of Object.entries(process.env)) {
        if (!key.startsWith("DB_")) continue;

        const match = key.match(/^DB_(\d+)(?:_REPLICA_(\d+))?$/);
        if (!match) continue;

        const value = rawValue?.trim();

        if (
            !value ||
            (!value.startsWith("postgres://") &&
                !value.startsWith("postgresql://"))
        ) {
            console.warn(
                `[db] skipping ${key}: not a postgres URL (got: "${value?.slice(0, 30)}")`,
            );
            continue;
        }

        const shardId = Number(match[1]);
        const replicaId = match[2] ? Number(match[2]) : null;

        if (!shards[shardId]) {
            shards[shardId] = {
                id: shardId,
                primary: null as any,
                replicas: [],
            };
        }

        try {
            if (replicaId === null) {
                shards[shardId].primary = postgres(value, { max: 20 });
            } else {
                shards[shardId].replicas[replicaId] = postgres(value, {
                    max: 10,
                });
            }
        } catch (err) {
            console.error(
                `[db] failed to initialise ${key}: ${(err as Error).message}`,
            );
        }
    }

    const result = Object.values(shards)
        .filter(s => s.primary != null)
        .sort((a, b) => a.id - b.id);

    if (result.length === 0) {
        console.warn(
            "[db] no shards configured — set DB_0=postgres://user:pass@host:5432/dbname",
        );
    }

    return result;
}

export default loadShards();
