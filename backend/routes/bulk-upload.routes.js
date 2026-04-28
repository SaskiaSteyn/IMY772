import { Router } from 'express';
import multer from 'multer';
import { parseCSVFile, parseJSONFile, validateSamples } from '../lib/file-parser.js';
import { insertSamplesWithRelations } from '../lib/sample-ingestion.js';

const router = Router();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Check file extension (more reliable than MIME type)
        const fileName = file.originalname.toLowerCase();
        const isCSV = fileName.endsWith('.csv');
        const isJSON = fileName.endsWith('.json');

        if (isCSV || isJSON) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only CSV and JSON files are allowed.'));
        }
    },
});

/**
 * POST /api/bulk-upload
 * Upload and process CSV or JSON file with sample data
 */
router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res
                .status(400)
                .json({ error: 'No file provided' });
        }

        const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
        let samples;

        // Parse file based on type
        if (fileExtension === 'csv') {
            samples = await parseCSVFile(req.file.buffer);
        } else if (fileExtension === 'json') {
            samples = await parseJSONFile(req.file.buffer);
        } else {
            return res
                .status(400)
                .json({ error: 'Invalid file extension. Use .csv or .json' });
        }

        // Validate parsed data
        const validation = validateSamples(samples);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Validation failed',
                details: validation.errors,
            });
        }

        // Insert data into database
        const results = await insertSamplesWithRelations(samples);

        res.json({
            message: 'File processed successfully',
            results,
        });
    } catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({
            error: 'Server error during file upload',
            details: error.message,
        });
    }
});

export default router;
