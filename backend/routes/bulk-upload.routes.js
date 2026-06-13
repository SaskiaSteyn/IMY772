import {Router} from 'express'
import multer from 'multer'
import {body, validationResult} from 'express-validator'
import prisma from '../lib/prisma.js'
import {requireAuth} from '../middleware/auth.middleware.js'
import {parseBulkUploadFile} from '../lib/file-parser.js'

const router = Router()
const upload = multer({storage: multer.memoryStorage(), limits: {fileSize: 10 * 1024 * 1024}}) // 10MB

// POST /api/bulk-upload/samples
// Expects a CSV/Excel file with columns matching the new Sample schema + nested isolates/amr/phenotypes
router.post(
    '/samples',
    requireAuth,
    upload.single('file'),
    [
        body('file').custom((value, {req}) => {
            if (!req.file) throw new Error('No file uploaded')
            return true
        }),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        try {
            const fileBuffer = req.file.buffer
            const fileMime = req.file.mimetype
            const parsedData = await parseBulkUploadFile(fileBuffer, fileMime)

            const {samples} = parsedData // Array of sample objects with nested isolates, amrFindings, predictedPhenotypes

            // Pre-fetch all existing sample IDs in one query to avoid N serial findUnique calls
            const sampleIds = samples.map(s => s.sample_id).filter(Boolean)
            const existingSamples = await prisma.sample.findMany({
                where: {sample_id: {in: sampleIds}},
                select: {sample_id: true},
            })
            const existingIdSet = new Set(existingSamples.map(s => s.sample_id))

            const results = []
            for (const sampleData of samples) {
                // Validate required fields
                if (!sampleData.sample_id || sampleData.latitude === undefined || sampleData.longitude === undefined) {
                    results.push({success: false, sample_id: sampleData.sample_id || 'unknown', error: 'Missing required fields: sample_id, latitude, longitude'})
                    continue
                }

                // Use the pre-fetched set to decide whether related records should be inserted.
                // Treat the sample as new unless it was already in the DB before this upload started.
                const isNew = !existingIdSet.has(sampleData.sample_id)

                const sampleFields = {
                    water_temp: sampleData.water_temp !== undefined ? parseFloat(sampleData.water_temp) : null,
                    ph: sampleData.ph !== undefined ? parseFloat(sampleData.ph) : null,
                    tds: sampleData.tds !== undefined ? parseFloat(sampleData.tds) : null,
                    do: sampleData.do !== undefined ? parseFloat(sampleData.do) : null,
                    isolation_source: sampleData.isolation_source || null,
                    collection_date: sampleData.collection_date ? new Date(sampleData.collection_date) : null,
                    location_name: sampleData.location_name || null,
                    latitude: parseFloat(sampleData.latitude),
                    longitude: parseFloat(sampleData.longitude),
                }

                try {
                    await prisma.$transaction(async (tx) => {
                        // Upsert the sample — create if new, update fields if already exists
                        await tx.sample.upsert({
                            where: {sample_id: sampleData.sample_id},
                            update: sampleFields,
                            create: {
                                sample_id: sampleData.sample_id,
                                ...sampleFields,
                                uploaded_by: req.user.userID,
                            },
                        })

                        // Only insert related records for new samples to avoid duplicates on re-upload
                        if (isNew) {
                            const sid = sampleData.sample_id

                            if (sampleData.isolates?.length) {
                                await tx.isolate.createMany({
                                    data: sampleData.isolates.map(iso => ({
                                        sample_id: sid,
                                        organism: iso.organism || null,
                                        mlst_type: iso.mlst_type || null,
                                    })),
                                })
                            }

                            if (sampleData.amrFindings?.length) {
                                await tx.amrFinding.createMany({
                                    data: sampleData.amrFindings.map(amr => ({
                                        sample_id: sid,
                                        analysis_type: amr.analysis_type || null,
                                        gene_symbol: amr.gene_symbol || null,
                                        drug_class: amr.drug_class || null,
                                        method: amr.method || null,
                                        percent_identity: amr.percent_identity !== undefined ? parseFloat(amr.percent_identity) : null,
                                    })),
                                })
                            }

                            if (sampleData.predictedPhenotypes?.length) {
                                await tx.predictedPhenotype.createMany({
                                    data: sampleData.predictedPhenotypes.map(phen => ({
                                        sample_id: sid,
                                        organism: phen.organism || null,
                                        antibiotic: phen.antibiotic || null,
                                        resistant: phen.resistant !== undefined ? Boolean(phen.resistant) : null,
                                    })),
                                })
                            }
                        }
                    })

                    results.push({success: true, sample_id: sampleData.sample_id, action: isNew ? 'created' : 'updated'})
                } catch (err) {
                    console.error(`Bulk upload error for sample ${sampleData.sample_id}:`, err)
                    const message = err.code === 'P2002'
                        ? `This data already exists in the database. Should you wish to update it, you can navigate back and edit the entry.`
                        : err.message
                    results.push({success: false, sample_id: sampleData.sample_id, error: message})
                }
            }

            const successCount = results.filter(r => r.success).length
            const createdCount = results.filter(r => r.success && r.action === 'created').length
            const updatedCount = results.filter(r => r.success && r.action === 'updated').length
            const failCount = results.filter(r => !r.success).length

            return res.status(207).json({
                message: `Bulk upload completed: ${createdCount} created, ${updatedCount} updated, ${failCount} failed`,
                results: {
                    successCount,
                    createdCount,
                    updatedCount,
                    failureCount: failCount,
                    totalSamples: results.length,
                    sampleIDs: results.filter(r => r.success).map(r => r.sample_id),
                    errors: results.filter(r => !r.success).map((r, i) => ({sampleIndex: i, sample_id: r.sample_id, error: r.error})),
                },
            })
        } catch (err) {
            console.error('Bulk upload error:', err)
            return res.status(500).json({message: 'Failed to process bulk upload', error: err.message})
        }
    }
)

export default router