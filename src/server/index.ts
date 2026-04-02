import { createYoga } from "graphql-yoga";
import { schema } from "../graphql/schema";
import { startRebalancer } from "../db/rebalancer";

const PORT = Number(process.env.PORT) || 4000;
const ALLOWED_ORIGIN =
    process.env.ALLOWED_ORIGIN || "https://civil.quartinal.me";

const yoga = createYoga({
    schema,
    cors: {
        origin: ALLOWED_ORIGIN,
        credentials: true,
        methods: ["GET", "POST", "OPTIONS"],
    },
    graphiql: process.env.NODE_ENV !== "production",
    landingPage: false,
});

startRebalancer();

Bun.serve({
    port: PORT,
    fetch(req) {
        if (new URL(req.url).pathname === "/health") {
            return new Response("ok");
        }
        return yoga.fetch(req, this);
    },
});

console.log(`civil2-db running on http://localhost:${PORT}/graphql`);
