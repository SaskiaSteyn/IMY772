import { v4 as uuidv4 } from 'uuid'
import { getOCRWorkerManager } from './worker-manager.js'

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * OCR Service - boundary layer between Express routes and OCR worker
 */
export class OCRService {
    constructor() {
        this.workerManager = getOCRWorkerManager()
        this.confidenceThreshold = parseFloat(process.env.OCR_CONFIDENCE_THRESHOLD || '0.75')
    }

    /**
     * Initialize the OCR service and worker on app startup
     */
    async initialize() {
        console.log('[OCR Service] Initializing...')
        try {
            await this.workerManager.initialize()
            console.log('[OCR Service] Initialized successfully')
        } catch (error) {
            console.error('[OCR Service] Initialization failed:', error)
            throw error
        }
    }

    /**
     * Extract OCR data from an image file
     * @param {Express.Multer.File} file - Uploaded file from multer
     * @returns {Promise<object>} OCR extraction result
     */
    async extractImage(file) {
        // Validate file
        const validation = this._validateFile(file)
        if (!validation.valid) {
            const error = new Error(validation.error)
            error.code = validation.code
            error.details = validation.details
            throw error
        }

        const requestId = uuidv4()
        const startTime = Date.now()

        try {
            // Call worker
            const workerResponse = await this.workerManager.extractImage(
                requestId,
                file.buffer,
                file.mimetype,
                this.confidenceThreshold,
            )

            // Ensure response structure matches contract
            const result = {
                provider: 'paddle',
                samples: workerResponse.samples || [],
                diagnostics: {
                    processingTimeMs: workerResponse.processingTimeMs || Date.now() - startTime,
                    warnings: workerResponse.warnings || [],
                    validationErrors: workerResponse.validationErrors || [],
                    lowConfidenceFields: workerResponse.lowConfidenceFields || {},
                },
            }

            return result
        } catch (error) {
            const processingTimeMs = Date.now() - startTime

            // Map worker errors to service errors
            if (error.message === 'OCR worker timeout') {
                const err = new Error('OCR processing timeout')
                err.code = 'WORKER_TIMEOUT'
                err.httpStatus = 408
                err.details = [`Processing exceeded ${this.workerManager.timeoutMs}ms`]
                throw err
            }

            if (error.message === 'Worker process crashed') {
                const err = new Error('Server error during OCR processing')
                err.code = 'WORKER_CRASHED'
                err.httpStatus = 500
                err.details = ['OCR worker process crashed']
                throw err
            }

            if (error.code === 'WORKER_INVALID_RESPONSE') {
                const err = new Error('Server error during OCR processing')
                err.code = 'WORKER_INVALID_RESPONSE'
                err.httpStatus = 500
                err.details = error.details || ['Invalid response from OCR worker']
                throw err
            }

            if (error.code === 'NO_TEXT_FOUND') {
                const err = new Error('No readable text detected in image')
                err.code = 'NO_READABLE_TEXT'
                err.httpStatus = 400
                err.details = error.details || ['OCR could not extract any data from the image']
                throw err
            }

            if (error.code === 'INVALID_FORMAT') {
                const err = new Error('Image format is invalid or unsupported')
                err.code = 'INVALID_FORMAT'
                err.httpStatus = 400
                err.details = error.details || ['OCR could not process this image format']
                throw err
            }

            if (error.code === 'PROCESSING_ERROR') {
                const err = new Error('Server error during OCR processing')
                err.code = 'INTERNAL_ERROR'
                err.httpStatus = 500
                err.details = error.details || ['An error occurred during OCR processing']
                throw err
            }

            if (error.code === 'DEPENDENCY_UNAVAILABLE') {
                const err = new Error('OCR service is unavailable')
                err.code = 'DEPENDENCY_UNAVAILABLE'
                err.httpStatus = 503
                err.details = error.details || ['Install backend/requirements-ocr.txt to enable OCR']
                throw err
            }

            // Unknown error
            console.error('[OCR Service] Unexpected error:', error)
            const err = new Error('Server error during OCR processing')
            err.code = 'INTERNAL_ERROR'
            err.httpStatus = 500
            err.details = ['An unexpected error occurred']
            throw err
        }
    }

    /**
     * Validate uploaded file
     */
    _validateFile(file) {
        if (!file) {
            return {
                valid: false,
                code: 'INVALID_MIME_TYPE',
                error: 'No file uploaded',
                details: ['Please upload an image file'],
            }
        }

        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            return {
                valid: false,
                code: 'INVALID_MIME_TYPE',
                error: 'Invalid image type. Please upload a PNG, JPG, JPEG, or WEBP image.',
                details: [`Received: ${file.mimetype}`],
            }
        }

        if (file.size > MAX_FILE_SIZE) {
            return {
                valid: false,
                code: 'FILE_TOO_LARGE',
                error: 'File size exceeds 10MB limit',
                details: [`File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`],
            }
        }

        return { valid: true }
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('[OCR Service] Shutting down...')
        await this.workerManager.shutdown()
        console.log('[OCR Service] Shutdown complete')
    }
}

// Export singleton instance
let instance = null

export function getOCRService() {
    if (!instance) {
        instance = new OCRService()
    }
    return instance
}

export default OCRService
