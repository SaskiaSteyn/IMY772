import { Router } from 'express';
import multer from 'multer';
import { parseCSVFile, parseJSONFile, validateSamples } from '../lib/file-parser.js';
import prisma from '../lib/prisma.js';

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
        const results = {
            totalSamples: samples.length,
            successCount: 0,
            failureCount: 0,
            errors: [],
            sampleIDs: [],
        };

        for (let i = 0; i < samples.length; i++) {
            try {
                const sample = samples[i];

                // Create the sample
                const createdSample = await prisma.sample.create({
                    data: {
                        latitude: sample.latitude,
                        longitude: sample.longitude,
                        water_temperature: sample.water_temperature,
                        ph: sample.ph,
                        tds: sample.tds,
                        do: sample.do,
                        sample_analysis_type: sample.sample_analysis_type,
                        isolation_source: sample.isolation_source,
                        collection_date: sample.collection_date
                            ? new Date(sample.collection_date)
                            : null,
                        location_name: sample.location_name,
                        collected_by: sample.collected_by,
                        predicted_sir_profile: sample.predicted_sir_profile,
                    },
                });

                const sampleID = createdSample.sampleID;
                results.sampleIDs.push(sampleID);

                // Create metagenomic records if present
                if (
                    sample.metagenomic &&
                    Array.isArray(sample.metagenomic) &&
                    sample.metagenomic.length > 0
                ) {
                    // Collect all unique AMR genes from all metagenomic records
                    const allAmrGenes = new Set();
                    for (const metaRecord of sample.metagenomic) {
                        if (
                            metaRecord.amr_resistance_genes &&
                            Array.isArray(metaRecord.amr_resistance_genes)
                        ) {
                            metaRecord.amr_resistance_genes.forEach((gene) => {
                                if (gene && gene.trim() !== '') {
                                    allAmrGenes.add(gene.trim());
                                }
                            });
                        }
                    }

                    // Create AMR resistance genes
                    for (const geneSymbol of allAmrGenes) {
                        await prisma.amrResistanceGene.create({
                            data: {
                                sampleID,
                                geneSymbol,
                            },
                        });
                    }

                    // Create metagenomic records
                    for (const metaRecord of sample.metagenomic) {
                        await prisma.metagenomic.create({
                            data: {
                                sampleID,
                                sequence_name: metaRecord.sequence_name,
                                element_type: metaRecord.element_type,
                                class: metaRecord.class,
                                subclass: metaRecord.subclass,
                            },
                        });
                    }
                }

                results.successCount++;
            } catch (error) {
                results.failureCount++;
                results.errors.push({
                    sampleIndex: i,
                    error: error.message,
                });
            }
        }

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
