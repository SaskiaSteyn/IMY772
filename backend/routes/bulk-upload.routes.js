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

            const results = []
            for (const sampleData of samples) {
                // Validate required fields for Sample
                if (!sampleData.sample_id || sampleData.latitude === undefined || sampleData.longitude === undefined) {
                    results.push({success: false, sample_id: sampleData.sample_id || 'unknown', error: 'Missing required fields: sample_id, latitude, longitude'})
                    continue
                }

                try {
                    // Create the sample
                    const sample = await prisma.sample.create({
                        data: {
                            sample_id: sampleData.sample_id,
                            water_temp: sampleData.water_temp !== undefined ? parseFloat(sampleData.water_temp) : null,
                            ph: sampleData.ph !== undefined ? parseFloat(sampleData.ph) : null,
                            tds: sampleData.tds !== undefined ? parseFloat(sampleData.tds) : null,
                            do: sampleData.do !== undefined ? parseFloat(sampleData.do) : null,
                            isolation_source: sampleData.isolation_source || null,
                            collection_date: sampleData.collection_date ? new Date(sampleData.collection_date) : null,
                            location_name: sampleData.location_name || null,
                            latitude: parseFloat(sampleData.latitude),
                            longitude: parseFloat(sampleData.longitude),
                            uploaded_by: req.user.userID,
                        },
                    })

                    // Create isolates if provided
                    if (sampleData.isolates && Array.isArray(sampleData.isolates)) {
                        for (const iso of sampleData.isolates) {
                            await prisma.isolate.create({
                                data: {
                                    sample_id: sample.sample_id,
                                    organism: iso.organism || null,
                                    mlst_type: iso.mlst_type || null,
                                },
                            })
                        }
                    }

                    // Create AMR findings if provided
                    if (sampleData.amrFindings && Array.isArray(sampleData.amrFindings)) {
                        for (const amr of sampleData.amrFindings) {
                            await prisma.amrFinding.create({
                                data: {
                                    sample_id: sample.sample_id,
                                    analysis_type: amr.analysis_type || null,
                                    gene_symbol: amr.gene_symbol || null,
                                    drug_class: amr.drug_class || null,
                                    method: amr.method || null,
                                    percent_identity: amr.percent_identity !== undefined ? parseFloat(amr.percent_identity) : null,
                                    finding_id: amr.finding_id || undefined, // auto if omitted
                                },
                            })
                        }
                    }

                    // Create predicted phenotypes if provided
                    if (sampleData.predictedPhenotypes && Array.isArray(sampleData.predictedPhenotypes)) {
                        for (const phen of sampleData.predictedPhenotypes) {
                            await prisma.predictedPhenotype.create({
                                data: {
                                    sample_id: sample.sample_id,
                                    organism: phen.organism || null,
                                    antibiotic: phen.antibiotic || null,
                                    resistant: phen.resistant !== undefined ? Boolean(phen.resistant) : null,
                                },
                            })
                        }
                    }

                    results.push({success: true, sample_id: sample.sample_id})
                } catch (err) {
                    console.error(`Bulk upload error for sample ${sampleData.sample_id}:`, err)
                    results.push({success: false, sample_id: sampleData.sample_id, error: err.message})
                }
            }

            const successCount = results.filter(r => r.success).length
            const failCount = results.filter(r => !r.success).length

            return res.status(207).json({
                message: `Bulk upload completed: ${successCount} succeeded, ${failCount} failed`,
                results,
            })
        } catch (err) {
            console.error('Bulk upload error:', err)
            return res.status(500).json({message: 'Failed to process bulk upload', error: err.message})
        }
    }
)

export default router