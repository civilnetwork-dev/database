import { getDB } from "../db/shard";
import { matchBannedDomain } from "../shared/banned-domains";

export interface Visit {
    id: string;
    user_id: string;
    url: string;
    visited_at: string;
}

export { matchBannedDomain as isBannedUrl };

export async function recordVisit(userId: string, url: string): Promise<Visit> {
    const db = getDB(userId);
    const [visit] = await db<Visit[]>`
        INSERT INTO visits (user_id, url)
        VALUES (${userId}, ${url})
        RETURNING *
    `;
    return visit;
}
