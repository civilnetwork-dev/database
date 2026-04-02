export const BANNED_DOMAINS = new Set([
    "xvideos.com",
    "pornhub.com",
    "xnxx.com",
    "xhamster.com",
    "redtube.com",
    "youporn.com",
    "tube8.com",
    "spankbang.com",
    "eporner.com",
    "brazzers.com",
    "naughtyamerica.com",
    "onlyfans.com",
    "chaturbate.com",
    "livejasmin.com",
    "camsoda.com",
    "bongacams.com",
    "myfreecams.com",
    "stripchat.com",
]);

export function matchBannedDomain(url: string): string | null {
    try {
        const hostname = new URL(url).hostname
            .toLowerCase()
            .replace(/^www\./, "");
        return BANNED_DOMAINS.has(hostname) ? hostname : null;
    } catch {
        return null;
    }
}
