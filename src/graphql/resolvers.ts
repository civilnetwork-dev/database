import {
    createUser,
    getUser,
    isUserBanned,
    banUser,
    unbanUser,
} from "../models/user";
import { isBannedUrl, recordVisit } from "../models/visit";
import { getRebalancerStatus, triggerRebalance } from "../db/rebalancer";

function mapUser(u: Awaited<ReturnType<typeof getUser>>) {
    if (!u) return null;
    return {
        id: u.id,
        createdAt: u.created_at,
        isBanned: u.is_banned,
        banReason: u.ban_reason,
        bannedAt: u.banned_at,
    };
}

function mapVisit(v: {
    id: string;
    user_id: string;
    url: string;
    visited_at: string;
}) {
    return {
        id: v.id,
        userId: v.user_id,
        url: v.url,
        visitedAt: v.visited_at,
    };
}

export const resolvers = {
    Query: {
        user: async (_: unknown, { id }: { id: string }) =>
            mapUser(await getUser(id)),

        isUserBanned: (_: unknown, { id }: { id: string }) => isUserBanned(id),

        rebalancerStatus: () => getRebalancerStatus(),
    },

    Mutation: {
        createUser: async (_: unknown, { id }: { id: string }) =>
            mapUser(await createUser(id)),

        trackVisit: async (
            _: unknown,
            { userId, url }: { userId: string; url: string },
        ) => {
            if (await isUserBanned(userId)) {
                const visit = await recordVisit(userId, url);
                return {
                    visit: mapVisit(visit),
                    userBanned: true,
                    banReason: "Previously banned",
                };
            }

            const visit = await recordVisit(userId, url);
            const bannedDomain = isBannedUrl(url);

            if (bannedDomain) {
                const reason = `Visited restricted domain: ${bannedDomain}`;
                await banUser(userId, reason);
                return {
                    visit: mapVisit(visit),
                    userBanned: true,
                    banReason: reason,
                };
            }

            return {
                visit: mapVisit(visit),
                userBanned: false,
                banReason: null,
            };
        },

        banUser: async (
            _: unknown,
            { userId, reason }: { userId: string; reason: string },
        ) => mapUser(await banUser(userId, reason)),

        unbanUser: async (_: unknown, { userId }: { userId: string }) =>
            mapUser(await unbanUser(userId)),

        triggerRebalance: () => triggerRebalance(),
    },
};
