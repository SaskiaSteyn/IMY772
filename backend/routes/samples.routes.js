import {Router} from 'express'
import {body, param, validationResult} from 'express-validator'
import prisma from '../lib/prisma.js'
import {requireAuth} from '../middleware/auth.middleware.js'

const router = Router()

// ─── POST /api/samples - Create a new sample ─────────────────────────────────

router.post(
    '/',
    requireAuth,
    [
        body('latitude').isDecimal().withMessage('Latitude must be a decimal'),
        body('longitude').isDecimal().withMessage('Longitude must be a decimal'),
        body('water_temperature').optional().isDecimal().withMessage('Water temperature must be decimal'),
        body('ph').optional().isDecimal().withMessage('pH must be decimal'),
        body('tds').optional().isDecimal().withMessage('TDS must be decimal'),
        body('do').optional().isDecimal().withMessage('DO must be decimal'),
        body('sample_analysis_type').optional().trim().isString(),
        body('isolation_source').optional().trim().isString(),
        body('collection_date').optional().isISO8601().withMessage('Collection date must be valid ISO8601'),
        body('location_name').optional().trim().isString(),
        body('collected_by').optional().trim().isString(),
        body('predicted_sir_profile').optional().isIn(['Not Resistant', 'Resistant']),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {
            water_temperature,
            ph,
            tds,
            do: do_value,
            sample_analysis_type,
            isolation_source,
            collection_date,
            location_name,
            latitude,
            longitude,
            collected_by,
            uploaded_by,
            predicted_sir_profile,
        } = req.body

        try {
            const sample = await prisma.sample.create({
                data: {
                    water_temperature: water_temperature ? parseFloat(water_temperature) : null,
                    ph: ph ? parseFloat(ph) : null,
                    tds: tds ? parseFloat(tds) : null,
                    do: do_value ? parseFloat(do_value) : null,
                    sample_analysis_type,
                    isolation_source,
                    collection_date: collection_date ? new Date(collection_date) : null,
                    location_name,
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude),
                    collected_by,
                    uploaded_by: req.user.userID,
                    predicted_sir_profile,
                },
            })

            return res.status(201).json({sample})
        } catch (err) {
            console.error('Create sample error:', err)
            return res.status(500).json({message: 'Failed to create sample'})
        }
    }
)

// ─── GET /api/samples - Get all samples ───────────────────────────────────────

router.get('/', async (req, res) => {
    try {
        const samples = await prisma.sample.findMany()

        return res.json({samples})
    } catch (err) {
        console.error('Get samples error:', err)
        return res.status(500).json({message: 'Failed to retrieve samples'})
    }
})

// ─── GET /api/samples/:sampleID - Get sample by ID ──────────────────────────

router.get(
    '/:sampleID',
    [param('sampleID').isInt().withMessage('Sample ID must be an integer')],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {sampleID} = req.params

        try {
            const sample = await prisma.sample.findUnique({
                where: {sampleID: parseInt(sampleID)},
            })

            if (!sample) {
                return res.status(404).json({message: 'Sample not found'})
            }

            return res.json({sample})
        } catch (err) {
            console.error('Get sample error:', err)
            return res.status(500).json({message: 'Failed to retrieve sample'})
        }
    }
)

// ─── PUT /api/samples/:sampleID - Update sample ──────────────────────────────

router.put(
    '/:sampleID',
    [
        param('sampleID').isInt().withMessage('Sample ID must be an integer'),
        body('water_temperature').optional().isDecimal(),
        body('ph').optional().isDecimal(),
        body('tds').optional().isDecimal(),
        body('do').optional().isDecimal(),
        body('sample_analysis_type').optional().trim().isString(),
        body('isolation_source').optional().trim().isString(),
        body('collection_date').optional().isISO8601(),
        body('location_name').optional().trim().isString(),
        body('latitude').optional().isDecimal(),
        body('longitude').optional().isDecimal(),
        body('collected_by').optional().trim().isString(),
        body('uploaded_by').isInt(),
        body('predicted_sir_profile').optional().isIn(['Not Resistant', 'Resistant']),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {sampleID} = req.params
        const updateData = {}

        // Build update object only with provided fields
        if (req.body.water_temperature !== undefined) updateData.water_temperature = parseFloat(req.body.water_temperature)
        if (req.body.ph !== undefined) updateData.ph = parseFloat(req.body.ph)
        if (req.body.tds !== undefined) updateData.tds = parseFloat(req.body.tds)
        if (req.body.do !== undefined) updateData.do = parseFloat(req.body.do)
        if (req.body.sample_analysis_type !== undefined) updateData.sample_analysis_type = req.body.sample_analysis_type
        if (req.body.isolation_source !== undefined) updateData.isolation_source = req.body.isolation_source
        if (req.body.collection_date !== undefined) updateData.collection_date = new Date(req.body.collection_date)
        if (req.body.location_name !== undefined) updateData.location_name = req.body.location_name
        if (req.body.latitude !== undefined) updateData.latitude = parseFloat(req.body.latitude)
        if (req.body.longitude !== undefined) updateData.longitude = parseFloat(req.body.longitude)
        if (req.body.collected_by !== undefined) updateData.collected_by = req.body.collected_by
        if (req.body.uploaded_by !== undefined) updateData.uploaded_by = parseInt(req.body.uploaded_by)
        if (req.body.predicted_sir_profile !== undefined) updateData.predicted_sir_profile = req.body.predicted_sir_profile

        try {
            const sample = await prisma.sample.update({
                where: {sampleID: parseInt(sampleID)},
                data: updateData,
            })

            return res.json({sample})
        } catch (err) {
            if (err.code === 'P2025') {
                return res.status(404).json({message: 'Sample not found'})
            }
            console.error('Update sample error:', err)
            return res.status(500).json({message: 'Failed to update sample'})
        }
    }
)

// ─── DELETE /api/samples/:sampleID - Delete sample ──────────────────────────

router.delete(
    '/:sampleID',
    [param('sampleID').isInt().withMessage('Sample ID must be an integer')],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {sampleID} = req.params

        try {
            await prisma.sample.delete({
                where: {sampleID: parseInt(sampleID)},
            })

            return res.json({message: 'Sample deleted successfully'})
        } catch (err) {
            if (err.code === 'P2025') {
                return res.status(404).json({message: 'Sample not found'})
            }
            console.error('Delete sample error:', err)
            return res.status(500).json({message: 'Failed to delete sample'})
        }
    }
)

export default router
