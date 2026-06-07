import {Router} from 'express'
import fs from 'fs'
import path from 'path'
import prisma from '../lib/prisma.js'

const router = Router()

// ─── POST /api/load-mock-data - Load mock data from JSON file ──────────────

router.post('/load-mock-data', async (req, res) => {
    try {
        const mockDataPath = path.join(process.cwd(), 'mock-data.json')
        const rawData = fs.readFileSync(mockDataPath, 'utf-8')
        const mockData = JSON.parse(rawData)

        console.log('📦 Loading mock data into new schema...')

        let sampleCount = 0
        let isolateCount = 0
        let amrFindingCount = 0
        let predictedPhenotypeCount = 0

        for (let idx = 0; idx < mockData.samples.length; idx++) {
            const oldSample = mockData.samples[idx]

            // Generate a unique sample_id (old schema used auto‑increment int)
            const sample_id = `MOCK-${Date.now()}-${idx}`

            // Map old field names to new schema
            const sampleData = {
                sample_id,
                water_temp: oldSample.water_temperature ?? null,
                ph: oldSample.ph ?? null,
                tds: oldSample.tds ?? null,
                do: oldSample.do ?? null,
                isolation_source: oldSample.isolation_source ?? null,
                collection_date: oldSample.collection_date
                    ? new Date(oldSample.collection_date.includes('T')
                        ? oldSample.collection_date
                        : `${oldSample.collection_date}T00:00:00Z`)
                    : null,
                location_name: oldSample.location_name ?? null,
                latitude: oldSample.latitude,
                longitude: oldSample.longitude,
                uploaded_by: 1, // default admin user ID; you may change this
            }

            // Validate required fields
            if (!sampleData.latitude || !sampleData.longitude) {
                console.warn(`Skipping sample without lat/lon: ${oldSample.location_name}`)
                continue
            }

            // Create the sample
            const createdSample = await prisma.sample.create({data: sampleData})
            sampleCount++

            // ─── Create Isolates from old wgs data ──────────────────────────
            if (oldSample.wgs && Array.isArray(oldSample.wgs)) {
                for (const wgsItem of oldSample.wgs) {
                    await prisma.isolate.create({
                        data: {
                            sample_id: createdSample.sample_id,
                            organism: wgsItem.organism ?? null,
                            mlst_type: null, // old schema had no mlst_type; you could map if available
                        },
                    })
                    isolateCount++
                }
            }

            // ─── Create AmrFindings from amr_resistance_genes inside metagenomic ──
            if (oldSample.metagenomic && Array.isArray(oldSample.metagenomic)) {
                for (const meta of oldSample.metagenomic) {
                    if (meta.amr_resistance_genes && Array.isArray(meta.amr_resistance_genes)) {
                        for (const gene of meta.amr_resistance_genes) {
                            await prisma.amrFinding.create({
                                data: {
                                    sample_id: createdSample.sample_id,
                                    analysis_type: 'metagenomic',
                                    gene_symbol: gene,
                                    drug_class: null,
                                    method: null,
                                    percent_identity: null,
                                },
                            })
                            amrFindingCount++
                        }
                    }
                }
            }

            // ─── Create PredictedPhenotype from old predicted_sir_profile ──────
            if (oldSample.predicted_sir_profile) {
                // The old mock data has only a string like "Resistant" without organism/antibiotic.
                // We'll create a generic phenotype with placeholder values.
                await prisma.predictedPhenotype.create({
                    data: {
                        sample_id: createdSample.sample_id,
                        organism: 'unknown',      // not stored in old mock data
                        antibiotic: 'unknown',    // not stored
                        resistant: oldSample.predicted_sir_profile.toLowerCase() === 'resistant',
                    },
                })
                predictedPhenotypeCount++
            }
        }

        console.log(`✓ Loaded ${sampleCount} samples`)
        console.log(`✓ Loaded ${isolateCount} isolates`)
        console.log(`✓ Loaded ${amrFindingCount} AMR findings`)
        console.log(`✓ Loaded ${predictedPhenotypeCount} predicted phenotypes`)

        return res.json({
            message: 'Mock data loaded successfully into the new schema!',
            summary: {
                samples: sampleCount,
                isolates: isolateCount,
                amrFindings: amrFindingCount,
                predictedPhenotypes: predictedPhenotypeCount,
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