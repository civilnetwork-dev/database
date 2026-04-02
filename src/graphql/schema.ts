import { createSchema } from "graphql-yoga";
import { resolvers } from "./resolvers";

const typeDefs = `
    type User {
        id: ID!
        createdAt: String!
        isBanned: Boolean!
        banReason: String
        bannedAt: String
    }

    type Visit {
        id: ID!
        userId: ID!
        url: String!
        visitedAt: String!
    }

    type TrackVisitResult {
        visit: Visit!
        userBanned: Boolean!
        banReason: String
    }

    type RebalancerStatus {
        shardCount: Int!
        lastRebalancedAt: String
        migrationInProgress: Boolean!
    }

    type Query {
        """Look up a user by their IndexedDB-persisted UUID."""
        user(id: ID!): User

        """Fast Redis-cached ban check."""
        isUserBanned(id: ID!): Boolean!

        """Current state of the auto-shard rebalancer."""
        rebalancerStatus: RebalancerStatus!
    }

    type Mutation {
        """
        Called on first site visit. Idempotent — safe to call even if the
        user already exists (ON CONFLICT DO UPDATE).
        """
        createUser(id: ID!): User!

        """
        Record a proxied URL visit. Automatically bans the user if the
        destination matches a restricted domain (e.g. pornhub.com).
        """
        trackVisit(userId: ID!, url: String!): TrackVisitResult!

        """Manually ban a user with an explicit reason."""
        banUser(userId: ID!, reason: String!): User!

        """Lift a ban."""
        unbanUser(userId: ID!): User!

        """Force an immediate ring rebuild and load-counter reset."""
        triggerRebalance: Boolean!
    }
`;

export const schema = createSchema({ typeDefs, resolvers });
