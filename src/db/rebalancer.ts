import { redis } from "../cache";
import shards from ".";
import { rebuildRing } from "./shard";

const LOAD_KEY = "shard:load";
const INTERVAL = Number(process.env.REBALANCE_INTERVAL_MS) || 60_000;
const IMBALANCE_RATIO = 3;
const IMBALANCE_MIN_OPS = 1_000;

let lastRebalancedAt: Date | null = null;
let migrationInProgress = false;

export function getRebalancerStatus() {
    return {
        shardCount: shards.length,
        lastRebalancedAt: lastRebalancedAt?.toISOString() ?? null,
        migrationInProgress,
    };
}

export async function recordShardAccess(shardId: number) {
    await redis.hincrby(LOAD_KEY, String(shardId), 1);
}

export async function triggerRebalance(): Promise<boolean> {
    if (migrationInProgress) return false;
    migrationInProgress = true;

    try {
        rebuildRing(shards);
        await redis.del(LOAD_KEY);
        lastRebalancedAt = new Date();
        console.log(
            `[rebalancer] ring rebuilt at ${lastRebalancedAt.toISOString()} — ${shards.length} shards`,
        );
        return true;
    } finally {
        migrationInProgress = false;
    }
}

export function startRebalancer() {
    if (shards.length === 0) {
        console.warn("[rebalancer] no shards configured, skipping");
        return;
    }

    setInterval(async () => {
        const raw = await redis.hgetall(LOAD_KEY);
        if (!raw) return;

        const loads = Object.values(raw).map(Number);
        if (loads.length < 2) return;

        const total = loads.reduce((a, b) => a + b, 0);
        if (total < IMBALANCE_MIN_OPS) return;

        const max = Math.max(...loads);
        const min = Math.min(...loads);

        if (max > min * IMBALANCE_RATIO) {
            console.log(
                `[rebalancer] imbalance detected (min=${min}, max=${max}, total=${total}) — rebalancing`,
            );
            await triggerRebalance();
        }
    }, INTERVAL);

    console.log(
        `[rebalancer] started — ${shards.length} shards, checking every ${INTERVAL}ms`,
    );
}
