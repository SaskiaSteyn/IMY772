import { Router } from 'express'
import multer from 'multer'
import {
    extractSampleFromImageBuffer,
    extractSamplesFromImageBuffer,
} from '../lib/image-extraction.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router = Router()

// In-memory upload only — the image is never written to disk or the database.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (/^image\//.test(file.mimetype)) {
            cb(null, true)
        } else {
            cb(new Error('Invalid file type. Only image files are allowed.'))
        }
    },
})

/**
 * POST /api/samples/extract-image
 * OCR a photo of a water-sample table and return the extracted data for the
 * user to review before submitting. The image is processed in memory and
 * discarded — only the extracted data is returned, nothing is persisted.
 *
 * With form field `mode=multi`, treats the image as a table where each row is a
 * separate sample and returns { samples: [...] }. Otherwise returns a single
 * sample's { fields, confidence, metagenomic, wgs, amrGenes, virulenceGenes }.
 */
router.post('/', requireAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image provided' })
        }

        const result =
            req.body.mode === 'multi'
                ? await extractSamplesFromImageBuffer(req.file.buffer)
                : await extractSampleFromImageBuffer(req.file.buffer)
        // req.file.buffer goes out of scope here; the image is not stored.

        return res.json(result)
    } catch (err) {
        console.error('Image extraction error:', err)
        return res.status(500).json({
            error: 'Failed to extract data from image',
            details: err.message,
        })
    }
})

export default router
