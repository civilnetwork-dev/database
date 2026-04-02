-- Run this on every shard database
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_banned   BOOLEAN     NOT NULL DEFAULT FALSE,
    ban_reason  TEXT,
    banned_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS visits (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url         TEXT        NOT NULL,
    visited_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visits_user_id    ON visits(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON visits(visited_at DESC);
