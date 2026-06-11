import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const WATER_TEMPS = {
    '1': 18.4, '2': 21.2, '3': 17.8, '4': 23.5, '5': 19.9,
    '6': 16.3, '7': 20.7, '8': 22.1, '9': 19.2, '10': 20.5, '11': 22.0,
}

async function main() {
    for (const [sample_id, water_temp] of Object.entries(WATER_TEMPS)) {
        await prisma.sample.update({ where: { sample_id }, data: { water_temp } })
        console.log(`Updated ${sample_id}: water_temp=${water_temp}`)
    }
    console.log('Done.')
}

main()
    .catch((e) => { console.error(e); process.exit(1) })
    .finally(() => prisma.$disconnect())
