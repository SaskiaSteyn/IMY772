import prisma from '../lib/prisma.js'

// Common MLST types per organism
const MLST_BY_ORGANISM = {
    'Escherichia coli': 'ST58',
    'Salmonella enterica': 'ST19',
    'Klebsiella pneumoniae': 'ST258',
    'Staphylococcus aureus': 'ST8',
    'Enterococcus faecium': 'ST17',
}

const isolates = await prisma.isolate.findMany()
for (const iso of isolates) {
    const mlst_type = MLST_BY_ORGANISM[iso.organism] || 'ST1'
    await prisma.isolate.update({
        where: { isolate_id: iso.isolate_id },
        data: { mlst_type },
    })
    console.log(`Updated isolate ${iso.isolate_id} (${iso.organism}): mlst_type=${mlst_type}`)
}
console.log(`Done. Updated ${isolates.length} isolates.`)
await prisma.$disconnect()
