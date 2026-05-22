import {Router} from 'express'
import {body, param, validationResult} from 'express-validator'
import prisma from '../lib/prisma.js'
import {requireAuth} from '../middleware/auth.middleware.js'

const router = Router()

// ─── POST /api/isolates - Create a new isolate ───────────────────────────────

router.post(
    '/',
    requireAuth,
    [
        body('sample_id').trim().isString().withMessage('Sample ID must be a string'),
        body('organism').optional().trim().isString().withMessage('Organism must be a string'),
        body('mlst_type').optional().trim().isString().withMessage('MLST type must be a string'),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {sample_id, organism, mlst_type} = req.body

        try {
            // Verify sample exists
            const sample = await prisma.sample.findUnique({
                where: {sample_id},
            })

            if (!sample) {
                return res.status(404).json({message: 'Sample not found'})
            }

            const isolate = await prisma.isolate.create({
                data: {
                    sample_id,
                    organism,
                    mlst_type,
                },
            })

            return res.status(201).json({isolate})
        } catch (err) {
            console.error('Create isolate error:', err)
            return res.status(500).json({message: 'Failed to create isolate'})
        }
    }
)

// ─── GET /api/isolates - Get all isolates ────────────────────────────────────

router.get('/', async (req, res) => {
    try {
        const isolates = await prisma.isolate.findMany({
            include: {
                sample: true,
            },
        })

        return res.json({isolates})
    } catch (err) {
        console.error('Get isolates error:', err)
        return res.status(500).json({message: 'Failed to retrieve isolates'})
    }
})

// ─── GET /api/isolates/sample/:sample_id - Get isolates by sample ID ────────

router.get(
    '/sample/:sample_id',
    [param('sample_id').trim().isString().withMessage('Sample ID must be a string')],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {sample_id} = req.params

        try {
            const isolates = await prisma.isolate.findMany({
                where: {sample_id},
                include: {
                    sample: true,
                },
            })

            return res.json({isolates})
        } catch (err) {
            console.error('Get isolates error:', err)
            return res.status(500).json({message: 'Failed to retrieve isolates'})
        }
    }
)

// ─── GET /api/isolates/:isolate_id - Get isolate by ID ──────────────────────

router.get(
    '/:isolate_id',
    [param('isolate_id').isInt().withMessage('Isolate ID must be an integer')],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {isolate_id} = req.params

        try {
            const isolate = await prisma.isolate.findUnique({
                where: {isolate_id: parseInt(isolate_id)},
                include: {
                    sample: true,
                },
            })

            if (!isolate) {
                return res.status(404).json({message: 'Isolate not found'})
            }

            return res.json({isolate})
        } catch (err) {
            console.error('Get isolate error:', err)
            return res.status(500).json({message: 'Failed to retrieve isolate'})
        }
    }
)

// ─── PUT /api/isolates/:isolate_id - Update isolate ────────────────────────

router.put(
    '/:isolate_id',
    [
        param('isolate_id').isInt().withMessage('Isolate ID must be an integer'),
        body('organism').optional().trim().isString(),
        body('mlst_type').optional().trim().isString(),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {isolate_id} = req.params
        const updateData = {}

        if (req.body.organism !== undefined) updateData.organism = req.body.organism
        if (req.body.mlst_type !== undefined) updateData.mlst_type = req.body.mlst_type

        try {
            const isolate = await prisma.isolate.update({
                where: {isolate_id: parseInt(isolate_id)},
                data: updateData,
            })

            return res.json({isolate})
        } catch (err) {
            if (err.code === 'P2025') {
                return res.status(404).json({message: 'Isolate not found'})
            }
            console.error('Update isolate error:', err)
            return res.status(500).json({message: 'Failed to update isolate'})
        }
    }
)

// ─── DELETE /api/isolates/:isolate_id - Delete isolate ──────────────────────

router.delete(
    '/:isolate_id',
    [param('isolate_id').isInt().withMessage('Isolate ID must be an integer')],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {isolate_id} = req.params

        try {
            await prisma.isolate.delete({
                where: {isolate_id: parseInt(isolate_id)},
            })

            return res.json({message: 'Isolate deleted successfully'})
        } catch (err) {
            if (err.code === 'P2025') {
                return res.status(404).json({message: 'Isolate not found'})
            }
            console.error('Delete isolate error:', err)
            return res.status(500).json({message: 'Failed to delete isolate'})
        }
    }
)

export default router
