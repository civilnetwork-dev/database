export default class QueryBuilder<T> {
    #table: string;
    #whereClause: Record<string, any> = {};
    #limitCount?: number;

    constructor(table: string) {
        this.#table = table;
    }

    where(clause: Partial<T>) {
        Object.assign(this.#whereClause, clause);
        return this;
    }

    limit(n: number) {
        this.#limitCount = n;
        return this;
    }

    async execute(db: any): Promise<T[]> {
        return db`
            SELECT * FROM ${db(this.#table)}
            ${
                Object.keys(this.#whereClause).length
                    ? db`WHERE ${db(this.#whereClause)}`
                    : db``
            }
            ${this.#limitCount ? db`LIMIT ${this.#limitCount}` : db``}
        `;
    }
}
