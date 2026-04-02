type Resolver<T> = (keys: any[]) => Promise<T[]>;

export default function createBatcher<T>(resolver: Resolver<T>) {
    let queue: any[] = [];
    let resolvers: Function[] = [];
    let scheduled = false;

    async function flush() {
        const keys = queue;
        const res = resolvers;

        queue = [];
        resolvers = [];
        scheduled = false;

        const results = await resolver(keys);

        res.forEach((r, i) => r(results[i]));
    }

    return (key: any) => {
        return new Promise<T>(resolve => {
            queue.push(key);
            resolvers.push(resolve);

            if (!scheduled) {
                scheduled = true;
                queueMicrotask(flush);
            }
        });
    };
}
