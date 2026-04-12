import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting database seed...')

    try {
        // ─── Clear existing data ─────────────────────────────────────────────────────
        console.log('🧹 Clearing existing data...')
        await prisma.metagenomic.deleteMany({})
        await prisma.aMRResistanceGene.deleteMany({})
        await prisma.sample.deleteMany({})
        console.log('✓ Cleared old samples and related data')

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


        // ─── Create metagenomic records ──────────────────────────────────────────────
        // Removed test samples - using only mock data instead
        console.log('✓ Skipped test samples - using mock data only')

        // ─── Load mock data ──────────────────────────────────────────────────────────
        const mockDataPath = path.join(__dirname, '..', 'mock-data-flat.json')
        const mockDataContent = fs.readFileSync(mockDataPath, 'utf-8')
        const mockData = JSON.parse(mockDataContent)

        let mockSamplesCreated = 0
        let mockMetagenomicsCreated = 0

        for (const mockSample of mockData.samples) {
            const sample = await prisma.sample.create({
                data: {
                    water_temperature: mockSample.water_temperature,
                    ph: mockSample.ph,
                    tds: mockSample.tds,
                    do: mockSample.do,
                    sample_analysis_type: mockSample.sample_analysis_type,
                    isolation_source: mockSample.isolation_source,
                    collection_date: new Date(mockSample.collection_date),
                    location_name: mockSample.location_name,
                    latitude: mockSample.latitude,
                    longitude: mockSample.longitude,
                    collected_by: mockSample.collected_by,
                    predicted_sir_profile: mockSample.predicted_sir_profile,
                },
            })
            mockSamplesCreated++

            // Load metagenomic data if present
            if (mockSample.metagenomic && Array.isArray(mockSample.metagenomic)) {
                for (const metaItem of mockSample.metagenomic) {
                    await prisma.metagenomic.create({
                        data: {
                            sampleID: sample.sampleID,
                            sequence_name: metaItem.sequence_name,
                            element_type: metaItem.element_type,
                            class: metaItem.class,
                            subclass: metaItem.subclass,
                        },
                    })
                    mockMetagenomicsCreated++

                    // Load AMR resistance genes if present
                    if (metaItem.amr_resistance_genes && Array.isArray(metaItem.amr_resistance_genes)) {
                        for (const gene of metaItem.amr_resistance_genes) {
                            await prisma.aMRResistanceGene.create({
                                data: {
                                    sampleID: sample.sampleID,
                                    geneSymbol: gene,
                                },
                            })
                        }
                    }
                }
            }
        }

        console.log(`✓ Loaded ${mockSamplesCreated} mock samples`)
        console.log(`✓ Loaded ${mockMetagenomicsCreated} mock metagenomic records`)

        console.log('✅ Seed completed successfully!')
        console.log('\n📋 Summary:')
        console.log(`   Samples: ${mockSamplesCreated}`)
        console.log(`   Metagenomic records: ${mockMetagenomicsCreated}`)
    } catch (error) {
        console.error('❌ Error during seed:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

main()
