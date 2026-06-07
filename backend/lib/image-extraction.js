import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { createWorker } from 'tesseract.js'
import { extractAllFromWords, extractSampleRows } from './sample-field-parser.js'

// ─── Configuration ────────────────────────────────────────────────────────────
//
// Tesseract.js downloads the (free, Apache-2.0) English language model on first
// use and caches it locally, so subsequent runs are fully offline. Point
// OCR_LANG_PATH at a directory containing a vendored `eng.traineddata(.gz)` to
// guarantee offline operation from the very first request.

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = path.resolve(__dirname, '../.tesseract-cache')
const LANG_PATH = process.env.OCR_LANG_PATH || null

// ─── Image pre-processing (Sharp) ────────────────────────────────────────────
//
// Mirrors the Sharp usage in routes/auth.routes.js (processProfileImageUpload).
// Greyscale + contrast normalisation + light sharpening, upscaling small images,
// markedly improves OCR accuracy. Output is lossless PNG fed to Tesseract.

async function preprocessImage(buffer) {
    const image = sharp(buffer, { failOn: 'error' }).rotate()
    const metadata = await image.metadata()

    let pipeline = image.greyscale().normalise()

    const targetWidth = 1600
    if (metadata.width && metadata.width < targetWidth) {
        pipeline = pipeline.resize({ width: targetWidth })
    }

    return pipeline.sharpen().png().toBuffer()
}

// ─── Tesseract worker (lazy singleton) ───────────────────────────────────────

let workerPromise = null

function getWorker() {
    if (!workerPromise) {
        const options = { cachePath: CACHE_DIR, gzip: true, logger: () => {} }
        if (LANG_PATH && existsSync(LANG_PATH)) options.langPath = LANG_PATH
        workerPromise = createWorker('eng', 1, options)
    }
    return workerPromise
}

/** Flattens Tesseract's block/paragraph/line hierarchy into a flat word list. */
function collectWords(data) {
    if (Array.isArray(data.words) && data.words.length) return data.words
    const words = []
    for (const block of data.blocks || []) {
        for (const para of block.paragraphs || []) {
            for (const line of para.lines || []) {
                for (const word of line.words || []) words.push(word)
            }
        }
    }
    return words
}

/**
 * Full pipeline: pre-process the image, OCR it, and extract Sample fields plus
 * analysis-detail records (Metagenomic / WGS) and gene lists. The image buffer
 * is never persisted — only the extracted data is returned.
 * @returns {Promise<{fields: object, confidence: object, metagenomic: object[],
 *   wgs: object[], amrGenes: string[], virulenceGenes: string[], rawText: string}>}
 */
export async function extractSampleFromImageBuffer(buffer) {
    const processed = await preprocessImage(buffer)
    const worker = await getWorker()
    const { data } = await worker.recognize(processed, {}, { blocks: true })
    const words = collectWords(data)
    const extracted = extractAllFromWords(words)
    return { ...extracted, rawText: data.text || '' }
}

/**
 * Multi-sample pipeline: OCR a photo of a table where each row is a sample, and
 * return an array of typed Sample field objects. The image is never persisted.
 * @returns {Promise<{samples: object[], rawText: string}>}
 */
export async function extractSamplesFromImageBuffer(buffer) {
    const processed = await preprocessImage(buffer)
    const worker = await getWorker()
    const { data } = await worker.recognize(processed, {}, { blocks: true })
    const words = collectWords(data)
    return { samples: extractSampleRows(words), rawText: data.text || '' }
}

/** Terminates the shared worker (used in tests for clean teardown). */
export async function terminateWorker() {
    if (workerPromise) {
        const worker = await workerPromise
        await worker.terminate()
        workerPromise = null
    }
}
