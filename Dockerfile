# syntax=docker/dockerfile:1
# ---------------------------------------------------------------
# Darkhold Exchange - all-in-one image
# Runs: PostgreSQL + Rust matching engine + Express backend + Next.js frontend
# ---------------------------------------------------------------

# ---------- Stage 1: build the Rust matching engine ----------
FROM rust:1.89-bookworm AS engine-builder
WORKDIR /src
COPY matching_engine/engine/ ./
RUN cargo build --release -p darkhold-engine

# ---------- Stage 2: runtime image ----------
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        postgresql postgresql-client openssl ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Engine binary
COPY --from=engine-builder /src/target/release/darkhold-engine /usr/local/bin/darkhold-engine

# 1) candles package (backend depends on it via file:../matching_engine/packages/candles)
COPY matching_engine/packages/candles/ ./matching_engine/packages/candles/
RUN cd matching_engine/packages/candles && npm ci && npm run build

# 2) backend deps (cached unless package files change)
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci

# 3) frontend deps
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci

# 4) rest of the source
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY ops/ ./ops/

# 5) prisma client + frontend production build
RUN cd backend && npx prisma generate
# BACKEND_URL is read at build time by next.config.mjs rewrites (/api/* -> backend)
ENV BACKEND_URL=http://localhost:4000
RUN cd frontend && npm run build

# ---------- runtime configuration ----------
ENV NODE_ENV=production \
    PORT=4000 \
    FRONTEND_URL=http://localhost:3000 \
    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/darkhold_exchange?schema=public" \
    SESSION_SECRET="change-me-in-real-deployments" \
    SESSION_EXPIRY_HOURS=24 \
    COOKIE_SECURE=false \
    RATE_LIMIT_WINDOW_MS=60000 \
    RATE_LIMIT_MAX_REQUESTS=100 \
    AUTH_RATE_LIMIT_MAX_ATTEMPTS=5 \
    MATCHING_SIM_ENABLED=true \
    WS_ENABLED=true \
    ENGINE_URL=http://localhost:7000 \
    ENGINE_TOKEN=dev-token \
    ENGINE_BIND=0.0.0.0:7000 \
    WAL_DIR=/data/engine \
    LOG_FORMAT=pretty

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

VOLUME ["/var/lib/postgresql/data", "/data/engine"]
EXPOSE 3000 4000

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
