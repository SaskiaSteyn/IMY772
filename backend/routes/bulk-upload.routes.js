import {Router} from 'express';
import multer from 'multer';
import {parseCSVFile, parseJSONFile, validateSamples} from '../lib/file-parser.js';
import prisma from '../lib/prisma.js';
import {requireAuth} from '../middleware/auth.middleware.js';

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
router.post('/', requireAuth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res
                .status(400)
                .json({error: 'No file provided'});
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
                .json({error: 'Invalid file extension. Use .csv or .json'});
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
                const isolates = sample.isolates || [];
                const phenotypes = sample.phenotypes || [];
                const amrFindings = sample.amr_findings || [];

                // Create the sample with sample_id
                const createdSample = await prisma.sample.create({
                    data: {
                        sample_id: sample.sample_id, // Required primary key
                        latitude: sample.latitude,
                        longitude: sample.longitude,
                        water_temp: sample.water_temperature || sample.water_temp, // Map water_temperature to water_temp
                        ph: sample.ph,
                        tds: sample.tds,
                        do: sample.do,
                        isolation_source: sample.isolation_source,
                        collection_date: sample.collection_date
                            ? new Date(sample.collection_date)
                            : null,
                        location_name: sample.location_name,
                        uploaded_by: req.user.userID,
                    },
                });

                results.sampleIDs.push(createdSample.sample_id);

                // Create isolates if present
                if (Array.isArray(isolates) && isolates.length > 0) {
                    for (const isolate of isolates) {
                        await prisma.isolate.create({
                            data: {
                                sample_id: createdSample.sample_id,
                                organism: isolate.organism,
                                mlst_type: isolate.mlst_type,
                            },
                        });
                    }
                }

                // Create predicted phenotypes if present
                if (Array.isArray(phenotypes) && phenotypes.length > 0) {
                    for (const phenotype of phenotypes) {
                        await prisma.predictedPhenotype.create({
                            data: {
                                sample_id: createdSample.sample_id,
                                organism: phenotype.organism,
                                antibiotic: phenotype.antibiotic,
                                resistant: phenotype.resistant,
                            },
                        });
                    }
                }

                // Create AMR findings if present
                if (Array.isArray(amrFindings) && amrFindings.length > 0) {
                    for (const finding of amrFindings) {
                        await prisma.amrFinding.create({
                            data: {
                                finding_id: finding.finding_id,
                                sample_id: createdSample.sample_id,
                                analysis_type: finding.analysis_type,
                                gene_symbol: finding.gene_symbol,
                                drug_class: finding.drug_class,
                                method: finding.method,
                                percent_identity: finding.percent_identity,
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
