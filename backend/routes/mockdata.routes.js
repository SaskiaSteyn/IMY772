import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import prisma from '../lib/prisma.js'

const router = Router()

// ─── POST /api/load-mock-data - Load mock data from JSON file ──────────────

router.post('/load-mock-data', async (req, res) => {
    try {
        // Read the mock data file
        const mockDataPath = path.join(process.cwd(), 'mock-data.json')
        const rawData = fs.readFileSync(mockDataPath, 'utf-8')
        const mockData = JSON.parse(rawData)

        console.log('📦 Loading mock data from JSON file...')

        let sampleCount = 0
        let metagenomicCount = 0
        let wgsCount = 0
        let virulenceCount = 0

        // Load samples and their related data
        for (const sample of mockData.samples) {
            // Convert date string to ISO datetime (add T00:00:00 if it's just a date)
            const dateString = sample.collection_date.includes('T')
                ? sample.collection_date
                : `${sample.collection_date}T00:00:00Z`

            // Create/update the sample
            const createdSample = await prisma.sample.create({
                data: {
                    water_temperature: sample.water_temperature,
                    ph: sample.ph,
                    tds: sample.tds,
                    do: sample.do,
                    sample_analysis_type: sample.sample_analysis_type,
                    isolation_source: sample.isolation_source,
                    collection_date: new Date(dateString),
                    location_name: sample.location_name,
                    latitude: sample.latitude,
                    longitude: sample.longitude,
                    collected_by: sample.collected_by,
                    predicted_sir_profile: sample.predicted_sir_profile,
                },
            })
            sampleCount++

            // Handle metagenomic data if present
            if (sample.metagenomic && Array.isArray(sample.metagenomic)) {
                for (const meta of sample.metagenomic) {
                    await prisma.metagenomic.create({
                        data: {
                            sampleID: createdSample.sampleID,
                            sequence_name: meta.sequence_name,
                            element_type: meta.element_type,
                            class: meta.class,
                            subclass: meta.subclass,
                        },
                    })
                    metagenomicCount++

                    // Handle AMR resistance genes if present
                    if (meta.amr_resistance_genes && Array.isArray(meta.amr_resistance_genes)) {
                        for (const gene of meta.amr_resistance_genes) {
                            await prisma.aMRResistanceGene.create({
                                data: {
                                    sampleID: createdSample.sampleID,
                                    geneSymbol: gene,
                                },
                            })
                        }
                    }
                }
            }

            // Handle WGS data if present
            if (sample.wgs && Array.isArray(sample.wgs)) {
                for (const wgsData of sample.wgs) {
                    const createdWGS = await prisma.wGS.create({
                        data: {
                            sampleID: createdSample.sampleID,
                            isolateID: wgsData.isolateID,
                            organism: wgsData.organism,
                        },
                    })
                    wgsCount++

                    // Handle virulence genes if present
                    if (wgsData.virulence_genes && Array.isArray(wgsData.virulence_genes)) {
                        for (const vgene of wgsData.virulence_genes) {
                            await prisma.virulenceGene.create({
                                data: {
                                    isolateID: createdWGS.id,
                                    geneSymbol: vgene,
                                },
                            })
                            virulenceCount++
                        }
                    }
                }
            }
        }

        console.log(`✓ Loaded ${sampleCount} samples`)
        console.log(`✓ Loaded ${metagenomicCount} metagenomic records`)
        console.log(`✓ Loaded ${wgsCount} WGS records`)
        console.log(`✓ Loaded ${virulenceCount} virulence genes`)

        return res.json({
            message: 'Mock data loaded successfully!',
            summary: {
                samples: sampleCount,
                metagenomic: metagenomicCount,
                wgs: wgsCount,
                virulenceGenes: virulenceCount,
            },
        })
    } catch (err) {
        console.error('Load mock data error:', err)
        return res.status(500).json({
            message: 'Failed to load mock data',
            error: err.message,
        })
    }
})

export default router

