#!/usr/bin/env bash
# Applies every migration, in order, to an empty Postgres database.
# Usage: DATABASE_URL=postgres://user:pass@host:port/db scripts/test-migrations.sh
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL to an EMPTY throwaway database}"
cd "$(dirname "$0")/.."
psql() { command psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -o /dev/null "$@"; }

echo "→ Supabase stand-in (auth schema)"
psql -f supabase/tests/auth_stub.sql
for f in supabase/migrations/*.sql; do
  echo "→ $f"
  psql -f "$f"
done
for f in supabase/tests/*_test.sql; do
  [ -e "$f" ] || continue
  echo "→ $f"
  psql -f "$f"
done
echo "✓ all migrations applied"
