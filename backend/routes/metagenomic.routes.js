import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import prisma from '../lib/prisma.js'

const router = Router()

// ─── POST /api/metagenomic - Create metagenomic record ──────────────────────

router.post(
    '/',
    [
        body('sampleID').isInt().withMessage('Sample ID must be an integer'),
        body('sequence_name').optional().trim().isString(),
        body('element_type').optional().trim().isString(),
        body('class').optional().trim().isString(),
        body('subclass').optional().trim().isString(),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }

        const { sampleID, sequence_name, element_type, class: class_name, subclass } = req.body

        try {
            // Verify sample exists
            const sample = await prisma.sample.findUnique({
                where: { sampleID: parseInt(sampleID) },
            })

            if (!sample) {
                return res.status(404).json({ message: 'Sample not found' })
            }

            const metagenomic = await prisma.metagenomic.create({
                data: {
                    sampleID: parseInt(sampleID),
                    sequence_name,
                    element_type,
                    class: class_name,
                    subclass,
                },
                include: {
                    sample: true,
                },
            })

            return res.status(201).json({ metagenomic })
        } catch (err) {
            console.error('Create metagenomic error:', err)
            return res.status(500).json({ message: 'Failed to create metagenomic record' })
        }
    }
)

// ─── GET /api/metagenomic - Get all metagenomic records ──────────────────────

router.get('/', async (req, res) => {
    try {
        const records = await prisma.metagenomic.findMany({
            include: {
                sample: true,
            },
        })

        return res.json({ metagenomic: records })
    } catch (err) {
        console.error('Get metagenomic error:', err)
        return res.status(500).json({ message: 'Failed to retrieve metagenomic records' })
    }
})

// ─── GET /api/metagenomic/sample/:sampleID/sequence/:sequenceName - Get specific metagenomic

router.get(
    '/sample/:sampleID/sequence/:sequenceName',
    [param('sampleID').isInt().withMessage('Sample ID must be an integer')],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }

        const { sampleID, sequenceName } = req.params

        try {
            const metagenomic = await prisma.metagenomic.findUnique({
                where: { sampleID_sequence_name: { sampleID: parseInt(sampleID), sequence_name: sequenceName } },
                include: {
                    sample: true,
                },
            })

            if (!metagenomic) {
                return res.status(404).json({ message: 'Metagenomic record not found' })
            }

            return res.json({ metagenomic })
        } catch (err) {
            console.error('Get metagenomic error:', err)
            return res.status(500).json({ message: 'Failed to retrieve metagenomic record' })
        }
    }
)

// ─── GET /api/metagenomic/sample/:sampleID - Get records by sample ID ────────

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
            const records = await prisma.metagenomic.findMany({
                where: { sampleID: parseInt(sampleID) },
                include: {
                    sample: true,
                },
            })

            return res.json({ metagenomic: records })
        } catch (err) {
            console.error('Get metagenomic by sample error:', err)
            return res.status(500).json({ message: 'Failed to retrieve metagenomic records' })
        }
    }
)

// ─── PUT /api/metagenomic/sample/:sampleID/sequence/:sequenceName - Update metagenomic

router.put(
    '/sample/:sampleID/sequence/:sequenceName',
    [
        param('sampleID').isInt().withMessage('Sample ID must be an integer'),
        body('element_type').optional().trim().isString(),
        body('class').optional().trim().isString(),
        body('subclass').optional().trim().isString(),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }

        const { sampleID, sequenceName } = req.params
        const updateData = {}

        if (req.body.element_type !== undefined) updateData.element_type = req.body.element_type
        if (req.body.class !== undefined) updateData.class = req.body.class
        if (req.body.subclass !== undefined) updateData.subclass = req.body.subclass

        try {
            const metagenomic = await prisma.metagenomic.update({
                where: { sampleID_sequence_name: { sampleID: parseInt(sampleID), sequence_name: sequenceName } },
                data: updateData,
                include: {
                    sample: true,
                },
            })

            return res.json({ metagenomic })
        } catch (err) {
            if (err.code === 'P2025') {
                return res.status(404).json({ message: 'Metagenomic record not found' })
            }
            console.error('Update metagenomic error:', err)
            return res.status(500).json({ message: 'Failed to update metagenomic record' })
        }
    }
)

// ─── DELETE /api/metagenomic/sample/:sampleID/sequence/:sequenceName - Delete metagenomic

router.delete(
    '/sample/:sampleID/sequence/:sequenceName',
    [param('sampleID').isInt().withMessage('Sample ID must be an integer')],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }

        const { sampleID, sequenceName } = req.params

        try {
            await prisma.metagenomic.delete({
                where: { sampleID_sequence_name: { sampleID: parseInt(sampleID), sequence_name: sequenceName } },
            })

            return res.json({ message: 'Metagenomic record deleted successfully' })
        } catch (err) {
            if (err.code === 'P2025') {
                return res.status(404).json({ message: 'Metagenomic record not found' })
            }
            console.error('Delete metagenomic error:', err)
            return res.status(500).json({ message: 'Failed to delete metagenomic record' })
        }
    }
)

export default router
