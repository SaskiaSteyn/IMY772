import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Manages a single long-lived Python worker process for OCR extraction.
 * Handles request correlation, timeout, error mapping, and graceful restart.
 */
export class OCRWorkerManager {
    constructor(options = {}) {
        this.workerPath = options.workerPath || path.join(__dirname, '..', 'ocr-worker.py')
        this.pythonBin =
            options.pythonBin ||
            process.env.OCR_WORKER_PYTHON_BIN ||
            process.env.OCR_PYTHON_BIN ||
            'python3'
        this.timeoutMs = options.timeoutMs || parseInt(process.env.OCR_WORKER_TIMEOUT_MS, 10) || 30000
        this.maxQueueSize = options.maxQueueSize || 10
        this.restartOnCrash = options.restartOnCrash !== false
        this.dependencyUnavailable = false
        this.dependencyUnavailableMessage = null

        this.worker = null
        this.requestMap = new Map() // requestId -> { resolve, reject, timeout }
        this.requestQueue = []
        this.isInitializing = false
        this.isShuttingDown = false
    }

    /**
     * Initialize the worker process
     */
    async initialize() {
        if (this.worker || this.isInitializing || this.dependencyUnavailable) return
        this.isInitializing = true

        try {
            this.worker = spawn(this.pythonBin, [this.workerPath], {
                stdio: ['pipe', 'pipe', 'pipe'],
            })

            // Handle stdout (responses from worker)
            let buffer = ''
            this.worker.stdout.on('data', (data) => {
                buffer += data.toString()
                const lines = buffer.split('\n')
                buffer = lines.pop() // Keep incomplete line in buffer

                for (const line of lines) {
                    if (!line.trim()) continue
                    try {
                        const response = JSON.parse(line)
                        this._handleWorkerResponse(response)
                    } catch (error) {
                        console.error('Failed to parse worker response:', line, error)
                        // Attempt to match requestId and fail that request
                        const match = line.match(/"requestId"\s*:\s*"([^"]+)"/)
                        if (match) {
                            this._failRequest(match[1], 'WORKER_INVALID_RESPONSE', 'Invalid JSON from worker')
                        }
                    }
                }
            })

            // Handle stderr (logs/errors from worker)
            this.worker.stderr.on('data', (data) => {
                const message = data.toString()
                console.warn('[OCR Worker stderr]', message)

                if (message.includes("No module named 'paddleocr'") || message.includes('PaddleOCR is not available')) {
                    this._markDependencyUnavailable(message)
                }
            })

            // Handle worker process exit
            this.worker.on('exit', (code, signal) => {
                console.warn(`[OCR Worker] Process exited with code ${code}, signal ${signal}`)
                this.worker = null

                // Fail all pending requests
                for (const [requestId, { reject }] of this.requestMap) {
                    clearTimeout(this.requestMap.get(requestId).timeout)
                    reject(new Error('Worker process crashed'))
                    this.requestMap.delete(requestId)
                }

                // Attempt restart if not shutting down
                if (!this.isShuttingDown && this.restartOnCrash && !this.dependencyUnavailable) {
                    setTimeout(() => this.initialize(), 1000)
                }
            })

            this.worker.on('error', (error) => {
                console.error('[OCR Worker] Process error:', error)
            })

            console.log(`[OCR Worker] Process initialized successfully using ${this.pythonBin}`)
        } catch (error) {
            console.error('[OCR Worker] Failed to spawn:', error)
            this.worker = null
            throw error
        } finally {
            this.isInitializing = false
        }
    }

    /**
     * Submit an OCR extraction request to the worker
     * @param {string} requestId - Unique request identifier
     * @param {Buffer} imageBuffer - Image file buffer
     * @param {string} mimeType - Image MIME type
     * @param {number} confidenceThreshold - Confidence threshold for extraction
     * @returns {Promise} Resolves to OCR result or rejects on error
     */
    async extractImage(requestId, imageBuffer, mimeType, confidenceThreshold) {
        if (this.isShuttingDown) {
            throw new Error('Worker is shutting down')
        }

        if (this.dependencyUnavailable) {
            const error = new Error('OCR dependency unavailable')
            error.code = 'DEPENDENCY_UNAVAILABLE'
            error.details = [this.dependencyUnavailableMessage || 'PaddleOCR is not installed']
            throw error
        }

        // Check queue size
        if (this.requestMap.size >= this.maxQueueSize) {
            throw new Error('OCR request queue full, please retry')
        }

        // Ensure worker is initialized
        if (!this.worker) {
            await this.initialize()
        }

        return new Promise((resolve, reject) => {
            const timeoutHandle = setTimeout(() => {
                this.requestMap.delete(requestId)
                reject(new Error('OCR worker timeout'))
            }, this.timeoutMs)

            this.requestMap.set(requestId, {
                resolve,
                reject,
                timeout: timeoutHandle,
            })

            // Send request to worker
            const payload = {
                requestId,
                imageBuffer: imageBuffer.toString('base64'),
                mimeType,
                confidenceThreshold,
            }

            try {
                this.worker.stdin.write(JSON.stringify(payload) + '\n')
            } catch (error) {
                clearTimeout(timeoutHandle)
                this.requestMap.delete(requestId)
                reject(error)
            }
        })
    }

    /**
     * Handle response from worker process
     */
    _handleWorkerResponse(response) {
        const { requestId, success } = response

        if (!requestId || !this.requestMap.has(requestId)) {
            console.warn('Received response for unknown requestId:', requestId)
            return
        }

        const { resolve, reject, timeout } = this.requestMap.get(requestId)
        clearTimeout(timeout)
        this.requestMap.delete(requestId)

        if (success) {
            resolve(response)
        } else {
            if (response.error === 'DEPENDENCY_UNAVAILABLE') {
                this._markDependencyUnavailable(response.details?.[0] || 'PaddleOCR is not installed')
            }

            const error = new Error(response.error || 'Unknown OCR error')
            error.code = response.error
            error.details = response.details
            reject(error)
        }
    }

    _markDependencyUnavailable(message) {
        this.dependencyUnavailable = true
        this.dependencyUnavailableMessage = message
        this.restartOnCrash = false
    }

    /**
     * Fail a request internally
     */
    _failRequest(requestId, errorCode, details) {
        if (!this.requestMap.has(requestId)) return

        const { reject, timeout } = this.requestMap.get(requestId)
        clearTimeout(timeout)
        this.requestMap.delete(requestId)

        const error = new Error(errorCode)
        error.code = errorCode
        error.details = Array.isArray(details) ? details : [details]
        reject(error)
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        if (this.isShuttingDown) return
        this.isShuttingDown = true

        // Fail all pending requests
        for (const [requestId, { reject, timeout }] of this.requestMap) {
            clearTimeout(timeout)
            reject(new Error('Worker shutting down'))
            this.requestMap.delete(requestId)
        }

        if (this.worker) {
            return new Promise((resolve) => {
                const killTimeout = setTimeout(() => {
                    console.warn('[OCR Worker] Kill timeout, forcing termination')
                    this.worker.kill('SIGKILL')
                    resolve()
                }, 5000)

                this.worker.on('exit', () => {
                    clearTimeout(killTimeout)
                    resolve()
                })

                this.worker.kill('SIGTERM')
            })
        }
    }

    /**
     * Check if worker is healthy
     */
    isHealthy() {
        return this.worker && !this.isShuttingDown
    }
}

// Export singleton instance
let instance = null

export function getOCRWorkerManager() {
    if (!instance) {
        instance = new OCRWorkerManager()
    }
    return instance
}

export default OCRWorkerManager
