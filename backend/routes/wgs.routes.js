import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import prisma from '../lib/prisma.js'

const router = Router()

// ─── POST /api/wgs - Create WGS record ────────────────────────────────────────

router.post(
    '/',
    [
        body('sampleID').isInt().withMessage('Sample ID must be an integer'),
        body('isolateID').isInt().withMessage('Isolate ID must be an integer'),
        body('organism').optional().trim().isString(),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }

        const { sampleID, isolateID, organism } = req.body

        try {
            // Verify sample exists
            const sample = await prisma.sample.findUnique({
                where: { sampleID: parseInt(sampleID) },
            })

            if (!sample) {
                return res.status(404).json({ message: 'Sample not found' })
            }

            const wgs = await prisma.wgs.create({
                data: {
                    sampleID: parseInt(sampleID),
                    isolateID: parseInt(isolateID),
                    organism,
                },
                include: {
                    sample: true,
                    virulenceGenes: true,
                },
            })

            return res.status(201).json({ wgs })
        } catch (err) {
            console.error('Create WGS error:', err)
            return res.status(500).json({ message: 'Failed to create WGS record' })
        }
    }
)

// ─── GET /api/wgs - Get all WGS records ──────────────────────────────────────

router.get('/', async (req, res) => {
    try {
        const records = await prisma.wgs.findMany({
            include: {
                sample: true,
                virulenceGenes: true,
            },
        })

        return res.json({ wgs: records })
    } catch (err) {
        console.error('Get WGS error:', err)
        return res.status(500).json({ message: 'Failed to retrieve WGS records' })
    }
})

// ─── GET /api/wgs/:id - Get WGS record by ID ─────────────────────────────────

router.get(
    '/:id',
    [param('id').isInt().withMessage('ID must be an integer')],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }

        const { id } = req.params

        try {
            const wgs = await prisma.wgs.findUnique({
                where: { id: parseInt(id) },
                include: {
                    sample: true,
                    virulenceGenes: true,
                },
            })

            if (!wgs) {
                return res.status(404).json({ message: 'WGS record not found' })
            }

            return res.json({ wgs })
        } catch (err) {
            console.error('Get WGS error:', err)
            return res.status(500).json({ message: 'Failed to retrieve WGS record' })
        }
    }
)

// ─── GET /api/wgs/sample/:sampleID - Get WGS records by sample ID ────────────

router.get(
    '/sample/:sampleID',
    [param('sampleID').isInt().withMessage('Sample ID must be an integer')],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }

        const { sampleID } = req.params

        try {
            const records = await prisma.wgs.findMany({
                where: { sampleID: parseInt(sampleID) },
                include: {
                    sample: true,
                    virulenceGenes: true,
                },
            })

            return res.json({ wgs: records })
        } catch (err) {
            console.error('Get WGS by sample error:', err)
            return res.status(500).json({ message: 'Failed to retrieve WGS records' })
        }
    }
)

// ─── GET /api/wgs/isolate/:isolateID - Get WGS records by isolate ID ─────────

router.get(
    '/isolate/:isolateID',
    [param('isolateID').isInt().withMessage('Isolate ID must be an integer')],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }

        const { isolateID } = req.params

        try {
            const records = await prisma.wgs.findMany({
                where: { isolateID: parseInt(isolateID) },
                include: {
                    sample: true,
                    virulenceGenes: true,
                },
            })

            return res.json({ wgs: records })
        } catch (err) {
            console.error('Get WGS by isolate error:', err)
            return res.status(500).json({ message: 'Failed to retrieve WGS records' })
        }
    }
)

// ─── PUT /api/wgs/:id - Update WGS record ────────────────────────────────────

router.put(
    '/:id',
    [
        param('id').isInt().withMessage('ID must be an integer'),
        body('organism').optional().trim().isString(),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }

        const { id } = req.params
        const updateData = {}

        if (req.body.organism !== undefined) updateData.organism = req.body.organism

        try {
            const wgs = await prisma.wgs.update({
                where: { id: parseInt(id) },
                data: updateData,
                include: {
                    sample: true,
                    virulenceGenes: true,
                },
            })

            return res.json({ wgs })
        } catch (err) {
            if (err.code === 'P2025') {
                return res.status(404).json({ message: 'WGS record not found' })
            }
            console.error('Update WGS error:', err)
            return res.status(500).json({ message: 'Failed to update WGS record' })
        }
    }
)

// ─── DELETE /api/wgs/:id - Delete WGS record ─────────────────────────────────

router.delete(
    '/:id',
    [param('id').isInt().withMessage('ID must be an integer')],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }

        const { id } = req.params

        try {
            await prisma.wgs.delete({
                where: { id: parseInt(id) },
            })

            return res.json({ message: 'WGS record deleted successfully' })
        } catch (err) {
            if (err.code === 'P2025') {
                return res.status(404).json({ message: 'WGS record not found' })
            }
            console.error('Delete WGS error:', err)
            return res.status(500).json({ message: 'Failed to delete WGS record' })
        }
    }
)

export default router
