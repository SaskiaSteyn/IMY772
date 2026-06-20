import {Router} from 'express'
import {body, param, validationResult} from 'express-validator'
import prisma from '../lib/prisma.js'
import {requireAuth} from '../middleware/auth.middleware.js'

const router = Router()

// ─── POST /api/virulence-genes - Create a new virulence gene ─────────────────
router.post(
    '/',
    requireAuth,
    [
        body('sample_id')
            .exists({checkFalsy: true})
            .withMessage('Sample ID is required')
            .isString()
            .trim(),
        body('gene_symbol')
            .exists({checkFalsy: true})
            .withMessage('Gene symbol is required')
            .isString()
            .trim(),
        body('method').optional().trim().isString(),
        body('percent_identity').optional({nullable: true}).isNumeric(),
        body('coverage_percent').optional({nullable: true}).isNumeric(),
        body('alignment_length').optional({nullable: true}).isInt(),
        body('target_length').optional({nullable: true}).isInt(),
        body('ref_seq_length').optional({nullable: true}).isInt(),
        body('accession').optional().trim().isString(),
        body('sequence_name').optional().trim().isString(),
        body('element_type').optional().trim().isString(),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {
            sample_id,
            gene_symbol,
            method,
            percent_identity,
            coverage_percent,
            alignment_length,
            target_length,
            ref_seq_length,
            accession,
            sequence_name,
            element_type,
        } = req.body

        try {
            const sample = await prisma.sample.findUnique({where: {sample_id}})
            if (!sample) {
                return res.status(404).json({message: 'Sample not found'})
            }

            const virulenceGene = await prisma.virulenceGene.create({
                data: {
                    sample_id,
                    gene_symbol,
                    method,
                    percent_identity: percent_identity ? parseFloat(percent_identity) : null,
                    coverage_percent: coverage_percent ? parseFloat(coverage_percent) : null,
                    alignment_length: alignment_length !== undefined && alignment_length !== null ? parseInt(alignment_length) : null,
                    target_length: target_length !== undefined && target_length !== null ? parseInt(target_length) : null,
                    ref_seq_length: ref_seq_length !== undefined && ref_seq_length !== null ? parseInt(ref_seq_length) : null,
                    accession,
                    sequence_name,
                    element_type,
                },
            })
            return res.status(201).json({virulenceGene})
        } catch (err) {
            console.error('Create virulence gene error:', err)
            if (err.code === 'P2003') {
                return res.status(400).json({message: `Sample ID "${sample_id}" does not exist. Create the sample first.`})
            }
            return res.status(500).json({message: `Failed to create virulence gene: ${err.message}`})
        }
    }
)

// ─── GET /api/virulence-genes - Get all virulence genes ──────────────────────
router.get('/', async (req, res) => {
    try {
        const virulenceGenes = await prisma.virulenceGene.findMany({include: {sample: true}, orderBy: {virulence_gene_id: 'desc'}})
        return res.json({virulenceGenes})
    } catch (err) {
        console.error('Get virulence genes error:', err)
        return res.status(500).json({message: 'Failed to retrieve virulence genes'})
    }
})

// ─── GET /api/virulence-genes/sample/:sample_id - Get virulence genes by sample
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
            const virulenceGenes = await prisma.virulenceGene.findMany({
                where: {sample_id},
                include: {sample: true},
            })
            return res.json({virulenceGenes})
        } catch (err) {
            console.error('Get virulence genes error:', err)
            return res.status(500).json({message: 'Failed to retrieve virulence genes'})
        }
    }
)

// ─── GET /api/virulence-genes/:virulence_gene_id - Get virulence gene by ID ──
router.get(
    '/:virulence_gene_id',
    [
        param('virulence_gene_id')
            .isInt()
            .withMessage('Virulence gene ID must be an integer'),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {virulence_gene_id} = req.params
        try {
            const virulenceGene = await prisma.virulenceGene.findUnique({
                where: {virulence_gene_id: parseInt(virulence_gene_id)},
                include: {sample: true},
            })
            if (!virulenceGene) {
                return res.status(404).json({message: 'Virulence gene not found'})
            }
            return res.json({virulenceGene})
        } catch (err) {
            console.error('Get virulence gene error:', err)
            return res.status(500).json({message: 'Failed to retrieve virulence gene'})
        }
    }
)

// ─── PUT /api/virulence-genes/:virulence_gene_id - Update virulence gene ──────
router.put(
    '/:virulence_gene_id',
    requireAuth,
    [
        param('virulence_gene_id')
            .isInt()
            .withMessage('Virulence gene ID must be an integer'),
        body('gene_symbol').optional().trim().isString(),
        body('method').optional().trim().isString(),
        body('percent_identity').optional({nullable: true}).isNumeric(),
        body('coverage_percent').optional({nullable: true}).isNumeric(),
        body('alignment_length').optional({nullable: true}).isInt(),
        body('target_length').optional({nullable: true}).isInt(),
        body('ref_seq_length').optional({nullable: true}).isInt(),
        body('accession').optional().trim().isString(),
        body('sequence_name').optional().trim().isString(),
        body('element_type').optional().trim().isString(),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {virulence_gene_id} = req.params
        const updateData = {}
        if (req.body.gene_symbol !== undefined) updateData.gene_symbol = req.body.gene_symbol
        if (req.body.method !== undefined) updateData.method = req.body.method
        if (req.body.percent_identity !== undefined) updateData.percent_identity = parseFloat(req.body.percent_identity)
        if (req.body.coverage_percent !== undefined) updateData.coverage_percent = parseFloat(req.body.coverage_percent)
        if (req.body.alignment_length !== undefined) updateData.alignment_length = req.body.alignment_length !== null ? parseInt(req.body.alignment_length) : null
        if (req.body.target_length !== undefined) updateData.target_length = req.body.target_length !== null ? parseInt(req.body.target_length) : null
        if (req.body.ref_seq_length !== undefined) updateData.ref_seq_length = req.body.ref_seq_length !== null ? parseInt(req.body.ref_seq_length) : null
        if (req.body.accession !== undefined) updateData.accession = req.body.accession
        if (req.body.sequence_name !== undefined) updateData.sequence_name = req.body.sequence_name
        if (req.body.element_type !== undefined) updateData.element_type = req.body.element_type

        try {
            const virulenceGene = await prisma.virulenceGene.update({
                where: {virulence_gene_id: parseInt(virulence_gene_id)},
                data: updateData,
            })
            return res.json({virulenceGene})
        } catch (err) {
            if (err.code === 'P2025') {
                return res.status(404).json({message: 'Virulence gene not found'})
            }
            console.error('Update virulence gene error:', err)
            return res.status(500).json({message: 'Failed to update virulence gene'})
        }
    }
)

// ─── DELETE /api/virulence-genes/:virulence_gene_id - Delete virulence gene ───
router.delete(
    '/:virulence_gene_id',
    requireAuth,
    [
        param('virulence_gene_id')
            .isInt()
            .withMessage('Virulence gene ID must be an integer'),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {virulence_gene_id} = req.params
        try {
            await prisma.virulenceGene.delete({where: {virulence_gene_id: parseInt(virulence_gene_id)}})
            return res.json({message: 'Virulence gene deleted successfully'})
        } catch (err) {
            if (err.code === 'P2025') {
                return res.status(404).json({message: 'Virulence gene not found'})
            }
            console.error('Delete virulence gene error:', err)
            return res.status(500).json({message: 'Failed to delete virulence gene'})
        }
    }
)

export default router
