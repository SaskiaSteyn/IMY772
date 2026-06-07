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
        body('sample_id')
            .exists({checkFalsy: true})
            .withMessage('Sample ID is required')
            .isString()
            .trim(),
        body('organism').optional().trim().isString(),
        body('antibiotic').optional().trim().isString(),
        body('resistant').optional().isBoolean(),
        body('ai_resistant').optional({nullable: true}).isBoolean(),
        body('is_manual_override').optional().isBoolean(),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {sample_id, organism, antibiotic, resistant, ai_resistant, is_manual_override} = req.body

        try {
            const sample = await prisma.sample.findUnique({where: {sample_id}})
            if (!sample) {
                return res.status(404).json({message: 'Sample not found'})
            }

            const phenotype = await prisma.predictedPhenotype.create({
                data: {
                    sample_id,
                    organism,
                    antibiotic,
                    resistant: resistant !== undefined ? Boolean(resistant) : null,
                    ai_resistant:
                        ai_resistant !== undefined && ai_resistant !== null
                            ? Boolean(ai_resistant)
                            : resistant !== undefined
                              ? Boolean(resistant)
                              : null,
                    is_manual_override: is_manual_override !== undefined ? Boolean(is_manual_override) : false,
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
        const phenotypes = await prisma.predictedPhenotype.findMany({include: {sample: true}})
        return res.json({phenotypes})
    } catch (err) {
        console.error('Get predicted phenotypes error:', err)
        return res.status(500).json({message: 'Failed to retrieve predicted phenotypes'})
    }
})

// ─── GET /api/predicted-phenotypes/sample/:sample_id - Get phenotypes by sample
router.get(
    '/sample/:sample_id',
    [
        param('sample_id')
            .exists({checkFalsy: true})
            .withMessage('Sample ID is required')
            .isString()
            .trim(),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {sample_id} = req.params
        try {
            const phenotypes = await prisma.predictedPhenotype.findMany({
                where: {sample_id},
                include: {sample: true},
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
    [
        param('phenotype_id')
            .isInt()
            .withMessage('Phenotype ID must be an integer'),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {phenotype_id} = req.params
        try {
            const phenotype = await prisma.predictedPhenotype.findUnique({
                where: {phenotype_id: parseInt(phenotype_id)},
                include: {sample: true},
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
        param('phenotype_id')
            .isInt()
            .withMessage('Phenotype ID must be an integer'),
        body('organism').optional().trim().isString(),
        body('antibiotic').optional().trim().isString(),
        body('resistant').optional().isBoolean(),
        body('clear_manual_override').optional().isBoolean(),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {phenotype_id} = req.params
        const phenotypeId = parseInt(phenotype_id)
        const existing = await prisma.predictedPhenotype.findUnique({
            where: {phenotype_id: phenotypeId},
        })

        if (!existing) {
            return res.status(404).json({message: 'Predicted phenotype not found'})
        }

        const updateData = {}
        if (req.body.organism !== undefined) updateData.organism = req.body.organism
        if (req.body.antibiotic !== undefined) updateData.antibiotic = req.body.antibiotic
        if (req.body.resistant !== undefined) {
            const nextResistant = Boolean(req.body.resistant)
            const aiResistant =
                existing.ai_resistant === null || existing.ai_resistant === undefined
                    ? existing.resistant
                    : existing.ai_resistant

            updateData.resistant = nextResistant
            if (existing.ai_resistant === null || existing.ai_resistant === undefined) {
                updateData.ai_resistant = existing.resistant
            }
            updateData.is_manual_override =
                aiResistant === null || aiResistant === undefined ? true : nextResistant !== aiResistant
        }

        if (req.body.clear_manual_override === true) {
            if (existing.ai_resistant === null || existing.ai_resistant === undefined) {
                updateData.ai_resistant = existing.resistant
                updateData.resistant = existing.resistant
            } else {
                updateData.resistant = existing.ai_resistant
            }
            updateData.is_manual_override = false
        }

        try {
            const phenotype = await prisma.predictedPhenotype.update({
                where: {phenotype_id: phenotypeId},
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
    [
        param('phenotype_id')
            .isInt()
            .withMessage('Phenotype ID must be an integer'),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {phenotype_id} = req.params
        try {
            await prisma.predictedPhenotype.delete({where: {phenotype_id: parseInt(phenotype_id)}})
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