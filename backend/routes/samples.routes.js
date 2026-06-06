/**
 * Tests for the /api/samples routes (new schema).
 */

import {jest} from '@jest/globals'
import jwt from 'jsonwebtoken'

const mockPrismaSample = {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
}

const mockPredictSirProfileWithAI = jest.fn()

jest.unstable_mockModule('../lib/prisma.js', () => ({
    default: {sample: mockPrismaSample},
}))

jest.unstable_mockModule('../lib/sir-prediction.js', () => ({
    predictSirProfileWithAI: mockPredictSirProfileWithAI,
}))

const {default: express} = await import('express')
const cookieParser = (await import('cookie-parser')).default
const {default: supertest} = await import('supertest')
const {default: samplesRouter} = await import('../routes/samples.routes.js')

function buildApp() {
    const app = express()
    app.use(express.json())
    app.use(cookieParser())
    app.use('/api/samples', samplesRouter)
    return app
}

function api() {
    return supertest(buildApp())
}

const TEST_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me'
function signToken(payload = {userID: 1, role: 'user', email: 'user@example.com'}) {
    return jwt.sign(payload, TEST_SECRET, {expiresIn: '1h'})
}
function authCookie(payload) {
    return [`token=${signToken(payload)}`]
}

const sampleFixture = {
    sample_id: 'SAMPLE-001',
    latitude: 25.12,
    longitude: 28.45,
    water_temp: 22.5,
    ph: 7.2,
    tds: null,
    do: null,
    isolation_source: 'River',
    collection_date: new Date('2024-01-15').toISOString(),
    location_name: 'Test River',
    uploaded_by: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
}

describe('POST /api/samples', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 400 when required fields (sample_id, latitude, longitude) are missing', async () => {
        const res = await api().post('/api/samples').set('Cookie', authCookie()).send({})
        expect(res.status).toBe(400)
        expect(res.body.errors).toBeDefined()
    })

    test('returns 400 when latitude is not a decimal', async () => {
        const res = await api()
            .post('/api/samples')
            .set('Cookie', authCookie())
            .send({sample_id: 'SAMP-1', latitude: 'not-a-number', longitude: '28.45'})
        expect(res.status).toBe(400)
    })

    test('returns 201 with created sample on success', async () => {
        mockPrismaSample.create.mockResolvedValue(sampleFixture)
        const res = await api()
            .post('/api/samples')
            .set('Cookie', authCookie())
            .send({sample_id: 'SAMPLE-001', latitude: '25.12', longitude: '28.45'})
        expect(res.status).toBe(201)
        expect(res.body.sample).toBeDefined()
        expect(res.body.sample.latitude).toBe(sampleFixture.latitude)
    })

    test('parses optional numeric fields before saving', async () => {
        mockPrismaSample.create.mockResolvedValue(sampleFixture)
        const res = await api()
            .post('/api/samples')
            .set('Cookie', authCookie())
            .send({
                sample_id: 'SAMP-OPT',
                latitude: '25.12',
                longitude: '28.45',
                water_temp: '18.5',
                ph: '7.4',
                tds: '120.2',
                do: '9.6',
                isolation_source: 'Dam',
                collection_date: '2024-02-20',
                location_name: 'Test Dam',
            })
        expect(res.status).toBe(201)
        expect(mockPrismaSample.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                sample_id: 'SAMP-OPT',
                water_temp: 18.5,
                ph: 7.4,
                tds: 120.2,
                do: 9.6,
                isolation_source: 'Dam',
                location_name: 'Test Dam',
                latitude: 25.12,
                longitude: 28.45,
                uploaded_by: 1,
            }),
        })
        expect(mockPrismaSample.create.mock.calls[0][0].data.collection_date).toBeInstanceOf(Date)
    })

    test('returns 500 when sample creation fails', async () => {
        mockPrismaSample.create.mockRejectedValue(new Error('db down'))
        const res = await api()
            .post('/api/samples')
            .set('Cookie', authCookie())
            .send({sample_id: 'FAIL', latitude: '25.12', longitude: '28.45'})
        expect(res.status).toBe(500)
        expect(res.body.message).toMatch(/failed to create sample/i)
    })
})

describe('POST /api/samples/predict-phenotype', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 400 when required fields are missing', async () => {
        const res = await api()
            .post('/api/samples/predict-phenotype')
            .set('Cookie', authCookie())
            .send({latitude: '25.12'})
        expect(res.status).toBe(400)
        expect(res.body.errors).toBeDefined()
    })

    test('returns prediction when request is valid', async () => {
        mockPrismaSample.findMany.mockResolvedValue([
            {
                latitude: 25.13,
                longitude: 28.42,
                water_temp: 22.3,
                ph: 7.1,
                tds: 110,
                do: 8.2,
                isolation_source: 'River',
                predictedPhenotypes: [
                    {organism: 'E. coli', antibiotic: 'Ciprofloxacin', resistant: true},
                ],
            },
        ])
        mockPredictSirProfileWithAI.mockResolvedValue({
            resistant: true,
            confidence: 0.81,
            usedOpenAI: true,
        })
        const res = await api()
            .post('/api/samples/predict-phenotype')
            .set('Cookie', authCookie())
            .send({
                latitude: '25.12',
                longitude: '28.45',
                organism: 'E. coli',
                antibiotic: 'Ciprofloxacin',
                ph: '7.1',
            })
        expect(res.status).toBe(200)
        expect(res.body.prediction).toBeDefined()
        expect(res.body.prediction.resistant).toBe(true)
        expect(mockPrismaSample.findMany).toHaveBeenCalled()
    })

    test('returns 500 when prediction fails unexpectedly', async () => {
        mockPrismaSample.findMany.mockRejectedValue(new Error('db down'))
        const res = await api()
            .post('/api/samples/predict-phenotype')
            .set('Cookie', authCookie())
            .send({
                latitude: '25.12',
                longitude: '28.45',
                organism: 'E. coli',
                antibiotic: 'Ciprofloxacin',
            })
        expect(res.status).toBe(500)
        expect(res.body.message).toMatch(/failed to predict phenotype/i)
    })
})

describe('GET /api/samples', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 200 and an array of samples', async () => {
        mockPrismaSample.findMany.mockResolvedValue([sampleFixture])
        const res = await api().get('/api/samples')
        expect(res.status).toBe(200)
        expect(res.body.samples).toHaveLength(1)
    })

    test('returns 200 with empty array', async () => {
        mockPrismaSample.findMany.mockResolvedValue([])
        const res = await api().get('/api/samples')
        expect(res.status).toBe(200)
        expect(res.body.samples).toHaveLength(0)
    })

    test('returns 500 on failure', async () => {
        mockPrismaSample.findMany.mockRejectedValue(new Error('db down'))
        const res = await api().get('/api/samples')
        expect(res.status).toBe(500)
        expect(res.body.message).toMatch(/failed to retrieve samples/i)
    })
})

describe('GET /api/samples/:sample_id', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 404 for non‑existent sample (no 400 for string)', async () => {
        mockPrismaSample.findUnique.mockResolvedValue(null)
        const res = await api().get('/api/samples/abc123')
        expect(res.status).toBe(404)
    })

    test('returns 404 when sample not found', async () => {
        mockPrismaSample.findUnique.mockResolvedValue(null)
        const res = await api().get('/api/samples/NONEXISTENT')
        expect(res.status).toBe(404)
    })

    test('returns 200 when found', async () => {
        mockPrismaSample.findUnique.mockResolvedValue(sampleFixture)
        const res = await api().get('/api/samples/SAMPLE-001')
        expect(res.status).toBe(200)
        expect(res.body.sample.sample_id).toBe('SAMPLE-001')
    })

    test('returns 500 on error', async () => {
        mockPrismaSample.findUnique.mockRejectedValue(new Error('db down'))
        const res = await api().get('/api/samples/SAMPLE-001')
        expect(res.status).toBe(500)
    })
})

describe('PUT /api/samples/:sample_id', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 404 for any string (no 400)', async () => {
        mockPrismaSample.update.mockRejectedValue({code: 'P2025'})
        const res = await api().put('/api/samples/not-a-number').send({latitude: '25.55'})
        expect(res.status).toBe(404)
    })

    test('returns 400 when field validation fails (invalid decimal)', async () => {
        const res = await api().put('/api/samples/1').send({ph: 'not-a-number'})
        expect(res.status).toBe(400)
        expect(res.body.errors).toBeDefined()
    })

    test('updates only provided fields', async () => {
        const updated = {...sampleFixture, ph: 8.1}
        mockPrismaSample.update.mockResolvedValue(updated)
        const res = await api().put('/api/samples/SAMPLE-001').send({ph: '8.1'})
        expect(res.status).toBe(200)
        expect(res.body.sample.ph).toBe(8.1)
        expect(mockPrismaSample.update).toHaveBeenCalledWith({
            where: {sample_id: 'SAMPLE-001'},
            data: {ph: 8.1},
        })
    })

    test('parses all optional update fields', async () => {
        mockPrismaSample.update.mockResolvedValue({
            ...sampleFixture,
            water_temp: 18.5,
            ph: 7.4,
            tds: 120.2,
            do: 9.6,
            isolation_source: 'Dam',
            location_name: 'Updated Dam',
            latitude: 25.5,
            longitude: 28.8,
        })
        const res = await api().put('/api/samples/SAMPLE-001').send({
            water_temp: '18.5',
            ph: '7.4',
            tds: '120.2',
            do: '9.6',
            isolation_source: 'Dam',
            collection_date: '2024-02-20',
            location_name: 'Updated Dam',
            latitude: '25.5',
            longitude: '28.8',
        })
        expect(res.status).toBe(200)
        expect(mockPrismaSample.update).toHaveBeenCalledWith({
            where: {sample_id: 'SAMPLE-001'},
            data: expect.objectContaining({
                water_temp: 18.5,
                ph: 7.4,
                tds: 120.2,
                do: 9.6,
                isolation_source: 'Dam',
                location_name: 'Updated Dam',
                latitude: 25.5,
                longitude: 28.8,
            }),
        })
        expect(mockPrismaSample.update.mock.calls[0][0].data.collection_date).toBeInstanceOf(Date)
    })

    test('returns 404 when sample not found', async () => {
        const error = new Error('missing')
        error.code = 'P2025'
        mockPrismaSample.update.mockRejectedValue(error)
        const res = await api().put('/api/samples/MISSING').send({latitude: '25.55'})
        expect(res.status).toBe(404)
    })

    test('returns 500 on unexpected error', async () => {
        mockPrismaSample.update.mockRejectedValue(new Error('db down'))
        const res = await api().put('/api/samples/SAMPLE-001').send({longitude: '29.01'})
        expect(res.status).toBe(500)
    })
})

describe('DELETE /api/samples/:sample_id', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 404 for any string (no 400)', async () => {
        mockPrismaSample.delete.mockRejectedValue({code: 'P2025'})
        const res = await api().delete('/api/samples/not-a-number')
        expect(res.status).toBe(404)
    })

    test('returns 200 when deleted', async () => {
        mockPrismaSample.delete.mockResolvedValue(sampleFixture)
        const res = await api().delete('/api/samples/SAMPLE-001')
        expect(res.status).toBe(200)
        expect(res.body.message).toMatch(/deleted successfully/i)
        expect(mockPrismaSample.delete).toHaveBeenCalledWith({
            where: {sample_id: 'SAMPLE-001'},
        })
    })

    test('returns 404 when sample not found', async () => {
        const error = new Error('missing')
        error.code = 'P2025'
        mockPrismaSample.delete.mockRejectedValue(error)
        const res = await api().delete('/api/samples/MISSING')
        expect(res.status).toBe(404)
    })

    test('returns 500 on error', async () => {
        mockPrismaSample.delete.mockRejectedValue(new Error('db down'))
        const res = await api().delete('/api/samples/SAMPLE-001')
        expect(res.status).toBe(500)
    })
})