import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()

function readMockData() {
    const mockDataPath = path.join(__dirname, '..', 'mock-data-flat.json')
    return JSON.parse(fs.readFileSync(mockDataPath, 'utf-8'))
}

function toNullableNumber(value) {
    if (value === null || value === undefined || value === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

function toNullableDate(value) {
    if (!value) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
}

async function isAlreadySeeded() {
    const count = await prisma.sample.count()
    const phenotypeCount = await prisma.predictedPhenotype.count()
    // Re-seed if samples exist but phenotypes are missing (old broken seed)
    if (count > 0 && phenotypeCount > 0) {
        console.log(`Database already seeded (${count} samples, ${phenotypeCount} phenotypes). Skipping.`)
        return true
    }
    if (count > 0 && phenotypeCount === 0) {
        console.log('Samples found but no phenotypes — old seed detected. Re-seeding...')
    }
    return false
}

async function clearData() {
    console.log('Clearing existing data...')
    await prisma.virulenceGene.deleteMany({})
    await prisma.predictedPhenotype.deleteMany({})
    await prisma.amrFinding.deleteMany({})
    await prisma.isolate.deleteMany({})
    await prisma.adminDeleteAudit.deleteMany({}).catch(() => {})
    await prisma.sample.deleteMany({})
    console.log('Cleared.')
}

async function seedUsers() {
    const fallbackHash = await bcrypt.hash('testpassword123', 12)

    const adminEmail = process.env.ADMIN_EMAIL?.trim() || 'admin@microtrack.local'
    const adminPassword = process.env.ADMIN_PASSWORD || 'change_me_before_use'
    const adminName = process.env.ADMIN_NAME?.trim() || 'Admin'
    const adminSurname = process.env.ADMIN_SURNAME?.trim() || 'User'
    const adminHash = await bcrypt.hash(adminPassword, 12)

    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: { name: adminName, surname: adminSurname, password_hash: adminHash, role: 'admin' },
        create: { name: adminName, surname: adminSurname, email: adminEmail, password_hash: adminHash, role: 'admin' },
    })

    const others = [
        { name: 'Alice', surname: 'Johnson', email: 'alice@example.com', role: 'logged_in_user' },
        { name: 'Bob',   surname: 'Smith',   email: 'bob@example.com',   role: 'admin' },
        { name: 'Carol', surname: 'Mokoena', email: 'carol@example.com', role: 'logged_in_user' },
        { name: 'David', surname: 'Ndlovu',  email: 'david@example.com', role: 'logged_in_user' },
    ]

    for (const u of others) {
        await prisma.user.upsert({
            where: { email: u.email },
            update: { name: u.name, surname: u.surname, role: u.role },
            create: { ...u, password_hash: fallbackHash },
        })
    }

    return admin
}

async function seedSamples(mockData, adminUserID) {
    const samples = Array.isArray(mockData.samples) ? mockData.samples : []
    // Map old integer sampleID → new string sample_id
    const idMap = new Map() // old int → new string sample_id

    for (const s of samples) {
        const sample_id = String(s.sampleID)
        await prisma.sample.create({
            data: {
                sample_id,
                sample_name: s.sample_name || sample_id,
                collected_by: s.collected_by || null,
                collection_date: toNullableDate(s.collection_date),
                location_name: s.location_name || null,
                latitude: Number(s.latitude),
                longitude: Number(s.longitude),
                isolation_source: s.isolation_source || null,
                water_temp: toNullableNumber(s.water_temperature),
                ph: toNullableNumber(s.ph),
                tds: toNullableNumber(s.tds),
                do: toNullableNumber(s.do),
                uploaded_by: adminUserID,
            },
        })
        idMap.set(Number(s.sampleID), sample_id)
    }

    return idMap
}

const MLST_BY_ORGANISM = {
    'Escherichia coli': 'ST58',
    'Salmonella enterica': 'ST19',
    'Klebsiella pneumoniae': 'ST258',
    'Staphylococcus aureus': 'ST8',
    'Enterococcus faecium': 'ST17',
}

async function seedIsolates(mockData, idMap) {
    const wgs = Array.isArray(mockData.wgs) ? mockData.wgs : []
    let count = 0

    for (const row of wgs) {
        const sample_id = idMap.get(Number(row.sampleID))
        if (!sample_id) continue

        await prisma.isolate.create({
            data: {
                sample_id,
                organism: row.organism || null,
                mlst_type: MLST_BY_ORGANISM[row.organism] || null,
            },
        })
        count++
    }

    return count
}

async function seedAmrFindings(mockData, idMap) {
    const genes = Array.isArray(mockData.amrResistanceGenes) ? mockData.amrResistanceGenes : []
    let count = 0

    for (const row of genes) {
        const sample_id = idMap.get(Number(row.sampleID))
        if (!sample_id) continue

        const amr_class = row.amr_class !== undefined ? row.amr_class : deriveAmrClass(row.geneSymbol)

        await prisma.amrFinding.create({
            data: {
                sample_id,
                gene_symbol: row.geneSymbol || null,
                amr_class,
                analysis_type: 'metagenomic',
                method: 'ResFinder',
                percent_identity: derivePercentIdentity(row.geneSymbol),
            },
        })
        count++
    }

    return count
}

function derivePercentIdentity(geneSymbol) {
    if (!geneSymbol) return null
    // Exact matches get 100%, partial/variant names get slightly lower
    if (geneSymbol.includes('-') || /\d/.test(geneSymbol)) return 99.5
    return 100.0
}

function deriveAmrClass(geneSymbol) {
    if (!geneSymbol) return null
    const g = geneSymbol.toLowerCase()
    if (g.startsWith('bla')) return 'BETA-LACTAM'
    if (g.startsWith('erm')) return 'MACROLIDE'
    if (g.startsWith('tet')) return 'TETRACYCLINE'
    if (g.startsWith('aac') || g.startsWith('aph') || g.startsWith('ant')) return 'AMINOGLYCOSIDE'
    if (g.startsWith('sul')) return 'SULFONAMIDE'
    if (g.startsWith('qnr')) return 'QUINOLONE'
    if (g.startsWith('van')) return 'GLYCOPEPTIDE'
    if (g.startsWith('cat') || g.startsWith('cml')) return 'PHENICOL'
    return null
}

async function seedPredictedPhenotypes(mockData, idMap) {
    const samples = Array.isArray(mockData.samples) ? mockData.samples : []
    let count = 0

    for (const s of samples) {
        const sample_id = idMap.get(Number(s.sampleID))
        if (!sample_id) continue

        // Normalise profile to title-case (handles old lowercase values gracefully)
        const rawProfile = s.predicted_sir_profile
        let predicted_sir_profile = null
        if (rawProfile) {
            const lower = rawProfile.toLowerCase()
            if (lower === 'resistant') predicted_sir_profile = 'Resistant'
            else if (lower === 'susceptible') predicted_sir_profile = 'Susceptible'
            else if (lower === 'intermediate') predicted_sir_profile = 'Intermediate'
        }

        await prisma.predictedPhenotype.create({
            data: {
                sample_id,
                organism: 'E. coli',
                antibiotic: 'ampicillin',
                predicted_sir_profile,
            },
        })
        count++
    }

    return count
}

async function seedVirulenceGenes(mockData, idMap) {
    const genes = Array.isArray(mockData.virulenceGenes) ? mockData.virulenceGenes : []
    let count = 0

    for (const row of genes) {
        const sample_id = idMap.get(Number(row.sampleID))
        if (!sample_id) continue

        await prisma.virulenceGene.create({
            data: {
                sample_id,
                gene_symbol: row.gene_symbol,
                method: row.method || null,
                percent_identity: row.percent_identity !== undefined ? Number(row.percent_identity) : null,
                coverage_percent: row.coverage_percent !== undefined ? Number(row.coverage_percent) : null,
                alignment_length: row.alignment_length !== undefined && row.alignment_length !== null ? parseInt(row.alignment_length) : null,
                target_length: row.target_length !== undefined && row.target_length !== null ? parseInt(row.target_length) : null,
                ref_seq_length: row.ref_seq_length !== undefined && row.ref_seq_length !== null ? parseInt(row.ref_seq_length) : null,
                accession: row.accession || null,
                sequence_name: row.sequence_name || null,
                element_type: row.element_type || null,
            },
        })
        count++
    }

    return count
}

async function seedAuditLog(admin) {
    await prisma.adminDeleteAudit.createMany({
        data: [
            {
                actorUserID: admin.userID,
                actorEmail: admin.email,
                entityType: 'sample',
                entityKey: { sample_id: '1' },
                reason: 'Duplicate sample uploaded during QA validation.',
            },
            {
                actorUserID: admin.userID,
                actorEmail: admin.email,
                entityType: 'isolate',
                entityKey: { isolate_id: 1 },
                reason: 'Incorrect isolate mapping detected in sequencing metadata.',
            },
        ],
        skipDuplicates: false,
    })
}

async function main() {
    console.log('Starting database seed...')

    if (await isAlreadySeeded()) return

    await clearData()

    const admin = await seedUsers()
    console.log('Users seeded.')

    const mockData = readMockData()
    const idMap = await seedSamples(mockData, admin.userID)
    console.log(`Samples seeded: ${idMap.size}`)

    const isolateCount = await seedIsolates(mockData, idMap)
    console.log(`Isolates seeded: ${isolateCount}`)

    const amrCount = await seedAmrFindings(mockData, idMap)
    console.log(`AMR findings seeded: ${amrCount}`)

    const phenotypeCount = await seedPredictedPhenotypes(mockData, idMap)
    console.log(`Predicted phenotypes seeded: ${phenotypeCount}`)

    const virulenceGeneCount = await seedVirulenceGenes(mockData, idMap)
    console.log(`Virulence genes seeded: ${virulenceGeneCount}`)

    await seedAuditLog(admin)
    console.log('Audit log seeded.')

    console.log('Seed completed successfully.')
}

main()
    .catch((e) => { console.error('Seed failed:', e); process.exit(1) })
    .finally(() => prisma.$disconnect())
