import {Router} from 'express'
import {body, param, validationResult} from 'express-validator'
import prisma from '../lib/prisma.js'
import {predictSirProfileWithAI} from '../lib/sir-prediction.js'
import {requireAuth} from '../middleware/auth.middleware.js'

const router = Router()

// ─── POST /api/samples - Create a new sample ─────────────────────────────────

router.post(
    '/',
    requireAuth,
    [
        body('sample_id').trim().isString().withMessage('Sample ID must be a string'),
        body('sample_name').trim().isString().withMessage('Sample name must be a string'),
        body('collected_by').optional().trim().isString(),
        body('latitude').isNumeric().withMessage('Latitude must be a number'),
        body('longitude').isNumeric().withMessage('Longitude must be a number'),
        body('water_temp').optional({nullable: true}).isNumeric(),
        body('ph').optional({nullable: true}).isNumeric(),
        body('tds').optional({nullable: true}).isNumeric(),
        body('do').optional({nullable: true}).isNumeric(),
        body('isolation_source').optional().trim().isString(),
        body('collection_date').optional().isISO8601(),
        body('location_name').optional().trim().isString(),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) return res.status(400).json({errors: errors.array()})

        const {
            sample_id,
            sample_name,
            collected_by,
            water_temp,
            ph,
            tds,
            do: do_value,
            isolation_source,
            collection_date,
            location_name,
            latitude,
            longitude,
        } = req.body

        try {
            const sample = await prisma.sample.create({
                data: {
                    sample_id,
                    sample_name,
                    collected_by: collected_by || null,
                    water_temp: water_temp ? parseFloat(water_temp) : null,
                    ph: ph ? parseFloat(ph) : null,
                    tds: tds ? parseFloat(tds) : null,
                    do: do_value ? parseFloat(do_value) : null,
                    isolation_source,
                    collection_date: collection_date ? new Date(collection_date) : null,
                    location_name,
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude),
                    uploaded_by: req.user.userID,
                },
            })
            return res.status(201).json({sample})
        } catch (err) {
            console.error('Create sample error:', err)
            if (err.code === 'P2002') {
                return res.status(409).json({message: `Sample ID "${sample_id}" already exists. Please use a different ID.`})
            }
            return res.status(500).json({message: `Failed to create sample: ${err.message}`})
        }
    }
)

// ─── GET /api/samples - Get all samples ───────────────────────────────────────

// Derive a flat SIR profile string ('resistant' | 'intermediate' | 'susceptible' | 'unknown')
// Priority: phenotypes (clinical) > AMR findings (genomic) > unknown
function derivePredictedSirProfile(predictedPhenotypes, amrFindings) {
    const hasPhenotypes = predictedPhenotypes && predictedPhenotypes.length > 0
    const hasAmrFindings = amrFindings && amrFindings.length > 0

    if (!hasPhenotypes && !hasAmrFindings) return 'unknown'

    // Phenotypes take clinical precedence
    if (hasPhenotypes) {
        const hasResistant = predictedPhenotypes.some((p) => p.predicted_sir_profile === 'Resistant')
        if (hasResistant) return 'resistant'

        const hasUnknown = predictedPhenotypes.some((p) => p.predicted_sir_profile === null || p.predicted_sir_profile === undefined || p.predicted_sir_profile === 'Intermediate')
        if (hasUnknown) return 'intermediate'

        return 'susceptible'
    }

    // AMR findings present but no phenotypes — presence of resistance genes implies resistance
    if (hasAmrFindings) return 'resistant'

    return 'unknown'
}

router.get('/', async (req, res) => {
    try {
        const samples = await prisma.sample.findMany({
            include: {predictedPhenotypes: true, isolates: true, amrFindings: true, virulenceGenes: true},
            orderBy: {created_at: 'desc'},
        })
        const samplesWithSirProfile = samples.map((sample) => ({
            ...sample,
            predicted_sir_profile: derivePredictedSirProfile(sample.predictedPhenotypes, sample.amrFindings),
        }))
        return res.json({samples: samplesWithSirProfile})
    } catch (err) {
        console.error('Get samples error:', err)
        return res.status(500).json({message: 'Failed to retrieve samples'})
    }
})

// ─── POST /api/samples/predict-phenotype - Predict resistant status ──────────

router.post(
    '/predict-phenotype',
    requireAuth,
    [
        body('latitude').isNumeric().withMessage('Latitude must be a number'),
        body('longitude').isNumeric().withMessage('Longitude must be a number'),
        body('organism').trim().notEmpty().withMessage('Organism is required'),
        body('antibiotic').trim().notEmpty().withMessage('Antibiotic is required'),
        body('water_temp').optional({nullable: true}).isNumeric(),
        body('ph').optional({nullable: true}).isNumeric(),
        body('tds').optional({nullable: true}).isNumeric(),
        body('do').optional({nullable: true}).isNumeric(),
        body('isolation_source').optional({nullable: true}).trim().isString(),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {organism, antibiotic, ...inputSample} = req.body

        try {
            // Fetch training samples with their predicted phenotypes
            const trainingSamples = await prisma.sample.findMany({
                include: {
                    predictedPhenotypes: true,
                },
                take: 1000,
            })

            const prediction = await predictSirProfileWithAI({
                inputSample,
                trainingSamples,
                organism,
                antibiotic,
            })

            return res.json({prediction})
        } catch (err) {
            console.error('Predict phenotype error:', err)
            return res.status(500).json({message: 'Failed to predict phenotype'})
        }
    }
)

// ─── GET /api/samples/:sample_id - Get sample by ID ──────────────────────────

router.get(
    '/:sample_id',
    [param('sample_id').trim().isString().withMessage('Sample ID must be a string')],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) return res.status(400).json({errors: errors.array()})

        const {sample_id} = req.params
        try {
            const sample = await prisma.sample.findUnique({
                where: {sample_id},
                include: {
                    isolates: true,
                    amrFindings: true,
                    predictedPhenotypes: true,
                    virulenceGenes: true,
                },
            })
            if (!sample) return res.status(404).json({message: 'Sample not found'})
            return res.json({sample})
        } catch (err) {
            console.error('Get sample error:', err)
            return res.status(500).json({message: 'Failed to retrieve sample'})
        }
    }
)

// ─── GET /api/samples/uploaded_by/:uploaded_by ───────────────────────────────

router.get(
    '/uploaded_by/:uploaded_by',
    [param('uploaded_by').isInt().withMessage('Uploaded by must be an integer')],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) return res.status(400).json({errors: errors.array()})

        const {uploaded_by} = req.params
        try {
            const samples = await prisma.sample.findMany({
                where: {uploaded_by: parseInt(uploaded_by)},
                include: {
                    isolates: true,
                    amrFindings: true,
                    predictedPhenotypes: true,
                },
            })
            return res.json({samples})
        } catch (err) {
            console.error('Get samples error:', err)
            return res.status(500).json({message: 'Failed to retrieve samples'})
        }
    }
)

// ─── PUT /api/samples/:sample_id - Update sample ──────────────────────────────

router.put(
    '/:sample_id',
    [
        param('sample_id').trim().isString().withMessage('Sample ID must be a string'),
        body('sample_name').optional().trim().isString(),
        body('collected_by').optional().trim().isString(),
        body('water_temp').optional().isDecimal(),
        body('ph').optional().isDecimal(),
        body('tds').optional().isDecimal(),
        body('do').optional().isDecimal(),
        body('isolation_source').optional().trim().isString(),
        body('collection_date').optional().isISO8601(),
        body('location_name').optional().trim().isString(),
        body('latitude').optional().isDecimal(),
        body('longitude').optional().isDecimal(),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) return res.status(400).json({errors: errors.array()})

        const {sample_id} = req.params
        const updateData = {}
        if (req.body.sample_name !== undefined) updateData.sample_name = req.body.sample_name
        if (req.body.collected_by !== undefined) updateData.collected_by = req.body.collected_by
        if (req.body.water_temp !== undefined) updateData.water_temp = parseFloat(req.body.water_temp)
        if (req.body.ph !== undefined) updateData.ph = parseFloat(req.body.ph)
        if (req.body.tds !== undefined) updateData.tds = parseFloat(req.body.tds)
        if (req.body.do !== undefined) updateData.do = parseFloat(req.body.do)
        if (req.body.isolation_source !== undefined) updateData.isolation_source = req.body.isolation_source
        if (req.body.collection_date !== undefined) updateData.collection_date = new Date(req.body.collection_date)
        if (req.body.location_name !== undefined) updateData.location_name = req.body.location_name
        if (req.body.latitude !== undefined) updateData.latitude = parseFloat(req.body.latitude)
        if (req.body.longitude !== undefined) updateData.longitude = parseFloat(req.body.longitude)

        try {
            const sample = await prisma.sample.update({
                where: {sample_id},
                data: updateData,
            })
            return res.json({sample})
        } catch (err) {
            if (err.code === 'P2025') return res.status(404).json({message: 'Sample not found'})
            console.error('Update sample error:', err)
            return res.status(500).json({message: 'Failed to update sample'})
        }
    }
)

// ─── DELETE /api/samples/:sample_id - Delete sample ──────────────────────────

router.delete(
    '/:sample_id',
    [param('sample_id').trim().isString().withMessage('Sample ID must be a string')],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) return res.status(400).json({errors: errors.array()})

        const {sample_id} = req.params
        try {
            await prisma.sample.delete({where: {sample_id}})
            return res.json({message: 'Sample deleted successfully'})
        } catch (err) {
            if (err.code === 'P2025') return res.status(404).json({message: 'Sample not found'})
            console.error('Delete sample error:', err)
            return res.status(500).json({message: 'Failed to delete sample'})
        }
    }
)

export default router
