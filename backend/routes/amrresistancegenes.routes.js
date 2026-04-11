import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import prisma from '../lib/prisma.js'

const router = Router()

// ─── POST /api/amr-resistance-genes - Create AMR resistance gene record ────

router.post(
    '/',
    [
        body('sampleID').isInt().withMessage('Sample ID must be an integer'),
        body('geneSymbol').optional().trim().isString(),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }

        const { sampleID, geneSymbol } = req.body

        try {
            // Verify sample exists
            const sample = await prisma.sample.findUnique({
                where: { sampleID: parseInt(sampleID) },
            })

            if (!sample) {
                return res.status(404).json({ message: 'Sample not found' })
            }

            const amrGene = await prisma.amrResistanceGene.create({
                data: {
                    sampleID: parseInt(sampleID),
                    geneSymbol,
                },
                include: {
                    sample: true,
                },
            })

            return res.status(201).json({ amrResistanceGene: amrGene })
        } catch (err) {
            console.error('Create AMR resistance gene error:', err)
            return res.status(500).json({ message: 'Failed to create AMR resistance gene record' })
        }
    }
)

// ─── GET /api/amr-resistance-genes - Get all AMR resistance gene records ────

router.get('/', async (req, res) => {
    try {
        const records = await prisma.amrResistanceGene.findMany({
            include: {
                sample: true,
            },
        })

        return res.json({ amrResistanceGenes: records })
    } catch (err) {
        console.error('Get AMR resistance genes error:', err)
        return res.status(500).json({ message: 'Failed to retrieve AMR resistance gene records' })
    }
})

// ─── GET /api/amr-resistance-genes/:id - Get AMR record by ID ───────────────

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
            const amrGene = await prisma.amrResistanceGene.findUnique({
                where: { id: parseInt(id) },
                include: {
                    sample: true,
                },
            })

            if (!amrGene) {
                return res.status(404).json({ message: 'AMR resistance gene record not found' })
            }

            return res.json({ amrResistanceGene: amrGene })
        } catch (err) {
            console.error('Get AMR resistance gene error:', err)
            return res.status(500).json({ message: 'Failed to retrieve AMR resistance gene record' })
        }
    }
)

// ─── GET /api/amr-resistance-genes/sample/:sampleID - Get records by sample ─

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
            const records = await prisma.amrResistanceGene.findMany({
                where: { sampleID: parseInt(sampleID) },
                include: {
                    sample: true,
                },
            })

            return res.json({ amrResistanceGenes: records })
        } catch (err) {
            console.error('Get AMR resistance genes by sample error:', err)
            return res.status(500).json({ message: 'Failed to retrieve AMR resistance gene records' })
        }
    }
)

// ─── PUT /api/amr-resistance-genes/:id - Update AMR record ────────────────────

router.put(
    '/:id',
    [
        param('id').isInt().withMessage('ID must be an integer'),
        body('geneSymbol').optional().trim().isString(),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }

        const { id } = req.params
        const updateData = {}

        if (req.body.geneSymbol !== undefined) updateData.geneSymbol = req.body.geneSymbol

        try {
            const amrGene = await prisma.amrResistanceGene.update({
                where: { id: parseInt(id) },
                data: updateData,
                include: {
                    sample: true,
                },
            })

            return res.json({ amrResistanceGene: amrGene })
        } catch (err) {
            if (err.code === 'P2025') {
                return res.status(404).json({ message: 'AMR resistance gene record not found' })
            }
            console.error('Update AMR resistance gene error:', err)
            return res.status(500).json({ message: 'Failed to update AMR resistance gene record' })
        }
    }
)

// ─── DELETE /api/amr-resistance-genes/:id - Delete AMR record ────────────────

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
            await prisma.amrResistanceGene.delete({
                where: { id: parseInt(id) },
            })

            return res.json({ message: 'AMR resistance gene record deleted successfully' })
        } catch (err) {
            if (err.code === 'P2025') {
                return res.status(404).json({ message: 'AMR resistance gene record not found' })
            }
            console.error('Delete AMR resistance gene error:', err)
            return res.status(500).json({ message: 'Failed to delete AMR resistance gene record' })
        }
    }
)

export default router
