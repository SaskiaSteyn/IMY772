import {Router} from 'express'
import {body, param, validationResult} from 'express-validator'
import prisma from '../lib/prisma.js'
import {requireAuth} from '../middleware/auth.middleware.js'

const router = Router()

// ─── POST /api/predicted-phenotypes - Create a new predicted phenotype ───────

router.post(
    '/',
    requireAuth,
    [
        body('sample_id').trim().isString().withMessage('Sample ID must be a string'),
        body('organism').optional().trim().isString().withMessage('Organism must be a string'),
        body('antibiotic').optional().trim().isString().withMessage('Antibiotic must be a string'),
        body('resistant').optional().isBoolean().withMessage('Resistant must be a boolean'),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {sample_id, organism, antibiotic, resistant} = req.body

        try {
            // Verify sample exists
            const sample = await prisma.sample.findUnique({
                where: {sample_id},
            })

            if (!sample) {
                return res.status(404).json({message: 'Sample not found'})
            }

            const phenotype = await prisma.predictedPhenotype.create({
                data: {
                    sample_id,
                    organism,
                    antibiotic,
                    resistant: resistant !== undefined ? Boolean(resistant) : null,
                },
            })

            return res.status(201).json({phenotype})
        } catch (err) {
            console.error('Create predicted phenotype error:', err)
            return res.status(500).json({message: 'Failed to create predicted phenotype'})
        }
    }
)

// ─── GET /api/predicted-phenotypes - Get all predicted phenotypes ────────────

router.get('/', async (req, res) => {
    try {
        const phenotypes = await prisma.predictedPhenotype.findMany({
            include: {
                sample: true,
            },
        })

        return res.json({phenotypes})
    } catch (err) {
        console.error('Get predicted phenotypes error:', err)
        return res.status(500).json({message: 'Failed to retrieve predicted phenotypes'})
    }
})

// ─── GET /api/predicted-phenotypes/sample/:sample_id - Get phenotypes by sample

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
            const phenotypes = await prisma.predictedPhenotype.findMany({
                where: {sample_id},
                include: {
                    sample: true,
                },
            })

            return res.json({phenotypes})
        } catch (err) {
            console.error('Get predicted phenotypes error:', err)
            return res.status(500).json({message: 'Failed to retrieve predicted phenotypes'})
        }
    }
)

// ─── GET /api/predicted-phenotypes/:phenotype_id - Get phenotype by ID ───────

router.get(
    '/:phenotype_id',
    [param('phenotype_id').isInt().withMessage('Phenotype ID must be an integer')],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {phenotype_id} = req.params

        try {
            const phenotype = await prisma.predictedPhenotype.findUnique({
                where: {phenotype_id: parseInt(phenotype_id)},
                include: {
                    sample: true,
                },
            })

            if (!phenotype) {
                return res.status(404).json({message: 'Predicted phenotype not found'})
            }

            return res.json({phenotype})
        } catch (err) {
            console.error('Get predicted phenotype error:', err)
            return res.status(500).json({message: 'Failed to retrieve predicted phenotype'})
        }
    }
)

// ─── PUT /api/predicted-phenotypes/:phenotype_id - Update phenotype ──────────

router.put(
    '/:phenotype_id',
    requireAuth,
    [
        param('phenotype_id').isInt().withMessage('Phenotype ID must be an integer'),
        body('organism').optional().trim().isString(),
        body('antibiotic').optional().trim().isString(),
        body('resistant').optional().isBoolean(),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {phenotype_id} = req.params
        const updateData = {}

        if (req.body.organism !== undefined) updateData.organism = req.body.organism
        if (req.body.antibiotic !== undefined) updateData.antibiotic = req.body.antibiotic
        if (req.body.resistant !== undefined) updateData.resistant = Boolean(req.body.resistant)

        try {
            const phenotype = await prisma.predictedPhenotype.update({
                where: {phenotype_id: parseInt(phenotype_id)},
                data: updateData,
            })

            return res.json({phenotype})
        } catch (err) {
            if (err.code === 'P2025') {
                return res.status(404).json({message: 'Predicted phenotype not found'})
            }
            console.error('Update predicted phenotype error:', err)
            return res.status(500).json({message: 'Failed to update predicted phenotype'})
        }
    }
)

// ─── DELETE /api/predicted-phenotypes/:phenotype_id - Delete phenotype ───────

router.delete(
    '/:phenotype_id',
    requireAuth,
    [param('phenotype_id').isInt().withMessage('Phenotype ID must be an integer')],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {phenotype_id} = req.params

        try {
            await prisma.predictedPhenotype.delete({
                where: {phenotype_id: parseInt(phenotype_id)},
            })

            return res.json({message: 'Predicted phenotype deleted successfully'})
        } catch (err) {
            if (err.code === 'P2025') {
                return res.status(404).json({message: 'Predicted phenotype not found'})
            }
            console.error('Delete predicted phenotype error:', err)
            return res.status(500).json({message: 'Failed to delete predicted phenotype'})
        }
    }
)

export default router
