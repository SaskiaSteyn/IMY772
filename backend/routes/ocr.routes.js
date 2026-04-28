import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/auth.middleware.js'
import { validateSamples } from '../lib/file-parser.js'
import { insertSamplesWithRelations } from '../lib/sample-ingestion.js'
import { getOCRService } from '../lib/ocr-service.js'

const router = Router()

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (_req, file, cb) => {
        const allowed = new Set([
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/webp',
        ])

        if (!allowed.has(file.mimetype)) {
            cb(new Error('Invalid image type. Please upload a PNG, JPG, JPEG, or WEBP image.'))
            return
        }

        cb(null, true)
    },
})

/**
 * POST /api/ocr/extract
 * Extract OCR data from uploaded image
 * Response: sample-first contract with diagnostics
 */
router.post('/extract', requireAuth, upload.single('file'), async (req, res) => {
    try {
        const ocrService = getOCRService()

        // Validate file was uploaded
        if (!req.file) {
            return res.status(400).json({
                message: 'Validation failed',
                error: 'INVALID_MIME_TYPE',
                details: ['No file uploaded'],
            })
        }

        // Call OCR service
        const result = await ocrService.extractImage(req.file)
        return res.json(result)
    } catch (error) {
        // Handle OCR service errors
        const httpStatus = error.httpStatus || 500
        const errorCode = error.code || 'INTERNAL_ERROR'
        const errorDetails = error.details || ['An unexpected error occurred']

        console.error('[OCR Extract] Error:', error.message, errorCode)

        return res.status(httpStatus).json({
            message: error.message,
            error: errorCode,
            details: errorDetails,
        })
    }
})

/**
 * POST /api/ocr/ingest-reviewed
 * Ingest reviewed OCR samples into database
 */
router.post('/ingest-reviewed', requireAuth, async (req, res) => {
    try {
        const samples = req.body?.samples

        if (!Array.isArray(samples) || samples.length === 0) {
            return res.status(400).json({
                message: 'At least one reviewed sample is required',
            })
        }

        const validation = validateSamples(samples)
        if (!validation.isValid) {
            return res.status(400).json({
                message: 'Validation failed',
                details: validation.errors,
            })
        }

        const results = await insertSamplesWithRelations(samples)

        return res.json({
            message: 'Reviewed samples ingested successfully',
            results,
        })
    } catch (error) {
        console.error('Reviewed OCR ingest error:', error)
        return res.status(500).json({
            message: 'Server error during reviewed sample ingestion',
        })
    }
})

export default router
