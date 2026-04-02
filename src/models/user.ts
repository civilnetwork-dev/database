import { getDB } from "../db/shard";
import { cached, invalidateTag, redis } from "../cache";

export interface User {
    id: string;
    created_at: string;
    is_banned: boolean;
    ban_reason: string | null;
    banned_at: string | null;
}

export async function createUser(id: string): Promise<User> {
    const db = getDB(id);
    const [user] = await db<User[]>`
        INSERT INTO users (id)
        VALUES (${id})
        ON CONFLICT (id) DO UPDATE SET id = EXCLUDED.id
        RETURNING *
    `;
    return user;
}

export async function getUser(id: string): Promise<User | null> {
    return cached(
        `user:${id}`,
        300,
        async () => {
            const db = getDB(id, true);
            const [user] = await db<User[]>`
                SELECT * FROM users WHERE id = ${id} LIMIT 1
            `;
            return user ?? null;
        },
        [`user:${id}`],
    );
}

export async function isUserBanned(id: string): Promise<boolean> {
    const cached = await redis.get(`banned:${id}`);
    if (cached !== null) return cached === "1";

    const user = await getUser(id);
    const banned = user?.is_banned ?? false;
    await redis.set(`banned:${id}`, banned ? "1" : "0", "EX", 300);
    return banned;
}

export async function banUser(id: string, reason: string): Promise<User> {
    const db = getDB(id);
    const [user] = await db<User[]>`
        UPDATE users
        SET is_banned = TRUE, ban_reason = ${reason}, banned_at = NOW()
        WHERE id = ${id}
        RETURNING *
    `;
    await invalidateTag(`user:${id}`);
    await redis.set(`banned:${id}`, "1", "EX", 300);
    return user;
}

export async function unbanUser(id: string): Promise<User> {
    const db = getDB(id);
    const [user] = await db<User[]>`
        UPDATE users
        SET is_banned = FALSE, ban_reason = NULL, banned_at = NULL
        WHERE id = ${id}
        RETURNING *
    `;
    await invalidateTag(`user:${id}`);
    await redis.del(`banned:${id}`);
    return user;
}
