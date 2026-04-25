/**
 * Tests for the /api/samples routes.
 *
 * Prisma is mocked so no real database connection is required.
 */

import { jest } from '@jest/globals'

// ─── Mock prisma BEFORE importing the router ─────────────────────────────────

const mockPrismaSample = {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
}

jest.unstable_mockModule('../lib/prisma.js', () => ({
    default: { sample: mockPrismaSample },
}))

// ─── Lazy imports ─────────────────────────────────────────────────────────────

const { default: express } = await import('express')
const { default: supertest } = await import('supertest')
const { default: samplesRouter } = await import('../routes/samples.routes.js')

// ─── Build minimal test app ───────────────────────────────────────────────────

function buildApp() {
    const app = express()
    app.use(express.json())
    app.use('/api/samples', samplesRouter)
    return app
}

function api() {
    return supertest(buildApp())
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
    predicted_sir_profile: 'Susceptible',
}

// ─── POST /api/samples ────────────────────────────────────────────────────────

describe('POST /api/samples', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 400 when latitude and longitude are missing', async () => {
        const res = await api().post('/api/samples').send({})
        expect(res.status).toBe(400)
        expect(res.body.errors).toBeDefined()
    })

    test('returns 400 when latitude is not a decimal', async () => {
        const res = await api().post('/api/samples').send({
            latitude: 'not-a-number',
            longitude: '28.45',
        })
        expect(res.status).toBe(400)
    })

    test('returns 400 when predicted_sir_profile is invalid', async () => {
        const res = await api().post('/api/samples').send({
            latitude: '25.12',
            longitude: '28.45',
            predicted_sir_profile: 'Unknown',
        })
        expect(res.status).toBe(400)
    })

    test('returns 201 with created sample on success', async () => {
        mockPrismaSample.create.mockResolvedValue(sampleFixture)

        const res = await api().post('/api/samples').send({
            latitude: '25.12',
            longitude: '28.45',
            sample_analysis_type: 'WGS',
        })

        expect(res.status).toBe(201)
        expect(res.body.sample).toBeDefined()
        expect(res.body.sample.latitude).toBe(sampleFixture.latitude)
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
})
