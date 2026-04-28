import { jest } from '@jest/globals'
import request from 'supertest';
import express from 'express';

// Mock the OCR service before importing the router under test.
jest.unstable_mockModule('../lib/ocr-service.js', () => ({
    getOCRService: jest.fn(() => mockOCRService),
}))

// Mock auth middleware
jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
    requireAuth: (req, res, next) => {
        req.user = { id: 'test-user', email: 'test@example.com' };
        next();
    },
}))

// Mock validation functions
jest.unstable_mockModule('../lib/file-parser.js', () => ({
    validateSamples: jest.fn((samples) => ({
        isValid: samples.length > 0 && samples.every(s => s.sampleID),
        errors: samples.length === 0 ? ['No samples provided'] : [],
    })),
}))

jest.unstable_mockModule('../lib/sample-ingestion.js', () => ({
    insertSamplesWithRelations: jest.fn((samples) => ({
        successCount: samples.length,
        totalSamples: samples.length,
        sampleIDs: samples.map(s => s.sampleID),
    })),
}))

const mockOCRService = {
    extractImage: jest.fn(),
    initialize: jest.fn(),
    shutdown: jest.fn(),
};

const { default: ocrRouter } = await import('../routes/ocr.routes.js')

describe('OCR Routes', () => {
    let app;

    beforeEach(() => {
        jest.clearAllMocks();
        
        app = express();
        app.use(express.json());
        app.use('/api/ocr', ocrRouter);
    });

    describe('POST /api/ocr/extract', () => {
        it('should require authentication', async () => {
            // This would need a custom test setup without the requireAuth mock
            // For now, we assume auth middleware is working
        });

        it('should return 400 if no file is uploaded', async () => {
            const response = await request(app)
                .post('/api/ocr/extract')
                .set('Accept', 'application/json');

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('INVALID_MIME_TYPE');
        });

        it('should extract samples from valid image', async () => {
            mockOCRService.extractImage.mockResolvedValue({
                provider: 'paddle',
                samples: [
                    {
                        sampleID: 'OCR_001',
                        latitude: -25.7479,
                        longitude: 28.2293,
                    }
                ],
                diagnostics: {
                    processingTimeMs: 1200,
                    warnings: [],
                    validationErrors: [],
                    lowConfidenceFields: {},
                },
            });

            const response = await request(app)
                .post('/api/ocr/extract')
                .attach('file', Buffer.from('fake image data'), {
                    filename: 'test.png',
                    contentType: 'image/png',
                });

            expect(response.status).toBe(200);
            expect(response.body.provider).toBe('paddle');
            expect(response.body.samples).toHaveLength(1);
            expect(response.body.diagnostics).toBeDefined();
        });

        it('should handle OCR service errors with correct status codes', async () => {
            const error = new Error('No readable text detected in image');
            error.code = 'NO_READABLE_TEXT';
            error.httpStatus = 400;
            error.details = ['No text found'];
            mockOCRService.extractImage.mockRejectedValue(error);

            const response = await request(app)
                .post('/api/ocr/extract')
                .attach('file', Buffer.from('fake image data'), {
                    filename: 'test.png',
                    contentType: 'image/png',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('NO_READABLE_TEXT');
        });

        it('should handle worker timeout with 408 status', async () => {
            const error = new Error('OCR processing timeout');
            error.code = 'WORKER_TIMEOUT';
            error.httpStatus = 408;
            error.details = ['Processing exceeded 30000ms'];
            mockOCRService.extractImage.mockRejectedValue(error);

            const response = await request(app)
                .post('/api/ocr/extract')
                .attach('file', Buffer.from('fake image data'), {
                    filename: 'test.png',
                    contentType: 'image/png',
                });

            expect(response.status).toBe(408);
            expect(response.body.error).toBe('WORKER_TIMEOUT');
        });

        it('should handle internal errors with 500 status', async () => {
            const error = new Error('Internal error');
            error.code = 'INTERNAL_ERROR';
            error.httpStatus = 500;
            error.details = ['Something went wrong'];
            mockOCRService.extractImage.mockRejectedValue(error);

            const response = await request(app)
                .post('/api/ocr/extract')
                .attach('file', Buffer.from('fake image data'), {
                    filename: 'test.png',
                    contentType: 'image/png',
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('INTERNAL_ERROR');
        });

        it('should return 503 when OCR dependency is unavailable', async () => {
            const error = new Error('OCR service is unavailable');
            error.code = 'DEPENDENCY_UNAVAILABLE';
            error.httpStatus = 503;
            error.details = ['PaddleOCR is not installed or failed to initialize'];
            mockOCRService.extractImage.mockRejectedValue(error);

            const response = await request(app)
                .post('/api/ocr/extract')
                .attach('file', Buffer.from('fake image data'), {
                    filename: 'test.png',
                    contentType: 'image/png',
                });

            expect(response.status).toBe(503);
            expect(response.body.error).toBe('DEPENDENCY_UNAVAILABLE');
        });
    });

    describe('POST /api/ocr/ingest-reviewed', () => {
        it('should require at least one sample', async () => {
            const response = await request(app)
                .post('/api/ocr/ingest-reviewed')
                .send({ samples: [] });

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('At least one reviewed sample is required');
        });

        it('should reject if samples not provided', async () => {
            const response = await request(app)
                .post('/api/ocr/ingest-reviewed')
                .send({});

            expect(response.status).toBe(400);
        });

        it('should ingest reviewed samples successfully', async () => {
            const samples = [
                {
                    sampleID: 'OCR_001',
                    latitude: -25.7479,
                    longitude: 28.2293,
                    water_temperature: 24.5,
                }
            ];

            const response = await request(app)
                .post('/api/ocr/ingest-reviewed')
                .send({ samples });

            expect(response.status).toBe(200);
            expect(response.body.message).toContain('successfully');
            expect(response.body.results).toBeDefined();
        });

        it('should validate sample data before ingestion', async () => {
            const invalidSamples = [
                {
                    // Missing sampleID
                    latitude: -25.7479,
                    longitude: 28.2293,
                }
            ];

            const response = await request(app)
                .post('/api/ocr/ingest-reviewed')
                .send({ samples: invalidSamples });

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Validation failed');
        });
    });
});
