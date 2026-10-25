#!/bin/bash
set -euo pipefail

PGBIN=$(ls -d /usr/lib/postgresql/*/bin | head -n1)
PGDATA=/var/lib/postgresql/data
DB_NAME=darkhold_exchange

PIDS=()
cleanup() {
  trap - EXIT
  echo "[shutdown] stopping services"
  for p in "${PIDS[@]:-}"; do [ -n "$p" ] && kill "$p" 2>/dev/null || true; done
  su postgres -c "$PGBIN/pg_ctl -D $PGDATA -m fast stop" || true
}
trap cleanup EXIT
trap 'exit 0' TERM INT

mkdir -p "$PGDATA" "$WAL_DIR"
chown -R postgres:postgres "$PGDATA"
chmod 700 "$PGDATA"

# ---- 1. PostgreSQL (first run creates the cluster) ----
if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "[init] creating postgres cluster"
  su postgres -c "$PGBIN/initdb -D $PGDATA -U postgres -A trust"
fi
su postgres -c "$PGBIN/pg_ctl -D $PGDATA -o '-c listen_addresses=127.0.0.1' -w start"

if ! su postgres -c "psql -U postgres -tAc \"SELECT 1 FROM pg_database WHERE datname='$DB_NAME'\"" | grep -q 1; then
  su postgres -c "createdb -U postgres $DB_NAME"
fi

# ---- 2. Migrations + one-time seed ----
cd /app/backend
# the committed migration is out of date vs schema.prisma, so sync the schema directly
npx prisma db push --skip-generate
if [ ! -f "$PGDATA/.seeded" ] || ! su postgres -c "psql -U postgres -d $DB_NAME -tAc \"SELECT 1 FROM \\\"User\\\" WHERE id='sim_mm_dfest'\"" 2>/dev/null | grep -q 1; then
  echo "[init] seeding database..."
  npx tsx prisma/seed.ts
  touch "$PGDATA/.seeded"
fi

# ---- 3. Start services ----
darkhold-engine & PIDS+=($!)

( cd /app/backend  && exec npx tsx src/server.ts ) & PIDS+=($!)

( cd /app/frontend && exec npx next start -p 3000 -H 0.0.0.0 ) & PIDS+=($!)

if [ "${MATCHING_SIM_ENABLED:-true}" = "true" ]; then
  (
    echo "[init] waiting for backend health before launching simulator..."
    until node -e "http=require('http'); http.get('http://127.0.0.1:4000/health', res => process.exit(res.statusCode===200?0:1)).on('error', ()=>process.exit(1));" 2>/dev/null; do
      sleep 1
    done
    echo "[ready] simulator starting on :7100 (mode: ${SIM_MODE:-continuous})..."
    cd /app/matching_engine/sim && exec node dist/main.js
  ) & PIDS+=($!)
fi

echo "[ready] frontend :3000 | backend :4000 | engine :7000 (internal) | sim :7100"

# if any process dies, bring everything down so Docker can restart the container
wait -n
echo "[error] a service exited, shutting down"
exit 1