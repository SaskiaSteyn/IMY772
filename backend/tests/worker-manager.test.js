import { jest } from '@jest/globals'

// Mock child_process before importing the manager under test.
jest.unstable_mockModule('child_process', () => ({
    spawn: jest.fn(() => mockProcess),
}))

const { OCRWorkerManager } = await import('../lib/worker-manager.js')

const mockProcess = {
    stdout: {
        on: jest.fn(),
    },
    stderr: {
        on: jest.fn(),
    },
    stdin: {
        write: jest.fn(),
    },
    on: jest.fn(),
    kill: jest.fn(),
};

describe('OCRWorkerManager', () => {
    let manager;

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset mock implementations
        mockProcess.stdout.on.mockImplementation((event, handler) => {
            if (event === 'data') {
                mockProcess._stdoutHandler = handler;
            }
        });
        mockProcess.on.mockImplementation((event, handler) => {
            if (event === 'exit') {
                mockProcess._exitHandler = handler;
            }
        });
        mockProcess.stdin.write.mockImplementation((data) => {
            // Simulate worker response
            setTimeout(() => {
                if (mockProcess._stdoutHandler) {
                    const response = { success: true, samples: [] };
                    mockProcess._stdoutHandler(JSON.stringify(response) + '\n');
                }
            }, 10);
            return true;
        });

        manager = new OCRWorkerManager({
            timeoutMs: 5000,
            maxQueueSize: 10,
        });
    });

    describe('initialize', () => {
        it('should spawn Python worker process', async () => {
            const { spawn } = await import('child_process');
            await manager.initialize();
            
            expect(spawn).toHaveBeenCalledWith('python3', expect.any(Array), expect.any(Object));
        });

        it('should not spawn if already initialized', async () => {
            const { spawn } = await import('child_process');
            await manager.initialize();
            const callCount = spawn.mock.calls.length;
            
            await manager.initialize();
            expect(spawn).toHaveBeenCalledTimes(callCount); // No additional call
        });

        it('should handle spawn errors', async () => {
            const { spawn } = await import('child_process');
            spawn.mockImplementationOnce(() => {
                throw new Error('Spawn failed');
            });

            const newManager = new OCRWorkerManager();
            await expect(newManager.initialize()).rejects.toThrow('Spawn failed');
        });
    });

    describe('extractImage', () => {
        beforeEach(async () => {
            await manager.initialize();
        });

        it('should queue image extraction request', async () => {
            const imageBuffer = Buffer.from('fake image');
            
            mockProcess.stdin.write.mockImplementationOnce((data) => {
                setTimeout(() => {
                    if (mockProcess._stdoutHandler) {
                        const response = {
                            requestId: JSON.parse(data).requestId,
                            success: true,
                            samples: [{ sampleID: 'TEST_001' }],
                            processingTimeMs: 1000,
                            warnings: [],
                            validationErrors: [],
                            lowConfidenceFields: {},
                        };
                        mockProcess._stdoutHandler(JSON.stringify(response) + '\n');
                    }
                }, 10);
                return true;
            });

            const result = await manager.extractImage(
                'req-123',
                imageBuffer,
                'image/png',
                0.75
            );

            expect(result.success).toBe(true);
            expect(result.samples).toHaveLength(1);
        });

        it('should reject if queue is full', async () => {
            manager.maxQueueSize = 1;
            const imageBuffer = Buffer.from('fake image');
            
            // Add a request that doesn't resolve
            mockProcess.stdin.write.mockImplementationOnce(() => true);
            const promise1 = manager.extractImage('req-1', imageBuffer, 'image/png', 0.75);
            
            // Try to add another, should fail
            await expect(
                manager.extractImage('req-2', imageBuffer, 'image/png', 0.75)
            ).rejects.toThrow('OCR request queue full');
        });

        it('should timeout if worker takes too long', async () => {
            const imageBuffer = Buffer.from('fake image');
            manager.timeoutMs = 100;
            
            mockProcess.stdin.write.mockImplementationOnce(() => {
                // Never resolve the request
                return true;
            });

            await expect(
                manager.extractImage('req-123', imageBuffer, 'image/png', 0.75)
            ).rejects.toThrow('OCR worker timeout');
        });

        it('should handle invalid worker response', async () => {
            const imageBuffer = Buffer.from('fake image');
            
            mockProcess.stdin.write.mockImplementationOnce((data) => {
                setTimeout(() => {
                    if (mockProcess._stdoutHandler) {
                        mockProcess._stdoutHandler('invalid json\n');
                    }
                }, 10);
                return true;
            });

            // The request should timeout since invalid response fails it
            await expect(
                manager.extractImage('req-123', imageBuffer, 'image/png', 0.75)
            ).rejects.toThrow();
        });

        it('should handle worker error response', async () => {
            const imageBuffer = Buffer.from('fake image');
            
            mockProcess.stdin.write.mockImplementationOnce((data) => {
                setTimeout(() => {
                    if (mockProcess._stdoutHandler) {
                        const response = {
                            requestId: JSON.parse(data).requestId,
                            success: false,
                            error: 'NO_TEXT_FOUND',
                            details: ['No readable text detected'],
                        };
                        mockProcess._stdoutHandler(JSON.stringify(response) + '\n');
                    }
                }, 10);
                return true;
            });

            await expect(
                manager.extractImage('req-123', imageBuffer, 'image/png', 0.75)
            ).rejects.toThrow('NO_TEXT_FOUND');
        });
    });

    describe('shutdown', () => {
        it('should gracefully shutdown worker', async () => {
            await manager.initialize();
            await manager.shutdown();

            expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
        });

        it('should fail pending requests on shutdown', async () => {
            await manager.initialize();
            const imageBuffer = Buffer.from('fake image');
            
            mockProcess.stdin.write.mockImplementationOnce(() => true);
            const promise = manager.extractImage('req-123', imageBuffer, 'image/png', 0.75);
            
            setTimeout(() => manager.shutdown(), 50);
            
            await expect(promise).rejects.toThrow('Worker shutting down');
        });

        it('should force kill if graceful shutdown times out', async () => {
            await manager.initialize();
            
            // Mock the exit handler to never be called
            mockProcess.on.mockImplementationOnce(() => {
                // Don't call the handler
            });
            
            const shutdownPromise = manager.shutdown();
            
            // Wait for kill timeout
            jest.advanceTimersByTime(5000);
            
            await shutdownPromise;
            expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
        }, 10000);
    });

    describe('isHealthy', () => {
        it('should return false if not initialized', () => {
            expect(manager.isHealthy()).toBe(false);
        });

        it('should return true if initialized and not shutting down', async () => {
            await manager.initialize();
            expect(manager.isHealthy()).toBe(true);
        });

        it('should return false after shutdown', async () => {
            await manager.initialize();
            await manager.shutdown();
            expect(manager.isHealthy()).toBe(false);
        });
    });
});
