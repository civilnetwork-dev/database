import Redis from "ioredis";
import { encode, decode } from "./db/msgpack";

export const redis = new Redis(process.env.REDIS_URL!);

export async function cached<T>(
    key: string,
    ttl: number,
    fn: () => Promise<T>,
    tags: string[] = [],
): Promise<T> {
    const hit = await redis.getBuffer(key);
    if (hit) return decode(hit);

    const result = await fn();

    await redis.set(key, encode(result) as any, "EX", ttl);

    for (const tag of tags) {
        await redis.sadd(`tag:${tag}`, key);
    }

    return result;
}

export async function invalidateTag(tag: string) {
    const keys = await redis.smembers(`tag:${tag}`);
    if (keys.length) await redis.del(...keys);
}
