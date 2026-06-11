/**
 * Tests for the /api/samples/extract-image route.
 *
 * The OCR library is mocked so no real image processing / Tesseract download is
 * required — we only verify auth, validation, and response shaping.
 */

import { jest } from '@jest/globals'
import jwt from 'jsonwebtoken'

const mockExtract = jest.fn()
const mockExtractMany = jest.fn()

jest.unstable_mockModule('../lib/image-extraction.js', () => ({
    extractSampleFromImageBuffer: mockExtract,
    extractSamplesFromImageBuffer: mockExtractMany,
}))

const { default: express } = await import('express')
const cookieParser = (await import('cookie-parser')).default
const { default: supertest } = await import('supertest')
const { default: imageExtractRouter } = await import('../routes/image-extract.routes.js')

function buildApp() {
    const app = express()
    app.use(express.json())
    app.use(cookieParser())
    app.use('/api/samples/extract-image', imageExtractRouter)
    return app
}

const api = () => supertest(buildApp())

const TEST_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me'
const authCookie = () => [
    `token=${jwt.sign({ userID: 1, role: 'user' }, TEST_SECRET, { expiresIn: '1h' })}`,
]

const fakePng = () => Buffer.from('not-a-real-png-but-enough-for-multer')

beforeEach(() => {
    mockExtract.mockReset()
    mockExtractMany.mockReset()
})

describe('POST /api/samples/extract-image', () => {
    it('rejects unauthenticated requests', async () => {
        const res = await api().post('/api/samples/extract-image')
        expect(res.status).toBe(401)
        expect(mockExtract).not.toHaveBeenCalled()
    })

    it('returns 400 when no image is provided', async () => {
        const res = await api()
            .post('/api/samples/extract-image')
            .set('Cookie', authCookie())
        expect(res.status).toBe(400)
        expect(res.body.error).toMatch(/no image/i)
    })

    it('returns extracted fields for an uploaded image', async () => {
        mockExtract.mockResolvedValue({
            fields: { ph: 7.2, water_temperature: 24.5 },
            confidence: { ph: 90, water_temperature: 85 },
            rawText: 'pH 7.2',
        })

        const res = await api()
            .post('/api/samples/extract-image')
            .set('Cookie', authCookie())
            .attach('image', fakePng(), 'table.png')

        expect(res.status).toBe(200)
        expect(res.body.fields).toEqual({ ph: 7.2, water_temperature: 24.5 })
        expect(res.body.confidence.ph).toBe(90)
        expect(mockExtract).toHaveBeenCalledTimes(1)
    })

    it('returns an array of samples when mode=multi', async () => {
        mockExtractMany.mockResolvedValue({
            samples: [
                { latitude: -25.5, longitude: 28.1, ph: 7.2 },
                { latitude: -26.0, longitude: 29.4, ph: 8.0 },
            ],
            rawText: '...',
        })

        const res = await api()
            .post('/api/samples/extract-image')
            .set('Cookie', authCookie())
            .field('mode', 'multi')
            .attach('image', fakePng(), 'table.png')

        expect(res.status).toBe(200)
        expect(res.body.samples).toHaveLength(2)
        expect(mockExtractMany).toHaveBeenCalledTimes(1)
        expect(mockExtract).not.toHaveBeenCalled()
    })

    it('returns 500 when extraction throws', async () => {
        mockExtract.mockRejectedValue(new Error('boom'))

        const res = await api()
            .post('/api/samples/extract-image')
            .set('Cookie', authCookie())
            .attach('image', fakePng(), 'table.png')

        expect(res.status).toBe(500)
        expect(res.body.error).toMatch(/failed to extract/i)
    })
})
