# Prisma Migration Guide

## Quick Start

### Normal Workflow

```bash
# For development - creates and applies migration interactively
npm run migrate:dev

# Deploy to production/staging
npm run migrate

# Check status
npm run prisma:migrate:status
```

## Troubleshooting

### Migration Failed or Stuck

If you see an error like `Error: P3009 - migrate found failed migrations`:

```bash
# Automatic recovery (clears stuck migrations)
npm run migrate:fix

# Then retry the migration
npm run migrate
```

### What the Recovery Script Does

The `migrate:fix` script:

1. Connects to your database
2. Finds incomplete migrations (where `finished_at IS NULL`)
3. Removes them from the `_prisma_migrations` table
4. Allows you to retry the migration fresh

**Why this works:** Prisma uses the `_prisma_migrations` table to track which migrations have been applied. If a migration fails partway through, the record remains without a `finished_at` timestamp, blocking all future migrations. The recovery script clears these incomplete records.

### Manual Recovery (if script fails)

```bash
# View stuck migrations
PGPASSWORD="your_password" psql -h localhost -p 5433 -U postgres -d IMY772 \
  -c "SELECT migration_name, finished_at FROM _prisma_migrations WHERE finished_at IS NULL;"

# Delete a specific stuck migration
PGPASSWORD="your_password" psql -h localhost -p 5433 -U postgres -d IMY772 \
  -c "DELETE FROM _prisma_migrations WHERE migration_name = 'MIGRATION_NAME' AND finished_at IS NULL;"

# Verify
PGPASSWORD="your_password" psql -h localhost -p 5433 -U postgres -d IMY772 \
  -c "SELECT COUNT(*) FROM _prisma_migrations WHERE finished_at IS NULL;"
```

## Making Safe Schema Changes

### Best Practices

1. **Add optional columns first, then make required**

    ```prisma
    // Step 1: Add as optional
    newColumn String?

    // After migration runs and is applied:
    // Step 2: Remove the ? to make required
    newColumn String
    ```

2. **Don't drop required columns at the same time as adding them**
    - Prisma auto-migration can fail when combining incompatible operations
    - Split into separate migrations if needed

3. **Always test migrations locally first**

    ```bash
    npm run migrate:dev
    ```

4. **Review generated migrations before applying**
    - Check `prisma/migrations/[timestamp]_[name]/migration.sql`
    - Ensure data migration logic is correct

5. **For dropping columns from non-empty tables:**
    - Ensure migration handles data properly
    - Consider archiving data before dropping

## Understanding Migration Failures

Common causes:

| Error              | Cause                             | Solution                                                  |
| ------------------ | --------------------------------- | --------------------------------------------------------- |
| P3009              | Stuck migration                   | Run `npm run migrate:fix`                                 |
| P3012              | Can't rollback complete migration | Delete the migration file and re-run `prisma migrate dev` |
| Data loss warnings | Dropping columns with data        | Review the migration SQL before applying                  |

## Database Configuration

- **Host:** localhost
- **Port:** 5433
- **Database:** IMY772
- **Prisma Config:** `package.json#prisma` (Prisma 6)
    - Note: Will migrate to `prisma.config.ts` when upgrading to Prisma 7+

## Files to Know

- `prisma/schema.prisma` - Schema definition
- `prisma/migrations/` - Migration history
- `package.json` - Prisma seed configuration (Prisma 6)
- `scripts/fix-migration.sh` - Automatic migration recovery

## Prevention

To avoid migration issues:

1. Keep `package-lock.json` consistent (avoid mixing npm/yarn)
2. Don't manually edit migration files unless you know what you're doing
3. Always commit `prisma/migrations/` to version control
4. Run migrations in order (don't skip them)
5. Test on a database copy if possible

---

**Still stuck?** Check `npm run prisma:migrate:status` for detailed information about pending or failed migrations.
