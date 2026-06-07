import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Derived from mock-data-flat.json predicted_sir_profile values.
// resistant → true, intermediate → null, susceptible → false
const SIR_MAP = {
    resistant: true,
    intermediate: null,
    susceptible: false,
}

const MOCK_PROFILES = {
    '1': 'resistant',
    '2': 'intermediate',
    '3': 'susceptible',
    '4': 'resistant',
    '5': 'intermediate',
    '6': 'susceptible',
    '7': 'resistant',
    '8': 'resistant',
    '9': 'resistant',
    '10': 'intermediate',
    '11': 'resistant',
}

async function main() {
    console.log('Seeding predicted_phenotypes...')

    const samples = await prisma.sample.findMany({ select: { sample_id: true } })

    let inserted = 0
    for (const { sample_id } of samples) {
        const existing = await prisma.predictedPhenotype.count({ where: { sample_id } })
        if (existing > 0) {
            console.log(`  Skipping ${sample_id} (already has phenotypes)`)
            continue
        }

        const profile = MOCK_PROFILES[sample_id] || 'resistant'
        const resistant = SIR_MAP[profile]

        await prisma.predictedPhenotype.create({
            data: {
                sample_id,
                organism: 'E. coli',
                antibiotic: 'ampicillin',
                resistant,
            },
        })
        console.log(`  Inserted ${sample_id}: ${profile} (resistant=${resistant})`)
        inserted++
    }

    console.log(`Done. Inserted ${inserted} phenotype records.`)
}

main()
    .catch((e) => { console.error(e); process.exit(1) })
    .finally(() => prisma.$disconnect())
