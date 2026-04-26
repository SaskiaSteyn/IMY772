/**
 * Tests for the /api/samples routes.
 *
 * Prisma is mocked so no real database connection is required.
 */

import {jest} from '@jest/globals'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'

// ─── Mock prisma BEFORE importing the router ─────────────────────────────────

const mockPrismaSample = {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
}

jest.unstable_mockModule('../lib/prisma.js', () => ({
    default: {sample: mockPrismaSample},
}))

// ─── Lazy imports ─────────────────────────────────────────────────────────────

const {default: express} = await import('express')
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

// ─── Sample fixture ───────────────────────────────────────────────────────────

const sampleFixture = {
    sampleID: 1,
    latitude: 25.12,
    longitude: 28.45,
    water_temperature: 22.5,
    ph: 7.2,
    tds: null,
    do: null,
    sample_analysis_type: 'WGS',
    isolation_source: 'River',
    collection_date: new Date('2024-01-15').toISOString(),
    location_name: 'Test River',
    collected_by: 'Researcher A',
    uploaded_by: 1,
    predicted_sir_profile: 'Susceptible',
}

// ─── POST /api/samples ────────────────────────────────────────────────────────

describe('POST /api/samples', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 400 when latitude and longitude are missing', async () => {
        const res = await api().post('/api/samples').set('Cookie', authCookie()).send({})
        expect(res.status).toBe(400)
        expect(res.body.errors).toBeDefined()
    })

    test('returns 400 when latitude is not a decimal', async () => {
        const res = await api().post('/api/samples').set('Cookie', authCookie()).send({
            latitude: 'not-a-number',
            longitude: '28.45',
        })
        expect(res.status).toBe(400)
    })

    test('returns 400 when predicted_sir_profile is invalid', async () => {
        const res = await api().post('/api/samples').set('Cookie', authCookie()).send({
            latitude: '25.12',
            longitude: '28.45',
            predicted_sir_profile: 'Unknown',
        })
        expect(res.status).toBe(400)
    })

    test('returns 201 with created sample on success', async () => {
        mockPrismaSample.create.mockResolvedValue(sampleFixture)

        const res = await api().post('/api/samples').set('Cookie', authCookie()).send({
            latitude: '25.12',
            longitude: '28.45',
            sample_analysis_type: 'WGS',
        })

        expect(res.status).toBe(201)
        expect(res.body.sample).toBeDefined()
        expect(res.body.sample.latitude).toBe(sampleFixture.latitude)
    })

    test('parses optional create fields before saving', async () => {
        mockPrismaSample.create.mockResolvedValue(sampleFixture)

        const res = await api().post('/api/samples').set('Cookie', authCookie()).send({
            latitude: '25.12',
            longitude: '28.45',
            water_temperature: '18.5',
            ph: '7.4',
            tds: '120.2',
            do: '9.6',
            sample_analysis_type: 'Metagenomic',
            isolation_source: 'Dam',
            collection_date: '2024-02-20',
            location_name: 'Test Dam',
            collected_by: 'Researcher B',
            predicted_sir_profile: 'Intermediate',
        })

        expect(res.status).toBe(201)
        expect(mockPrismaSample.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                water_temperature: 18.5,
                ph: 7.4,
                tds: 120.2,
                do: 9.6,
                sample_analysis_type: 'Metagenomic',
                isolation_source: 'Dam',
                location_name: 'Test Dam',
                latitude: 25.12,
                longitude: 28.45,
                collected_by: 'Researcher B',
                uploaded_by: 1,
                predicted_sir_profile: 'Intermediate',
            }),
        })
        expect(mockPrismaSample.create.mock.calls[0][0].data.collection_date).toBeInstanceOf(Date)
    })

    test('returns 500 when sample creation fails', async () => {
        mockPrismaSample.create.mockRejectedValue(new Error('db down'))

        const res = await api().post('/api/samples').set('Cookie', authCookie()).send({
            latitude: '25.12',
            longitude: '28.45',
        })

        expect(res.status).toBe(500)
        expect(res.body.message).toMatch(/failed to create sample/i)
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
})

// ─── GET /api/samples/:sampleID ───────────────────────────────────────────────

describe('GET /api/samples/:sampleID', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 400 when sampleID is not an integer', async () => {
        const res = await api().get('/api/samples/abc')
        expect(res.status).toBe(400)
    })

    test('returns 404 when sample is not found', async () => {
        mockPrismaSample.findUnique.mockResolvedValue(null)

        const res = await api().get('/api/samples/999')
        expect(res.status).toBe(404)
        expect(res.body.message).toMatch(/not found/i)
    })

    test('returns 200 and the sample when found', async () => {
        mockPrismaSample.findUnique.mockResolvedValue(sampleFixture)

        const res = await api().get('/api/samples/1')
        expect(res.status).toBe(200)
        expect(res.body.sample.sampleID).toBe(1)
    })

    test('returns 500 when sample lookup fails', async () => {
        mockPrismaSample.findUnique.mockRejectedValue(new Error('db down'))

        const res = await api().get('/api/samples/1')

        expect(res.status).toBe(500)
        expect(res.body.message).toMatch(/failed to retrieve sample/i)
    })
})

// ─── PUT /api/samples/:sampleID ───────────────────────────────────────────────

describe('PUT /api/samples/:sampleID', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 400 when sampleID is not an integer', async () => {
        const res = await api().put('/api/samples/not-a-number').send({latitude: '25.55'})

        expect(res.status).toBe(400)
        expect(res.body.errors).toBeDefined()
    })

    test('returns 400 when provided fields fail validation', async () => {
        const res = await api().put('/api/samples/1').send({
            predicted_sir_profile: 'Unknown',
        })

        expect(res.status).toBe(400)
        expect(res.body.errors).toBeDefined()
    })

    test('returns 200 and updates only provided fields', async () => {
        mockPrismaSample.update.mockResolvedValue({
            ...sampleFixture,
            ph: 8.1,
            predicted_sir_profile: 'Resistant',
        })

        const res = await api().put('/api/samples/1').send({
            ph: '8.1',
            predicted_sir_profile: 'Resistant',
        })

        expect(res.status).toBe(200)
        expect(res.body.sample.ph).toBe(8.1)
        expect(mockPrismaSample.update).toHaveBeenCalledWith({
            where: {sampleID: 1},
            data: {
                ph: 8.1,
                predicted_sir_profile: 'Resistant',
            },
        })
    })

    test('parses all optional update fields before saving', async () => {
        mockPrismaSample.update.mockResolvedValue({
            ...sampleFixture,
            water_temperature: 18.5,
            ph: 7.4,
            tds: 120.2,
            do: 9.6,
            sample_analysis_type: 'Metagenomic',
            isolation_source: 'Dam',
            location_name: 'Updated Dam',
            latitude: 25.5,
            longitude: 28.8,
            collected_by: 'Researcher B',
            predicted_sir_profile: 'Susceptible',
        })

        const res = await api().put('/api/samples/1').send({
            water_temperature: '18.5',
            ph: '7.4',
            tds: '120.2',
            do: '9.6',
            sample_analysis_type: 'Metagenomic',
            isolation_source: 'Dam',
            collection_date: '2024-02-20',
            location_name: 'Updated Dam',
            latitude: '25.5',
            longitude: '28.8',
            collected_by: 'Researcher B',
            predicted_sir_profile: 'Susceptible',
        })

        expect(res.status).toBe(200)
        expect(mockPrismaSample.update).toHaveBeenCalledWith({
            where: {sampleID: 1},
            data: expect.objectContaining({
                water_temperature: 18.5,
                ph: 7.4,
                tds: 120.2,
                do: 9.6,
                sample_analysis_type: 'Metagenomic',
                isolation_source: 'Dam',
                location_name: 'Updated Dam',
                latitude: 25.5,
                longitude: 28.8,
                collected_by: 'Researcher B',
                uploaded_by: 1,
                predicted_sir_profile: 'Susceptible',
            }),
        })
        expect(mockPrismaSample.update.mock.calls[0][0].data.collection_date).toBeInstanceOf(Date)
    })

    test('returns 404 when updating a missing sample', async () => {
        const error = new Error('missing')
        error.code = 'P2025'
        mockPrismaSample.update.mockRejectedValue(error)

        const res = await api().put('/api/samples/999').send({latitude: '25.55'})

        expect(res.status).toBe(404)
        expect(res.body.message).toMatch(/not found/i)
    })

    test('returns 500 when update fails unexpectedly', async () => {
        mockPrismaSample.update.mockRejectedValue(new Error('db down'))

        const res = await api().put('/api/samples/1').send({longitude: '29.01'})

        expect(res.status).toBe(500)
        expect(res.body.message).toMatch(/failed to update sample/i)
    })
})

// ─── DELETE /api/samples/:sampleID ───────────────────────────────────────────

describe('DELETE /api/samples/:sampleID', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 400 when sampleID is not an integer', async () => {
        const res = await api().delete('/api/samples/not-a-number')

        expect(res.status).toBe(400)
        expect(res.body.errors).toBeDefined()
    })

    test('returns 200 when sample is deleted', async () => {
        mockPrismaSample.delete.mockResolvedValue(sampleFixture)

        const res = await api().delete('/api/samples/1')

        expect(res.status).toBe(200)
        expect(res.body.message).toMatch(/deleted successfully/i)
        expect(mockPrismaSample.delete).toHaveBeenCalledWith({
            where: {sampleID: 1},
        })
    })

    test('returns 404 when deleting a missing sample', async () => {
        const error = new Error('missing')
        error.code = 'P2025'
        mockPrismaSample.delete.mockRejectedValue(error)

        const res = await api().delete('/api/samples/999')

        expect(res.status).toBe(404)
        expect(res.body.message).toMatch(/not found/i)
    })

    test('returns 500 when delete fails unexpectedly', async () => {
        mockPrismaSample.delete.mockRejectedValue(new Error('db down'))

        const res = await api().delete('/api/samples/1')

        expect(res.status).toBe(500)
        expect(res.body.message).toMatch(/failed to delete sample/i)
    })
})
