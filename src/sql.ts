import postgres from "postgres";

const sql = postgres({
    host: undefined,
    database: undefined,
    idle_timeout: 0,
    max: 0,
});

export function sqlObj(obj: Record<string, unknown>) {
    return sql(obj as any);
}

export function sqlId(identifier: string) {
    return sql(identifier as any);
}
