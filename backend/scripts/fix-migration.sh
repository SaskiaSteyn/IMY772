#!/bin/bash
# Migration Recovery Script
# This script fixes stuck Prisma migrations without manual intervention

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔧 Prisma Migration Recovery Tool${NC}"
echo "========================================"

# Check if .env exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    exit 1
fi

# Load environment variables
export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)

# Ensure PRISMA_DATABASE_URL is set
if [ -z "$PRISMA_DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: PRISMA_DATABASE_URL not set in .env${NC}"
    exit 1
fi

# Parse database URL
DB_HOST=$(echo $PRISMA_DATABASE_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
DB_PORT=$(echo $PRISMA_DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_USER=$(echo $PRISMA_DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\).*/\1/p')
DB_NAME=$(echo $PRISMA_DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo -e "${YELLOW}📍 Database: $DB_HOST:$DB_PORT/$DB_NAME${NC}"

# Function to run psql command
run_psql() {
    PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" "$@"
}

echo -e "${YELLOW}🔍 Checking for stuck migrations...${NC}"

# Check for incomplete migrations
INCOMPLETE_COUNT=$(run_psql --pset=pager=off -t -c "SELECT COUNT(*) FROM _prisma_migrations WHERE finished_at IS NULL;" 2>/dev/null || echo "0")
INCOMPLETE_COUNT=$(echo $INCOMPLETE_COUNT | xargs)

if [ "$INCOMPLETE_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ No stuck migrations found${NC}"
    exit 0
fi

echo -e "${YELLOW}⚠️  Found $INCOMPLETE_COUNT incomplete migration(s)${NC}"

# Get the incomplete migration names
run_psql --pset=pager=off -t -c "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL;" | while read migration_name; do
    if [ -z "$migration_name" ]; then
        continue
    fi
    
    echo -e "${YELLOW}🗑️  Removing incomplete migration: $migration_name${NC}"
    run_psql -c "DELETE FROM _prisma_migrations WHERE migration_name = '$migration_name' AND finished_at IS NULL;" > /dev/null
done

echo -e "${GREEN}✅ All stuck migrations have been cleared${NC}"
echo -e "${YELLOW}⏭️  Run 'npm run migrate' or 'yarn migrate' to retry${NC}"
