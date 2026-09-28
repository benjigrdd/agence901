#!/usr/bin/env bash
# Restauration des DONNEES d'un dump (format custom) dans une base Supabase dont le schema vient des
# migrations du depot. Usage : scripts/backup/restore-data.sh <dump> <url-postgres-superutilisateur>
# (docs/runbooks/restauration.md).
set -euo pipefail
dump="$1"
url="$2"
here="$(cd "$(dirname "$0")" && pwd)"
list="$(mktemp)"
# Tables de suivi des migrations exclues (deja remplies par la base cible).
pg_restore --list "$dump" | grep -E ' TABLE DATA ' | grep -vE ' auth schema_migrations | storage migrations ' > "$list"
psql "$url" -v ON_ERROR_STOP=1 -q -f "$here/prepare-restore.sql"
pg_restore --data-only --disable-triggers --no-owner --exit-on-error -L "$list" -d "$url" "$dump"
psql "$url" -v ON_ERROR_STOP=1 -f "$here/restore-check.sql"
rm -f "$list"
