import { jest } from '@jest/globals'

// Mock the worker manager before importing the service under test.
jest.unstable_mockModule('../lib/worker-manager.js', () => ({
    getOCRWorkerManager: jest.fn(() => mockWorkerManager),
    OCRWorkerManager: jest.fn(),
}))

const { OCRService } = await import('../lib/ocr-service.js')
const { OCRWorkerManager } = await import('../lib/worker-manager.js')

const mockWorkerManager = {
    initialize: jest.fn(),
    extractImage: jest.fn(),
    shutdown: jest.fn(),
    isHealthy: jest.fn(() => true),
    timeoutMs: 30000,
};

describe('OCRService', () => {
    let ocrService;

    beforeEach(() => {
        jest.clearAllMocks();
        // Force singleton reset
        ocrService = new OCRService();
    });

    describe('initialize', () => {
        it('should initialize worker manager on service initialization', async () => {
            mockWorkerManager.initialize.mockResolvedValue(undefined);
            await ocrService.initialize();
            expect(mockWorkerManager.initialize).toHaveBeenCalled();
        });

        it('should throw if worker manager initialization fails', async () => {
            mockWorkerManager.initialize.mockRejectedValue(new Error('Worker init failed'));
            await expect(ocrService.initialize()).rejects.toThrow('Worker init failed');
        });
    });

    describe('extractImage', () => {
        const mockFile = {
            buffer: Buffer.from('fake image data'),
            mimetype: 'image/png',
            size: 1024,
        };

        it('should reject invalid MIME types', async () => {
            const invalidFile = { ...mockFile, mimetype: 'image/gif' };
            await expect(ocrService.extractImage(invalidFile)).rejects.toThrow(
                'Invalid image type'
            );
        });

        it('should reject files exceeding 10MB', async () => {
            const largeFile = { ...mockFile, size: 11 * 1024 * 1024 };
            await expect(ocrService.extractImage(largeFile)).rejects.toThrow(
                'File size exceeds 10MB'
            );
        });

        it('should accept valid PNG, JPG, JPEG, WEBP files', async () => {
            const validMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
            
            for (const mimeType of validMimeTypes) {
                mockWorkerManager.extractImage.mockResolvedValue({
                    samples: [{ sampleID: 'TEST_001' }],
                    processingTimeMs: 1000,
                    warnings: [],
                    validationErrors: [],
                    lowConfidenceFields: {},
                });

                const file = { ...mockFile, mimetype: mimeType };
                const result = await ocrService.extractImage(file);
                
                expect(result).toHaveProperty('provider', 'paddle');
                expect(result).toHaveProperty('samples');
                expect(result).toHaveProperty('diagnostics');
            }
        });

        it('should return properly structured response on success', async () => {
            mockWorkerManager.extractImage.mockResolvedValue({
                samples: [
                    {
                        sampleID: 'TEST_001',
                        latitude: -25.7479,
                        longitude: 28.2293,
                    }
                ],
                processingTimeMs: 1500,
                warnings: ['Some warning'],
                validationErrors: [],
                lowConfidenceFields: { latitude: ['TEST_001'] },
            });

            const result = await ocrService.extractImage(mockFile);

            expect(result).toEqual({
                provider: 'paddle',
                samples: [
                    {
                        sampleID: 'TEST_001',
                        latitude: -25.7479,
                        longitude: 28.2293,
                    }
                ],
                diagnostics: {
                    processingTimeMs: 1500,
                    warnings: ['Some warning'],
                    validationErrors: [],
                    lowConfidenceFields: { latitude: ['TEST_001'] },
                },
            });
        });

        it('should handle worker timeout error', async () => {
            const timeoutError = new Error('OCR worker timeout');
            mockWorkerManager.extractImage.mockRejectedValue(timeoutError);

            try {
                await ocrService.extractImage(mockFile);
                fail('Should have thrown');
            } catch (error) {
                expect(error.code).toBe('WORKER_TIMEOUT');
                expect(error.httpStatus).toBe(408);
            }
        });

        it('should handle worker crash', async () => {
            const crashError = new Error('Worker process crashed');
            mockWorkerManager.extractImage.mockRejectedValue(crashError);

            try {
                await ocrService.extractImage(mockFile);
                fail('Should have thrown');
            } catch (error) {
                expect(error.code).toBe('WORKER_CRASHED');
                expect(error.httpStatus).toBe(500);
            }
        });

        it('should handle no text found error', async () => {
            const noTextError = new Error('NO_TEXT_FOUND');
            noTextError.code = 'NO_TEXT_FOUND';
            noTextError.details = ['OCR could not find any text'];
            mockWorkerManager.extractImage.mockRejectedValue(noTextError);

            try {
                await ocrService.extractImage(mockFile);
                fail('Should have thrown');
            } catch (error) {
                expect(error.code).toBe('NO_READABLE_TEXT');
                expect(error.httpStatus).toBe(400);
            }
        });

        it('should return 503 when OCR dependency is unavailable', async () => {
            const dependencyError = new Error('DEPENDENCY_UNAVAILABLE');
            dependencyError.code = 'DEPENDENCY_UNAVAILABLE';
            dependencyError.details = ['PaddleOCR is not installed or failed to initialize'];
            mockWorkerManager.extractImage.mockRejectedValue(dependencyError);

            try {
                await ocrService.extractImage({
                    buffer: Buffer.from('fake image data'),
                    mimetype: 'image/png',
                    size: 1024,
                });
                fail('Should have thrown');
            } catch (error) {
                expect(error.code).toBe('DEPENDENCY_UNAVAILABLE');
                expect(error.httpStatus).toBe(503);
            }
        });
    });

    describe('shutdown', () => {
        it('should shut down worker manager gracefully', async () => {
            mockWorkerManager.shutdown.mockResolvedValue(undefined);
            await ocrService.shutdown();
            expect(mockWorkerManager.shutdown).toHaveBeenCalled();
        });
    });
});
