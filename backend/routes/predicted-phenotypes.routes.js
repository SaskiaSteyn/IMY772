import {Router} from 'express'
import {body, param, validationResult} from 'express-validator'
import prisma from '../lib/prisma.js'
import {requireAuth} from '../middleware/auth.middleware.js'

const router = Router()

// Helper: derive ai_resistant boolean from predicted_sir_profile string
function sirProfileToBoolean(profile) {
    if (profile === 'Resistant') return true
    if (profile === 'Susceptible') return false
    return null // Intermediate or null
}

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
        body('predicted_sir_profile')
            .optional()
            .isString()
            .isIn(['Susceptible', 'Intermediate', 'Resistant'])
            .withMessage('predicted_sir_profile must be one of: Susceptible, Intermediate, Resistant'),
        body('ai_resistant').optional({nullable: true}).isBoolean(),
        body('is_manual_override').optional().isBoolean(),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {sample_id, organism, antibiotic, predicted_sir_profile, ai_resistant, is_manual_override} = req.body

        try {
            const sample = await prisma.sample.findUnique({where: {sample_id}})
            if (!sample) {
                return res.status(404).json({message: 'Sample not found'})
            }

            // Derive ai_resistant from predicted_sir_profile if not explicitly provided
            const derivedAiResistant =
                ai_resistant !== undefined && ai_resistant !== null
                    ? Boolean(ai_resistant)
                    : sirProfileToBoolean(predicted_sir_profile)

            const phenotype = await prisma.predictedPhenotype.create({
                data: {
                    sample_id,
                    organism,
                    antibiotic,
                    predicted_sir_profile: predicted_sir_profile || null,
                    ai_resistant: derivedAiResistant,
                    is_manual_override: is_manual_override !== undefined ? Boolean(is_manual_override) : false,
                },
            })
            return res.status(201).json({phenotype})
        } catch (err) {
            console.error('Create predicted phenotype error:', err)
            if (err.code === 'P2003') {
                return res.status(400).json({message: `Sample ID "${sample_id}" does not exist. Create the sample first.`})
            }
            return res.status(500).json({message: `Failed to create predicted phenotype: ${err.message}`})
        }
    }
)

// ─── GET /api/predicted-phenotypes - Get all predicted phenotypes ────────────
router.get('/', async (req, res) => {
    try {
        const phenotypes = await prisma.predictedPhenotype.findMany({include: {sample: true}, orderBy: {phenotype_id: 'desc'}})
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
        body('predicted_sir_profile')
            .optional()
            .isString()
            .isIn(['Susceptible', 'Intermediate', 'Resistant'])
            .withMessage('predicted_sir_profile must be one of: Susceptible, Intermediate, Resistant'),
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
        if (req.body.predicted_sir_profile !== undefined) {
            const nextProfile = req.body.predicted_sir_profile
            const nextResistant = sirProfileToBoolean(nextProfile)

            // Determine what ai_resistant was before this manual change
            const aiResistant =
                existing.ai_resistant === null || existing.ai_resistant === undefined
                    ? sirProfileToBoolean(existing.predicted_sir_profile)
                    : existing.ai_resistant

            updateData.predicted_sir_profile = nextProfile
            if (existing.ai_resistant === null || existing.ai_resistant === undefined) {
                updateData.ai_resistant = sirProfileToBoolean(existing.predicted_sir_profile)
            }
            updateData.is_manual_override =
                aiResistant === null || aiResistant === undefined ? true : nextResistant !== aiResistant
        }

        if (req.body.clear_manual_override === true) {
            if (existing.ai_resistant === null || existing.ai_resistant === undefined) {
                // Back-fill ai_resistant from current predicted_sir_profile
                const current = sirProfileToBoolean(existing.predicted_sir_profile)
                updateData.ai_resistant = current
                updateData.predicted_sir_profile = existing.predicted_sir_profile
            } else {
                // Revert predicted_sir_profile to match ai_resistant
                updateData.predicted_sir_profile =
                    existing.ai_resistant === true ? 'Resistant' :
                    existing.ai_resistant === false ? 'Susceptible' : null
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
