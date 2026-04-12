import {Router} from 'express'
import {body, param, validationResult} from 'express-validator'
import prisma from '../lib/prisma.js'

const router = Router()

// ─── POST /api/virulence-genes - Create virulence gene record ──────────────

router.post(
    '/',
    [
        body('sampleID').isInt().withMessage('Sample ID must be an integer'),
        body('isolateID').isInt().withMessage('Isolate ID must be an integer'),
        body('geneSymbol').optional().trim().isString(),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {sampleID, isolateID, geneSymbol} = req.body

        try {
            // Verify WGS isolate exists
            const wgs = await prisma.wgs.findFirst({
                where: {isolateID: parseInt(isolateID)},
            })

            if (!wgs) {
                return res.status(404).json({message: 'WGS isolate not found'})
            }

            const virulenceGene = await prisma.virulenceGene.create({
                data: {
                    sampleID: parseInt(sampleID),
                    isolateID: parseInt(isolateID),
                    geneSymbol,
                },
                include: {
                    wgs: {
                        include: {
                            sample: true,
                        },
                    },
                },
            })

            return res.status(201).json({virulenceGene})
        } catch (err) {
            console.error('Create virulence gene error:', err)
            return res.status(500).json({message: 'Failed to create virulence gene record'})
        }
    }
)

// ─── GET /api/virulence-genes - Get all virulence gene records ──────────────

router.get('/', async (req, res) => {
    try {
        const records = await prisma.virulenceGene.findMany({
            include: {
                wgs: {
                    include: {
                        sample: true,
                    },
                },
            },
        })

        return res.json({virulenceGenes: records})
    } catch (err) {
        console.error('Get virulence genes error:', err)
        return res.status(500).json({message: 'Failed to retrieve virulence gene records'})
    }
})

// ─── GET /api/virulence-genes/isolate/:isolateID/gene/:geneSymbol - Get specific virulence gene

router.get(
    '/isolate/:isolateID/gene/:geneSymbol',
    [param('isolateID').isInt().withMessage('Isolate ID must be an integer')],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {isolateID, geneSymbol} = req.params

        try {
            const virulenceGene = await prisma.virulenceGene.findUnique({
                where: {isolateID_geneSymbol: {isolateID: parseInt(isolateID), geneSymbol}},
                include: {
                    wgs: {
                        include: {
                            sample: true,
                        },
                    },
                },
            })

            if (!virulenceGene) {
                return res.status(404).json({message: 'Virulence gene record not found'})
            }

            return res.json({virulenceGene})
        } catch (err) {
            console.error('Get virulence gene error:', err)
            return res.status(500).json({message: 'Failed to retrieve virulence gene record'})
        }
    }
)

// ─── GET /api/virulence-genes/isolate/:isolateID - Get records by isolate ──

router.get(
    '/isolate/:isolateID',
    [param('isolateID').isInt().withMessage('Isolate ID must be an integer')],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {isolateID} = req.params

        try {
            const records = await prisma.virulenceGene.findMany({
                where: {isolateID: parseInt(isolateID)},
                include: {
                    wgs: {
                        include: {
                            sample: true,
                        },
                    },
                },
            })

            return res.json({virulenceGenes: records})
        } catch (err) {
            console.error('Get virulence genes by isolate error:', err)
            return res.status(500).json({message: 'Failed to retrieve virulence gene records'})
        }
    }
)

// ─── PUT /api/virulence-genes/isolate/:isolateID/gene/:geneSymbol - Update virulence gene

router.put(
    '/isolate/:isolateID/gene/:geneSymbol',
    [param('isolateID').isInt().withMessage('Isolate ID must be an integer')],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {isolateID, geneSymbol} = req.params
        const updateData = {}

        try {
            const virulenceGene = await prisma.virulenceGene.update({
                where: {isolateID_geneSymbol: {isolateID: parseInt(isolateID), geneSymbol}},
                data: updateData,
                include: {
                    wgs: {
                        include: {
                            sample: true,
                        },
                    },
                },
            })

            return res.json({virulenceGene})
        } catch (err) {
            if (err.code === 'P2025') {
                return res.status(404).json({message: 'Virulence gene record not found'})
            }
            console.error('Update virulence gene error:', err)
            return res.status(500).json({message: 'Failed to update virulence gene record'})
        }
    }
)

// ─── DELETE /api/virulence-genes/isolate/:isolateID/gene/:geneSymbol - Delete virulence gene

router.delete(
    '/isolate/:isolateID/gene/:geneSymbol',
    [param('isolateID').isInt().withMessage('Isolate ID must be an integer')],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()})
        }

        const {isolateID, geneSymbol} = req.params

        try {
            await prisma.virulenceGene.delete({
                where: {isolateID_geneSymbol: {isolateID: parseInt(isolateID), geneSymbol}},
            })

            return res.json({message: 'Virulence gene record deleted successfully'})
        } catch (err) {
            if (err.code === 'P2025') {
                return res.status(404).json({message: 'Virulence gene record not found'})
            }
            console.error('Delete virulence gene error:', err)
            return res.status(500).json({message: 'Failed to delete virulence gene record'})
        }
    }
)

export default router
