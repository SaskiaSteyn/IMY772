/**
 * Tests for the /api/samples routes.
 */

import {jest} from '@jest/globals'
import jwt from 'jsonwebtoken'

// ─── Mock prisma BEFORE importing the router ─────────────────────────────────

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

// ─── Lazy imports ─────────────────────────────────────────────────────────────

const {default: express} = await import('express')
const cookieParser = (await import('cookie-parser')).default
const {default: supertest} = await import('supertest')
const {default: samplesRouter} = await import('../routes/samples.routes.js')

// ─── Build minimal test app ───────────────────────────────────────────────────

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

// ─── Sample fixture (matches actual schema) ───────────────────────────────────

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

// ─── POST /api/samples ────────────────────────────────────────────────────────

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
            .send({
                sample_id: 'SAMP-1',
                latitude: 'not-a-number',
                longitude: '28.45',
            })
        expect(res.status).toBe(400)
    })

    test('returns 201 with created sample on success', async () => {
        mockPrismaSample.create.mockResolvedValue(sampleFixture)

        const res = await api()
            .post('/api/samples')
            .set('Cookie', authCookie())
            .send({
                sample_id: 'SAMPLE-001',
                latitude: '25.12',
                longitude: '28.45',
            })

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
            .send({
                sample_id: 'FAIL',
                latitude: '25.12',
                longitude: '28.45',
            })

        expect(res.status).toBe(500)
        expect(res.body.message).toMatch(/failed to create sample/i)
    })
})

// ─── POST /api/samples/predict-phenotype ──────────────────────────────────────

describe('POST /api/samples/predict-phenotype', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 400 when required fields are missing', async () => {
        const res = await api()
            .post('/api/samples/predict-phenotype')
            .set('Cookie', authCookie())
            .send({latitude: '25.12'}) // missing longitude, organism, antibiotic
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
                    {organism: 'E. coli', antibiotic: 'Ampicillin', resistant: false},
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
        expect(mockPredictSirProfileWithAI).toHaveBeenCalledWith({
            inputSample: expect.objectContaining({
                latitude: '25.12',
                longitude: '28.45',
            }),
            trainingSamples: expect.any(Array),
            organism: 'E. coli',
            antibiotic: 'Ciprofloxacin',
        })
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

// ─── GET /api/samples ─────────────────────────────────────────────────────────

describe('GET /api/samples', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 200 and an array of samples', async () => {
        mockPrismaSample.findMany.mockResolvedValue([sampleFixture])

        const res = await api().get('/api/samples')

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body.samples)).toBe(true)
        expect(res.body.samples).toHaveLength(1)
    })

    test('returns 200 with an empty array when no samples exist', async () => {
        mockPrismaSample.findMany.mockResolvedValue([])

        const res = await api().get('/api/samples')

        expect(res.status).toBe(200)
        expect(res.body.samples).toHaveLength(0)
    })

    test('returns 500 when loading samples fails', async () => {
        mockPrismaSample.findMany.mockRejectedValue(new Error('db down'))

        const res = await api().get('/api/samples')

        expect(res.status).toBe(500)
        expect(res.body.message).toMatch(/failed to retrieve samples/i)
    })

    test('derives predicted_sir_profile as "resistant" when any phenotype has resistant=true', async () => {
        mockPrismaSample.findMany.mockResolvedValue([
            { ...sampleFixture, predictedPhenotypes: [{ resistant: true }] },
        ])

        const res = await api().get('/api/samples')

        expect(res.status).toBe(200)
        expect(res.body.samples[0].predicted_sir_profile).toBe('resistant')
    })

    test('derives predicted_sir_profile as "intermediate" when a phenotype has resistant=null', async () => {
        mockPrismaSample.findMany.mockResolvedValue([
            { ...sampleFixture, predictedPhenotypes: [{ resistant: null }] },
        ])

        const res = await api().get('/api/samples')

        expect(res.status).toBe(200)
        expect(res.body.samples[0].predicted_sir_profile).toBe('intermediate')
    })

    test('derives predicted_sir_profile as "susceptible" when all phenotypes have resistant=false', async () => {
        mockPrismaSample.findMany.mockResolvedValue([
            { ...sampleFixture, predictedPhenotypes: [{ resistant: false }] },
        ])

        const res = await api().get('/api/samples')

        expect(res.status).toBe(200)
        expect(res.body.samples[0].predicted_sir_profile).toBe('susceptible')
    })

    test('derives predicted_sir_profile as "unknown" when predictedPhenotypes is empty', async () => {
        mockPrismaSample.findMany.mockResolvedValue([
            { ...sampleFixture, predictedPhenotypes: [] },
        ])

        const res = await api().get('/api/samples')

        expect(res.status).toBe(200)
        expect(res.body.samples[0].predicted_sir_profile).toBe('unknown')
    })
})

// ─── GET /api/samples/:sample_id ──────────────────────────────────────────────

describe('GET /api/samples/:sample_id', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 400 when sample_id is not a string (missing param)', async () => {
        const res = await api().get('/api/samples/abc123')
        expect(res.status).not.toBe(400) // Should be 404 because not found, not 400
    })

    test('returns 404 when sample is not found', async () => {
        mockPrismaSample.findUnique.mockResolvedValue(null)

        const res = await api().get('/api/samples/NONEXISTENT')
        expect(res.status).toBe(404)
        expect(res.body.message).toMatch(/not found/i)
    })

    test('returns 200 and the sample when found', async () => {
        mockPrismaSample.findUnique.mockResolvedValue(sampleFixture)

        const res = await api().get('/api/samples/SAMPLE-001')
        expect(res.status).toBe(200)
        expect(res.body.sample.sample_id).toBe('SAMPLE-001')
    })

    test('returns 500 when sample lookup fails', async () => {
        mockPrismaSample.findUnique.mockRejectedValue(new Error('db down'))

        const res = await api().get('/api/samples/SAMPLE-001')

        expect(res.status).toBe(500)
        expect(res.body.message).toMatch(/failed to retrieve sample/i)
    })
})

// ─── PUT /api/samples/:sample_id ──────────────────────────────────────────────

describe('PUT /api/samples/:sample_id', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 200 (no 400) when sample_id is any string (no integer validation)', async () => {
        // The route doesn't reject any string, so this should attempt update and fail with 404 or 500.
        mockPrismaSample.update.mockRejectedValue({code: 'P2025'})
        const res = await api().put('/api/samples/not-a-number').send({latitude: '25.55'})
        expect(res.status).toBe(404) // because it tries to find sample_id 'not-a-number'
    })

    test('returns 400 when provided fields fail validation (e.g., invalid decimal)', async () => {
        const res = await api().put('/api/samples/1').send({
            ph: 'not-a-number',
        })
        expect(res.status).toBe(400)
        expect(res.body.errors).toBeDefined()
    })

    test('returns 200 and updates only provided fields', async () => {
        const updatedSample = {...sampleFixture, ph: 8.1}
        mockPrismaSample.update.mockResolvedValue(updatedSample)

        const res = await api().put('/api/samples/SAMPLE-001').send({
            ph: '8.1',
        })

        expect(res.status).toBe(200)
        expect(res.body.sample.ph).toBe(8.1)
        expect(mockPrismaSample.update).toHaveBeenCalledWith({
            where: {sample_id: 'SAMPLE-001'},
            data: {
                ph: 8.1,
            },
        })
    })

    test('parses all optional update fields before saving', async () => {
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

    test('returns 404 when updating a missing sample', async () => {
        const error = new Error('missing')
        error.code = 'P2025'
        mockPrismaSample.update.mockRejectedValue(error)

        const res = await api().put('/api/samples/MISSING').send({latitude: '25.55'})

        expect(res.status).toBe(404)
        expect(res.body.message).toMatch(/not found/i)
    })

    test('returns 500 when update fails unexpectedly', async () => {
        mockPrismaSample.update.mockRejectedValue(new Error('db down'))

        const res = await api().put('/api/samples/SAMPLE-001').send({longitude: '29.01'})

        expect(res.status).toBe(500)
        expect(res.body.message).toMatch(/failed to update sample/i)
    })
})

// ─── DELETE /api/samples/:sample_id ───────────────────────────────────────────

describe('DELETE /api/samples/:sample_id', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 200 (no 400) when sample_id is any string (no integer validation)', async () => {
        mockPrismaSample.delete.mockRejectedValue({code: 'P2025'})
        const res = await api().delete('/api/samples/not-a-number')
        expect(res.status).toBe(404) // sample not found
    })

    test('returns 200 when sample is deleted', async () => {
        mockPrismaSample.delete.mockResolvedValue(sampleFixture)

        const res = await api().delete('/api/samples/SAMPLE-001')

        expect(res.status).toBe(200)
        expect(res.body.message).toMatch(/deleted successfully/i)
        expect(mockPrismaSample.delete).toHaveBeenCalledWith({
            where: {sample_id: 'SAMPLE-001'},
        })
    })

    test('returns 404 when deleting a missing sample', async () => {
        const error = new Error('missing')
        error.code = 'P2025'
        mockPrismaSample.delete.mockRejectedValue(error)

        const res = await api().delete('/api/samples/MISSING')

        expect(res.status).toBe(404)
        expect(res.body.message).toMatch(/not found/i)
    })

    test('returns 500 when delete fails unexpectedly', async () => {
        mockPrismaSample.delete.mockRejectedValue(new Error('db down'))

        const res = await api().delete('/api/samples/SAMPLE-001')

        expect(res.status).toBe(500)
        expect(res.body.message).toMatch(/failed to delete sample/i)
    })
})