import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Prisma Migration Recovery Tool')
    console.log('================================')

    // On a fresh database the migrations table won't exist yet — nothing to fix
    const tableExists = await prisma.$queryRaw`
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = '_prisma_migrations'
        ) AS exists
    `
    if (!tableExists[0]?.exists) {
        console.log('No migrations table yet (fresh database) — skipping.')
        return
    }

    const incomplete = await prisma.$queryRaw`
        SELECT migration_name
        FROM _prisma_migrations
        WHERE finished_at IS NULL
    `

    if (incomplete.length === 0) {
        console.log('No stuck migrations found.')
        return
    }

    console.log(`Found ${incomplete.length} stuck migration(s):`)

    for (const row of incomplete) {
        const name = row.migration_name
        console.log(`  Removing: ${name}`)
        await prisma.$executeRaw`
            DELETE FROM _prisma_migrations
            WHERE migration_name = ${name}
            AND finished_at IS NULL
        `
    }

    console.log('Done. Run "npx prisma migrate deploy" to retry migrations.')
}

main()
    .catch((e) => {
        // Non-fatal — log and continue so the container doesn't restart-loop
        console.error('Error:', e.message)
        process.exit(0)
    })
    .finally(() => prisma.$disconnect())
