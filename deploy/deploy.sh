#!/usr/bin/env bash
#
# On-box deploy for the MicroTrack EC2 host. Run by the deploy workflow via SSM
# (as root); safe to run by hand.
#
# Usage: deploy.sh [--no-fetch] [--ref <git-ref>]
#   --no-fetch   caller already fetched origin/main.
#   --ref <ref>  deploy this exact ref (default origin/main).

set -euo pipefail

APP_DIR=/home/ubuntu/IMY772
WEB_ROOT=/var/www/microtrack
BRANCH=main
APP_USER=ubuntu
HEALTH_URL=http://localhost:3000/api/auth/me
HEALTH_TIMEOUT=180

DO_FETCH=1
DEPLOY_REF="origin/$BRANCH"
while [ $# -gt 0 ]; do
  case "$1" in
    --no-fetch) DO_FETCH=0 ;;
    --ref)      shift; DEPLOY_REF="${1:?--ref needs a value}" ;;
    *)          echo "unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done

log()     { echo "[deploy $(date -u +%H:%M:%S)] $*"; }
as_user() { sudo -u "$APP_USER" bash -lc "$1"; }
git_u()   { sudo -u "$APP_USER" git -C "$APP_DIR" "$@"; }

log "=== MicroTrack deploy start (ref=$DEPLOY_REF, fetch=$DO_FETCH) ==="

cd "$APP_DIR"
cp -f docker-compose.yml /tmp/dc.prod.keep   # prod compose: RDS + awslogs, no local db
PREV_SHA=$(git_u rev-parse HEAD)             # for rollback

# committed compose has a throwaway local db; always restore the prod one after git ops
restore_compose() {
  cp -f /tmp/dc.prod.keep "$APP_DIR/docker-compose.yml"
  chown "$APP_USER:$APP_USER" "$APP_DIR/docker-compose.yml"
}

[ "$DO_FETCH" -eq 1 ] && git_u fetch --prune origin "$BRANCH"
git_u reset --hard "$DEPLOY_REF"
NEW_SHA=$(git_u rev-parse --short HEAD)
restore_compose
log "synced to $DEPLOY_REF @ $NEW_SHA"

TS=""
rollback() {
  log "!!! ROLLBACK -> $PREV_SHA !!!"
  git_u reset --hard "$PREV_SHA" || true
  restore_compose
  if [ -n "$TS" ] && [ -d "${WEB_ROOT}.bak.${TS}" ]; then
    rm -rf "$WEB_ROOT" && mv "${WEB_ROOT}.bak.${TS}" "$WEB_ROOT" || true
  fi
  ( cd "$APP_DIR" && { docker compose down || true; } && docker compose up -d ) || true
  log "rollback done — VERIFY PROD MANUALLY"
}

# build before touching live services, so a build failure leaves prod untouched
log "building frontend (memory-capped for 2 GB box)..."
as_user "cd '$APP_DIR/frontend' \
  && npm install --no-audit --no-fund \
  && NODE_OPTIONS='--max-old-space-size=768' npm run build"

if [ ! -f "$APP_DIR/frontend/dist/index.html" ]; then
  log "ERROR: build produced no dist/index.html — aborting (prod untouched)"
  exit 1
fi

TS=$(date +%s)
STAGE="${WEB_ROOT}.new.${TS}"
rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -a "$APP_DIR/frontend/dist/." "$STAGE/"
chown -R "$APP_USER:$APP_USER" "$STAGE"

log "publishing -> $WEB_ROOT (backup ${WEB_ROOT}.bak.${TS})"
mv "$WEB_ROOT" "${WEB_ROOT}.bak.${TS}"
mv "$STAGE" "$WEB_ROOT"
ls -dt "${WEB_ROOT}".bak.* 2>/dev/null | tail -n +4 | xargs -r rm -rf   # keep 3 backups

cd "$APP_DIR"
log "restarting backend container..."
docker compose down || true
docker compose up -d

# each restart orphans the previous anonymous node_modules volume (~300 MB);
# prune it or the root disk fills (ENOSPC). In-use volumes are kept.
docker volume prune -f >/dev/null 2>&1 || true

# up -d returns before the container finishes npm install + prisma migrate + start.
# Poll so a crash/failed migration rolls back and fails the deploy. Any non-5xx,
# non-000 response means the backend is serving (survives the probe needing auth).
log "waiting for backend..."
DEADLINE=$(( SECONDS + HEALTH_TIMEOUT ))
while [ $SECONDS -lt $DEADLINE ]; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" 2>/dev/null || true)
  if [[ "$CODE" =~ ^[2-4][0-9][0-9]$ ]]; then
    log "=== deploy OK @ $NEW_SHA (backend serving, HTTP $CODE) ==="
    exit 0
  fi
  log "  not ready (HTTP ${CODE:-000}); retrying..."
  sleep 5
done

log "ERROR: backend unhealthy after ${HEALTH_TIMEOUT}s"
docker logs imy772-backend --tail 30 2>&1 | sed -E 's/(PASSWORD|SECRET|KEY|TOKEN)=[^ ]*/\1=<redacted>/gI' || true
rollback
exit 1
