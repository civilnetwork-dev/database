import { initBannedDomains, matchBannedDomain } from "../shared/banned-domains";

export interface TrackResult {
    userBanned: boolean;
    banReason: string | null;
}

export interface Civil2Client {
    getUserId(): Promise<string>;
    trackVisit(url: string): Promise<TrackResult>;
    isUserBanned(): Promise<boolean>;
}

const IDB_NAME = "civil2";
const IDB_VERSION = 1;

function openIDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains("meta"))
                db.createObjectStore("meta");
            if (!db.objectStoreNames.contains("users"))
                db.createObjectStore("users", { keyPath: "id" });
            if (!db.objectStoreNames.contains("visits"))
                db.createObjectStore("visits", {
                    keyPath: "id",
                    autoIncrement: true,
                });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function idbGet<T>(
    db: IDBDatabase,
    store: string,
    key: IDBValidKey,
): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
        const req = db
            .transaction(store, "readonly")
            .objectStore(store)
            .get(key);
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
    });
}

function idbPut(
    db: IDBDatabase,
    store: string,
    value: unknown,
    key?: IDBValidKey,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const req = db
            .transaction(store, "readwrite")
            .objectStore(store)
            .put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

export function createCivil2Client(options: {
    endpoint: string;
    dev?: boolean;
}): Civil2Client {
    const { endpoint, dev = false } = options;

    const bannedDomainsReady = initBannedDomains();

    let dbPromise: Promise<IDBDatabase> | null = null;
    const getDB = () => (dbPromise ??= openIDB());

    let cachedBan: boolean | null = null;

    async function getUserId(): Promise<string> {
        const db = await getDB();
        const existing = await idbGet<string>(db, "meta", "userId");
        if (existing) return existing;

        const id = crypto.randomUUID();
        await idbPut(db, "meta", id, "userId");
        return id;
    }

    if (dev) {
        async function ensureDevUser(id: string) {
            const db = await getDB();
            const existing = await idbGet<Record<string, unknown>>(
                db,
                "users",
                id,
            );
            if (!existing) {
                await idbPut(db, "users", {
                    id,
                    createdAt: new Date().toISOString(),
                    isBanned: false,
                    banReason: null,
                    bannedAt: null,
                });
            }
        }

        async function devBanUser(id: string, reason: string) {
            const db = await getDB();
            await idbPut(db, "users", {
                id,
                isBanned: true,
                banReason: reason,
                bannedAt: new Date().toISOString(),
            });
            cachedBan = true;
        }

        async function devIsUserBanned(): Promise<boolean> {
            if (cachedBan !== null) return cachedBan;
            const id = await getUserId();
            const db = await getDB();
            const user = await idbGet<{ isBanned: boolean }>(db, "users", id);
            cachedBan = user?.isBanned ?? false;
            return cachedBan;
        }

        return {
            getUserId,

            isUserBanned: devIsUserBanned,

            async trackVisit(url: string): Promise<TrackResult> {
                const id = await getUserId();
                await ensureDevUser(id);

                const db = await getDB();
                await idbPut(db, "visits", {
                    userId: id,
                    url,
                    visitedAt: new Date().toISOString(),
                });

                if (cachedBan || (await devIsUserBanned())) {
                    return { userBanned: true, banReason: "Previously banned" };
                }

                await bannedDomainsReady;
                const match = matchBannedDomain(url);
                if (match) {
                    const reason = `Visited restricted domain: ${match}`;
                    await devBanUser(id, reason);
                    return { userBanned: true, banReason: reason };
                }

                return { userBanned: false, banReason: null };
            },
        };
    }

    async function gql(query: string, variables: Record<string, unknown> = {}) {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ query, variables }),
        });
        const { data, errors } = await res.json();
        if (errors?.length) throw new Error(errors[0].message);
        return data;
    }

    return {
        getUserId,

        async isUserBanned(): Promise<boolean> {
            if (cachedBan !== null) return cachedBan;
            const id = await getUserId();
            const { isUserBanned } = await gql(
                `query($id: ID!) { isUserBanned(id: $id) }`,
                { id },
            );
            cachedBan = isUserBanned;
            return cachedBan!;
        },

        async trackVisit(url: string): Promise<TrackResult> {
            const userId = await getUserId();

            await gql(`mutation($id: ID!) { createUser(id: $id) { id } }`, {
                id: userId,
            });

            const { trackVisit } = await gql(
                `mutation($userId: ID!, $url: String!) {
                    trackVisit(userId: $userId, url: $url) {
                        userBanned
                        banReason
                    }
                }`,
                { userId, url },
            );

            if (trackVisit.userBanned) cachedBan = true;
            return trackVisit as TrackResult;
        },
    };
}
