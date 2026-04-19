import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()

function readMockData() {
    const mockDataPath = path.join(__dirname, '..', 'mock-data-flat.json')
    const mockDataContent = fs.readFileSync(mockDataPath, 'utf-8')
    return JSON.parse(mockDataContent)
}

function toNullableNumber(value) {
    if (value === null || value === undefined || value === '') {
        return null
    }

    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

function toNullableDate(value) {
    if (!value) {
        return null
    }

    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
}

async function ensureAdminDeleteAuditTable() {
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "adminDeleteAudits" (
            "id" SERIAL NOT NULL,
            "actorUserID" INTEGER NOT NULL,
            "actorEmail" VARCHAR(255),
            "entityType" VARCHAR(120) NOT NULL,
            "entityKey" JSONB NOT NULL,
            "reason" TEXT NOT NULL,
            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "adminDeleteAudits_pkey" PRIMARY KEY ("id")
        )
    `)

    await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "adminDeleteAudits_actorUserID_idx" ON "adminDeleteAudits"("actorUserID")'
    )
    await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "adminDeleteAudits_entityType_idx" ON "adminDeleteAudits"("entityType")'
    )
    await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "adminDeleteAudits_created_at_idx" ON "adminDeleteAudits"("created_at")'
    )
}

async function seedUsers() {
    const fallbackPasswordHash = await bcrypt.hash('testpassword123', 12)

    const adminEmail = process.env.ADMIN_EMAIL?.trim() || 'admin@microtrack.local'
    const adminPassword = process.env.ADMIN_PASSWORD || 'change_me_before_use'
    const adminName = process.env.ADMIN_NAME?.trim() || 'Admin'
    const adminSurname = process.env.ADMIN_SURNAME?.trim() || 'User'
    const adminPasswordHash = await bcrypt.hash(adminPassword, 12)

    const adminUser = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            name: adminName,
            surname: adminSurname,
            password_hash: adminPasswordHash,
            role: 'admin',
        },
        create: {
            name: adminName,
            surname: adminSurname,
            email: adminEmail,
            password_hash: adminPasswordHash,
            role: 'admin',
        },
    })

    const users = [
        {
            name: 'Alice',
            surname: 'Johnson',
            email: 'alice@example.com',
            role: 'logged_in_user',
        },
        {
            name: 'Bob',
            surname: 'Smith',
            email: 'bob@example.com',
            role: 'admin',
        },
        {
            name: 'Carol',
            surname: 'Mokoena',
            email: 'carol@example.com',
            role: 'logged_in_user',
        },
        {
            name: 'David',
            surname: 'Ndlovu',
            email: 'david@example.com',
            role: 'logged_in_user',
        },
    ]

    const upsertedUsers = []

    for (const user of users) {
        const upserted = await prisma.user.upsert({
            where: { email: user.email },
            update: {
                name: user.name,
                surname: user.surname,
                role: user.role,
            },
            create: {
                ...user,
                password_hash: fallbackPasswordHash,
            },
        })

        upsertedUsers.push(upserted)
    }

    return {
        adminUser,
        secondaryActor: upsertedUsers[0] || adminUser,
        count: upsertedUsers.length + 1,
    }
}

async function seedSamplesAndRelatedData(mockData) {
    const sampleIdMap = new Map()

    const sourceSamples = Array.isArray(mockData.samples) ? mockData.samples : []
    const sourceMetagenomic = Array.isArray(mockData.metagenomic)
        ? mockData.metagenomic
        : []
    const sourceAmrGenes = Array.isArray(mockData.amrResistanceGenes)
        ? mockData.amrResistanceGenes
        : []
    const sourceWgs = Array.isArray(mockData.wgs) ? mockData.wgs : []
    const sourceVirulenceGenes = Array.isArray(mockData.virulenceGenes)
        ? mockData.virulenceGenes
        : []

    for (const sample of sourceSamples) {
        const created = await prisma.sample.create({
            data: {
                water_temperature: toNullableNumber(sample.water_temperature),
                ph: toNullableNumber(sample.ph),
                tds: toNullableNumber(sample.tds),
                do: toNullableNumber(sample.do),
                sample_analysis_type: sample.sample_analysis_type || null,
                isolation_source: sample.isolation_source || null,
                collection_date: toNullableDate(sample.collection_date),
                location_name: sample.location_name || null,
                latitude: Number(sample.latitude),
                longitude: Number(sample.longitude),
                collected_by: sample.collected_by || null,
                predicted_sir_profile: sample.predicted_sir_profile || null,
            },
        })

        const sourceSampleID = Number(sample.sampleID)
        if (Number.isFinite(sourceSampleID)) {
            sampleIdMap.set(sourceSampleID, created.sampleID)
        }
    }

    const metagenomicRows = sourceMetagenomic
        .map((row) => {
            const mappedSampleID = sampleIdMap.get(Number(row.sampleID))
            if (!mappedSampleID || !row.sequence_name) {
                return null
            }

            return {
                sampleID: mappedSampleID,
                sequence_name: String(row.sequence_name),
                element_type: row.element_type || null,
                class: row.class || null,
                subclass: row.subclass || null,
            }
        })
        .filter(Boolean)

    if (metagenomicRows.length > 0) {
        await prisma.metagenomic.createMany({
            data: metagenomicRows,
            skipDuplicates: true,
        })
    }

    const amrRows = sourceAmrGenes
        .map((row) => {
            const mappedSampleID = sampleIdMap.get(Number(row.sampleID))
            if (!mappedSampleID || !row.geneSymbol) {
                return null
            }

            return {
                sampleID: mappedSampleID,
                geneSymbol: String(row.geneSymbol),
            }
        })
        .filter(Boolean)

    if (amrRows.length > 0) {
        await prisma.amrResistanceGene.createMany({
            data: amrRows,
            skipDuplicates: true,
        })
    }

    const isolateToSampleMap = new Map()

    const wgsRows = sourceWgs
        .map((row) => {
            const mappedSampleID = sampleIdMap.get(Number(row.sampleID))
            const isolateID = Number(row.isolateID)

            if (!mappedSampleID || !Number.isInteger(isolateID)) {
                return null
            }

            isolateToSampleMap.set(isolateID, mappedSampleID)

            return {
                sampleID: mappedSampleID,
                isolateID,
                organism: row.organism || null,
            }
        })
        .filter(Boolean)

    if (wgsRows.length > 0) {
        await prisma.wgs.createMany({
            data: wgsRows,
            skipDuplicates: true,
        })
    }

    const virulenceRows = sourceVirulenceGenes
        .map((row) => {
            const isolateID = Number(row.isolateID)
            const mappedFromSample = sampleIdMap.get(Number(row.sampleID))
            const mappedFromIsolate = isolateToSampleMap.get(isolateID)
            const sampleID = mappedFromSample || mappedFromIsolate

            if (!sampleID || !Number.isInteger(isolateID) || !row.geneSymbol) {
                return null
            }

            return {
                sampleID,
                isolateID,
                geneSymbol: String(row.geneSymbol),
            }
        })
        .filter(Boolean)

    if (virulenceRows.length > 0) {
        await prisma.virulenceGene.createMany({
            data: virulenceRows,
            skipDuplicates: true,
        })
    }

    return {
        counts: {
            samples: sourceSamples.length,
            metagenomic: metagenomicRows.length,
            amrGenes: amrRows.length,
            wgs: wgsRows.length,
            virulenceGenes: virulenceRows.length,
        },
        sampleIDs: Array.from(sampleIdMap.values()),
        wgsRows,
    }
}

async function seedDeleteAudits(adminUser, secondaryActor, seededData) {
    const firstSampleID = seededData.sampleIDs[0]
    const secondSampleID = seededData.sampleIDs[1] || firstSampleID
    const firstWgs = seededData.wgsRows[0]

    if (!firstSampleID) {
        return 0
    }

    const auditRows = [
        {
            actorUserID: adminUser.userID,
            actorEmail: adminUser.email,
            entityType: 'sample',
            entityKey: { sampleID: firstSampleID },
            reason: 'Duplicate sample uploaded during QA validation.',
        },
        {
            actorUserID: adminUser.userID,
            actorEmail: adminUser.email,
            entityType: 'wgs',
            entityKey: firstWgs
                ? {
                      sampleID: firstWgs.sampleID,
                      isolateID: firstWgs.isolateID,
                  }
                : { sampleID: secondSampleID },
            reason: 'Incorrect isolate mapping detected in sequencing metadata.',
        },
        {
            actorUserID: secondaryActor.userID,
            actorEmail: secondaryActor.email,
            entityType: 'user',
            entityKey: { userID: secondaryActor.userID },
            reason: 'Demo cleanup entry created for audit trail testing.',
        },
    ]

    const result = await prisma.adminDeleteAudit.createMany({
        data: auditRows,
        skipDuplicates: false,
    })

    return result.count
}

async function main() {
    console.log('🌱 Starting database seed...')

    try {
        await ensureAdminDeleteAuditTable()

        // ─── Clear existing sample-related data ─────────────────────────────────────
        console.log('🧹 Clearing existing data...')
        await prisma.virulenceGene.deleteMany({})
        await prisma.wgs.deleteMany({})
        await prisma.metagenomic.deleteMany({})
        await prisma.amrResistanceGene.deleteMany({})
        await prisma.adminDeleteAudit.deleteMany({})
        await prisma.sample.deleteMany({})
        console.log('✓ Cleared old samples and related data')

        const mockData = readMockData()
        const userResult = await seedUsers()
        console.log(`✓ Created/Updated ${userResult.count} users`)

        const seededData = await seedSamplesAndRelatedData(mockData)
        console.log(`✓ Loaded ${seededData.counts.samples} samples`)
        console.log(`✓ Loaded ${seededData.counts.metagenomic} metagenomic records`)
        console.log(`✓ Loaded ${seededData.counts.amrGenes} AMR resistance genes`)
        console.log(`✓ Loaded ${seededData.counts.wgs} WGS records`)
        console.log(`✓ Loaded ${seededData.counts.virulenceGenes} virulence genes`)

        const auditCount = await seedDeleteAudits(
            userResult.adminUser,
            userResult.secondaryActor,
            seededData
        )
        console.log(`✓ Loaded ${auditCount} admin delete audit rows`)

        console.log('✅ Seed completed successfully!')
        console.log('\n📋 Summary:')
        console.log(`   Users: ${userResult.count}`)
        console.log(`   Samples: ${seededData.counts.samples}`)
        console.log(`   Metagenomic: ${seededData.counts.metagenomic}`)
        console.log(`   AMR genes: ${seededData.counts.amrGenes}`)
        console.log(`   WGS: ${seededData.counts.wgs}`)
        console.log(`   Virulence genes: ${seededData.counts.virulenceGenes}`)
        console.log(`   Admin delete audits: ${auditCount}`)
    } catch (error) {
        console.error('❌ Error during seed:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

main()
