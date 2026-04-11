import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting database seed...')

    try {
        // ─── Create test users ───────────────────────────────────────────────────────
        const password_hash = await bcrypt.hash('testpassword123', 12)

        const user1 = await prisma.user.upsert({
            where: { email: 'alice@example.com' },
            update: { name: 'Alice', surname: 'Johnson' },
            create: {
                name: 'Alice',
                surname: 'Johnson',
                email: 'alice@example.com',
                password_hash,
                role: 'logged_in_user',
            },
        })

        const user2 = await prisma.user.upsert({
            where: { email: 'bob@example.com' },
            update: { name: 'Bob', surname: 'Smith' },
            create: {
                name: 'Bob',
                surname: 'Smith',
                email: 'bob@example.com',
                password_hash,
                role: 'admin',
            },
        })

        console.log('✓ Created/Updated 2 test users')

        // ─── Create test samples ─────────────────────────────────────────────────────
        const sample1 = await prisma.sample.create({
            data: {
                water_temperature: 22.5,
                ph: 7.2,
                tds: 450.75,
                do: 8.3,
                sample_analysis_type: 'Metagenomic',
                isolation_source: 'River upstream',
                collection_date: new Date('2026-04-01'),
                location_name: 'Limpopo River Site A',
                latitude: -23.8854,
                longitude: 29.1649,
                collected_by: 'Alice Johnson',
                predicted_sir_profile: 'Susceptible',
            },
        })

        const sample2 = await prisma.sample.create({
            data: {
                water_temperature: 24.1,
                ph: 6.9,
                tds: 520.5,
                do: 7.8,
                sample_analysis_type: 'WGS',
                isolation_source: 'Lake central',
                collection_date: new Date('2026-04-05'),
                location_name: 'Lake Victoria Surface',
                latitude: -2.269,
                longitude: 32.9022,
                collected_by: 'Bob Smith',
                predicted_sir_profile: 'Intermediate',
            },
        })

        const sample3 = await prisma.sample.create({
            data: {
                water_temperature: 20.3,
                ph: 7.5,
                tds: 380.2,
                do: 9.1,
                sample_analysis_type: 'Metagenomic',
                isolation_source: 'Stream tributary',
                collection_date: new Date('2026-04-08'),
                location_name: 'Zambezi River Site B',
                latitude: -17.7832,
                longitude: 25.865,
                collected_by: 'Alice Johnson',
                predicted_sir_profile: 'Resistant',
            },
        })

        console.log('✓ Created 3 test samples')

        // ─── Create metagenomic records ──────────────────────────────────────────────
        const metagenomic1 = await prisma.metagenomic.create({
            data: {
                sampleID: sample1.sampleID,
                sequence_name: 'MGS_001_16S_rRNA',
                element_type: 'Prokaryotic',
                class: 'Bacilli',
                subclass: 'Bacillaceae',
            },
        })

        const metagenomic2 = await prisma.metagenomic.create({
            data: {
                sampleID: sample1.sampleID,
                sequence_name: 'MGS_001_ITS',
                element_type: 'Eukaryotic',
                class: 'Ascomycota',
                subclass: 'Saccharomycetes',
            },
        })

        const metagenomic3 = await prisma.metagenomic.create({
            data: {
                sampleID: sample3.sampleID,
                sequence_name: 'MGS_003_16S_rRNA',
                element_type: 'Prokaryotic',
                class: 'Gammaproteobacteria',
                subclass: 'Enterobacteriaceae',
            },
        })

        console.log('✓ Created 3 metagenomic records')

        console.log('✅ Seed completed successfully!')
        console.log('\n📋 Summary:')
        console.log('   Users: 2')
        console.log('   Samples: 3')
        console.log('   Metagenomic records: 3')
    } catch (error) {
        console.error('❌ Error during seed:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

main()
