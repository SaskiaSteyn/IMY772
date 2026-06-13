import {Router} from 'express'
import {body, param, validationResult} from 'express-validator'
import prisma from '../lib/prisma.js'
import {requireAuth} from '../middleware/auth.middleware.js'

const router = Router()

// ─── POST /api/amr-findings - Create a new AMR finding ──────────────────────
router.post(
    '/',
    requireAuth,
    [
        body('sample_id')
            .exists({checkFalsy: true})
            .withMessage('Sample ID is required')
            .isString()
            .trim(),
        body('analysis_type').optional().trim().isString(),
        body('gene_symbol').optional().trim().isString(),
        body('drug_class').optional().trim().isString(),
        body('method').optional().trim().isString(),
        body('percent_identity').optional({nullable: true}).isNumeric(),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {sample_id, analysis_type, gene_symbol, drug_class, method, percent_identity} = req.body

        try {
            const sample = await prisma.sample.findUnique({where: {sample_id}})
            if (!sample) {
                return res.status(404).json({message: 'Sample not found'})
            }

            const amrFinding = await prisma.amrFinding.create({
                data: {
                    sample_id,
                    analysis_type,
                    gene_symbol,
                    drug_class,
                    method,
                    percent_identity: percent_identity ? parseFloat(percent_identity) : null,
                },
            })
            return res.status(201).json({amrFinding})
        } catch (err) {
            console.error('Create AMR finding error:', err)
            if (err.code === 'P2003') {
                return res.status(400).json({message: `Sample ID "${sample_id}" does not exist. Create the sample first.`})
            }
            return res.status(500).json({message: `Failed to create AMR finding: ${err.message}`})
        }
    }
)

// ─── GET /api/amr-findings - Get all AMR findings ────────────────────────────
router.get('/', async (req, res) => {
    try {
        const amrFindings = await prisma.amrFinding.findMany({include: {sample: true}, orderBy: {finding_id: 'desc'}})
        return res.json({amrFindings})
    } catch (err) {
        console.error('Get AMR findings error:', err)
        return res.status(500).json({message: 'Failed to retrieve AMR findings'})
    }
})

// ─── GET /api/amr-findings/sample/:sample_id - Get AMR findings by sample ID ─
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
            const amrFindings = await prisma.amrFinding.findMany({
                where: {sample_id},
                include: {sample: true},
            })
            return res.json({amrFindings})
        } catch (err) {
            console.error('Get AMR findings error:', err)
            return res.status(500).json({message: 'Failed to retrieve AMR findings'})
        }
    }
)

// ─── GET /api/amr-findings/:amr_id - Get AMR finding by ID ──────────────────
router.get(
    '/:amr_id',
    [
        param('amr_id')
            .isInt()
            .withMessage('AMR ID must be an integer'),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {amr_id} = req.params
        try {
            const amrFinding = await prisma.amrFinding.findUnique({
                where: {amr_id: parseInt(amr_id)},
                include: {sample: true},
            })
            if (!amrFinding) {
                return res.status(404).json({message: 'AMR finding not found'})
            }
            return res.json({amrFinding})
        } catch (err) {
            console.error('Get AMR finding error:', err)
            return res.status(500).json({message: 'Failed to retrieve AMR finding'})
        }
    }
)

// ─── PUT /api/amr-findings/:amr_id - Update AMR finding ───────────────────────
router.put(
    '/:amr_id',
    requireAuth,
    [
        param('amr_id')
            .isInt()
            .withMessage('AMR ID must be an integer'),
        body('analysis_type').optional().trim().isString(),
        body('gene_symbol').optional().trim().isString(),
        body('drug_class').optional().trim().isString(),
        body('method').optional().trim().isString(),
        body('percent_identity').optional({nullable: true}).isNumeric(),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {amr_id} = req.params
        const updateData = {}
        if (req.body.analysis_type !== undefined) updateData.analysis_type = req.body.analysis_type
        if (req.body.gene_symbol !== undefined) updateData.gene_symbol = req.body.gene_symbol
        if (req.body.drug_class !== undefined) updateData.drug_class = req.body.drug_class
        if (req.body.method !== undefined) updateData.method = req.body.method
        if (req.body.percent_identity !== undefined) updateData.percent_identity = parseFloat(req.body.percent_identity)

        try {
            const amrFinding = await prisma.amrFinding.update({
                where: {amr_id: parseInt(amr_id)},
                data: updateData,
            })
            return res.json({amrFinding})
        } catch (err) {
            if (err.code === 'P2025') {
                return res.status(404).json({message: 'AMR finding not found'})
            }
            console.error('Update AMR finding error:', err)
            return res.status(500).json({message: 'Failed to update AMR finding'})
        }
    }
)

// ─── DELETE /api/amr-findings/:amr_id - Delete AMR finding ────────────────────
router.delete(
    '/:amr_id',
    requireAuth,
    [
        param('amr_id')
            .isInt()
            .withMessage('AMR ID must be an integer'),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {amr_id} = req.params
        try {
            await prisma.amrFinding.delete({where: {amr_id: parseInt(amr_id)}})
            return res.json({message: 'AMR finding deleted successfully'})
        } catch (err) {
            if (err.code === 'P2025') {
                return res.status(404).json({message: 'AMR finding not found'})
            }
            console.error('Delete AMR finding error:', err)
            return res.status(500).json({message: 'Failed to delete AMR finding'})
        }
    }
)

export default router