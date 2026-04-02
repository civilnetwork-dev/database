FROM oven/bun:1.2-alpine AS deps

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.2-alpine AS runner

RUN addgroup -g 1001 -S civil && \
    adduser  -u 1001 -S civil -G civil -h /app -s /sbin/nologin

WORKDIR /app

COPY --from=deps --chown=civil:civil /app/node_modules ./node_modules

COPY --chown=civil:civil src     ./src
COPY --chown=civil:civil package.json ./

USER civil

ENV NODE_ENV=production \
    PORT=4000

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- "http://localhost:${PORT}/health" | grep -q "^ok$" || exit 1

CMD ["bun", "run", "src/run.ts"]
