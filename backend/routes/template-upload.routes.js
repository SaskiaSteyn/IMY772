import {Router} from 'express'
import multer from 'multer'
import prisma from '../lib/prisma.js'
import {requireAuth} from '../middleware/auth.middleware.js'
import {parseExcelTemplate} from '../lib/template-parser.js'

const router = Router()
const upload = multer({storage: multer.memoryStorage(), limits: {fileSize: 10 * 1024 * 1024}})

// POST /api/template-upload
// Accepts the flat Excel template format and upserts all data
router.post('/', requireAuth, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({message: 'No file uploaded'})

    const mime = req.file.mimetype
    if (mime !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        return res.status(400).json({message: 'Only .xlsx files are accepted for template upload'})
    }

    let samples
    try {
        samples = parseExcelTemplate(req.file.buffer)
    } catch (err) {
        return res.status(400).json({message: `Failed to parse template: ${err.message}`})
    }

    if (!samples.length) return res.status(400).json({message: 'No data rows found in file'})

    const sampleIds = samples.map(s => s.sample_id)
    const existing = await prisma.sample.findMany({where: {sample_id: {in: sampleIds}}, select: {sample_id: true}})
    const existingSet = new Set(existing.map(s => s.sample_id))

    const results = []

    for (const s of samples) {
        const isNew = !existingSet.has(s.sample_id)
        try {
            await prisma.$transaction(async (tx) => {
                await tx.sample.upsert({
                    where: {sample_id: s.sample_id},
                    update: {
                        sample_name: s.sample_name || s.sample_id,
                        collected_by: s.collected_by,
                        latitude: s.latitude,
                        longitude: s.longitude,
                        water_temp: s.water_temp,
                        ph: s.ph,
                        tds: s.tds,
                        do: s.do,
                        isolation_source: s.isolation_source,
                        collection_date: s.collection_date,
                        location_name: s.location_name,
                        uploaded_by: req.user.userID,
                    },
                    create: {
                        sample_id: s.sample_id,
                        sample_name: s.sample_name || s.sample_id,
                        collected_by: s.collected_by,
                        latitude: s.latitude,
                        longitude: s.longitude,
                        water_temp: s.water_temp,
                        ph: s.ph,
                        tds: s.tds,
                        do: s.do,
                        isolation_source: s.isolation_source,
                        collection_date: s.collection_date,
                        location_name: s.location_name,
                        uploaded_by: req.user.userID,
                    },
                })

                if (isNew) {
                    if (s.isolates?.length) {
                        await tx.isolate.createMany({
                            data: s.isolates.map(i => ({
                                sample_id: s.sample_id,
                                organism: i.organism || null,
                                mlst_type: i.mlst_type || null,
                            })),
                        })
                    }

                    if (s.amrFindings?.length) {
                        await tx.amrFinding.createMany({
                            data: s.amrFindings.map(a => ({
                                sample_id: s.sample_id,
                                gene_symbol: a.gene_symbol || null,
                                analysis_type: a.analysis_type || null,
                                amr_class: a.amr_class || null,
                                subclass: a.subclass || null,
                                sequence_name: a.sequence_name || null,
                                element_type: a.element_type || null,
                                target_length: a.target_length || null,
                                reference_sequence_length: a.reference_sequence_length || null,
                                percentage_coverage: a.percentage_coverage || null,
                                percent_identity: a.percent_identity || null,
                                accession_of_closest_sequence: a.accession_of_closest_sequence || null,
                            })),
                        })
                    }

                    if (s.predictedPhenotypes?.length) {
                        await tx.predictedPhenotype.createMany({
                            data: s.predictedPhenotypes.map(p => ({
                                sample_id: s.sample_id,
                                organism: p.organism || null,
                                antibiotic: p.antibiotic || null,
                                predicted_sir_profile: p.predicted_sir_profile || null,
                            })),
                        })
                    }

                    if (s.virulenceGenes?.length) {
                        await tx.virulenceGene.createMany({
                            data: s.virulenceGenes.map(v => ({
                                sample_id: s.sample_id,
                                gene_symbol: v.gene_symbol,
                            })),
                        })
                    }
                }
            })

            results.push({success: true, sample_id: s.sample_id, action: isNew ? 'created' : 'updated'})
        } catch (err) {
            console.error(`Template upload error for ${s.sample_id}:`, err)
            results.push({success: false, sample_id: s.sample_id, error: err.message})
        }
    }

    const created = results.filter(r => r.success && r.action === 'created').length
    const updated = results.filter(r => r.success && r.action === 'updated').length
    const failed = results.filter(r => !r.success).length

    return res.status(207).json({
        message: `Template upload completed: ${created} created, ${updated} updated, ${failed} failed`,
        results: {
            successCount: created + updated,
            createdCount: created,
            updatedCount: updated,
            failureCount: failed,
            totalSamples: results.length,
            sampleIDs: results.filter(r => r.success).map(r => r.sample_id),
            errors: results.filter(r => !r.success).map(r => ({sample_id: r.sample_id, error: r.error})),
        },
    })
})

export default router
