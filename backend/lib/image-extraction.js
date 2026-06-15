import sharp from 'sharp'
import {
    TextractClient,
    DetectDocumentTextCommand,
} from '@aws-sdk/client-textract'
import { extractAllFromWords, extractSampleRows } from './sample-field-parser.js'

// ─── Configuration ────────────────────────────────────────────────────────────
//
// OCR is performed by Amazon Textract (serverless, managed). Credentials are
// resolved by the AWS SDK's default provider chain — in production the EC2
// instance role (microtrack-ec2-role, AmazonTextractFullAccess) supplies them
// automatically, so no keys live in code. The image buffer is sent to Textract
// in-memory and never persisted, preserving the original privacy guarantee.

const REGION = process.env.AWS_REGION || 'us-east-1'

let textractClient = null

function getTextractClient() {
    if (!textractClient) {
        textractClient = new TextractClient({ region: REGION })
    }
    return textractClient
}

// ─── Image pre-processing (Sharp) ────────────────────────────────────────────
//
// Fix EXIF orientation and upscale small images. We also need the pixel
// dimensions of the buffer we send to Textract so we can de-normalise its
// bounding boxes (Textract returns coordinates as fractions of the page).

async function preprocessImage(buffer) {
    const image = sharp(buffer, { failOn: 'error' }).rotate()
    const metadata = await image.metadata()

    let pipeline = image
    const targetWidth = 1600
    if (metadata.width && metadata.width < targetWidth) {
        pipeline = pipeline.resize({ width: targetWidth })
    }

    const processed = await pipeline.png().toBuffer()
    const processedMeta = await sharp(processed).metadata()
    return {
        buffer: processed,
        width: processedMeta.width || metadata.width || 1,
        height: processedMeta.height || metadata.height || 1,
    }
}

// ─── Textract → parser word mapping ──────────────────────────────────────────
//
// The geometry-based parser (sample-field-parser.js) expects words shaped as
// { text, confidence, bbox: {x0,y0,x1,y1} } in pixel coordinates. Textract WORD
// blocks carry a normalised BoundingBox {Left,Top,Width,Height} (0..1) and a
// 0..100 Confidence — the same confidence scale Tesseract used. We scale the
// normalised box back to pixels so the parser's cross-axis heuristics (x-gap vs
// word height) stay valid for non-square images.

function textractWordsToParserWords(blocks, width, height) {
    return (blocks || [])
        .filter((b) => b.BlockType === 'WORD' && b.Geometry?.BoundingBox)
        .map((b) => {
            const bb = b.Geometry.BoundingBox
            const x0 = bb.Left * width
            const y0 = bb.Top * height
            return {
                text: b.Text || '',
                confidence: b.Confidence ?? 0,
                bbox: {
                    x0,
                    y0,
                    x1: x0 + bb.Width * width,
                    y1: y0 + bb.Height * height,
                },
            }
        })
}

/** Joins Textract LINE blocks into the plain-text dump the callers expose as rawText. */
function rawTextFromBlocks(blocks) {
    return (blocks || [])
        .filter((b) => b.BlockType === 'LINE')
        .map((b) => b.Text || '')
        .join('\n')
}

/** Pre-processes the image, runs Textract OCR, and returns parser words + blocks. */
async function detectWords(buffer) {
    const { buffer: processed, width, height } = await preprocessImage(buffer)
    const { Blocks } = await getTextractClient().send(
        new DetectDocumentTextCommand({ Document: { Bytes: processed } }),
    )
    return {
        words: textractWordsToParserWords(Blocks, width, height),
        blocks: Blocks,
    }
}

/**
 * Full pipeline: OCR the image and extract Sample fields plus analysis-detail
 * records (Metagenomic / WGS) and gene lists. The image buffer is never
 * persisted — only the extracted data is returned.
 * @returns {Promise<{fields: object, confidence: object, metagenomic: object[],
 *   wgs: object[], amrGenes: string[], virulenceGenes: string[], rawText: string}>}
 */
export async function extractSampleFromImageBuffer(buffer) {
    const { words, blocks } = await detectWords(buffer)
    const extracted = extractAllFromWords(words)
    return { ...extracted, rawText: rawTextFromBlocks(blocks) }
}

/**
 * Multi-sample pipeline: OCR a photo of a table where each row is a sample, and
 * return an array of typed Sample field objects. The image is never persisted.
 * @returns {Promise<{samples: object[], rawText: string}>}
 */
export async function extractSamplesFromImageBuffer(buffer) {
    const { words, blocks } = await detectWords(buffer)
    return { samples: extractSampleRows(words), rawText: rawTextFromBlocks(blocks) }
}

/**
 * No-op retained for API compatibility with the previous Tesseract worker
 * (tests called this for teardown). Textract is stateless — nothing to release.
 */
export async function terminateWorker() {}
