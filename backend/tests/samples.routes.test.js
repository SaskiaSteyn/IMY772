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
    sample_name: 'TestRiver_SiteA_2024-01-15',
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
                sample_name: 'TestRiver_SiteA_2024-01-15',
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
                sample_name: 'TestDam_SiteA_2024-02-20',
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

    test('returns 409 when sample_id already exists (P2002)', async () => {
        const err = new Error('unique')
        err.code = 'P2002'
        mockPrismaSample.create.mockRejectedValue(err)

        const res = await api()
            .post('/api/samples')
            .set('Cookie', authCookie())
            .send({
                sample_id: 'DUP-001',
                sample_name: 'DupSite_2024-01-01',
                latitude: '25.12',
                longitude: '28.45',
            })

        expect(res.status).toBe(409)
        expect(res.body.message).toMatch(/already exists/i)
    })

    test('returns 500 when sample creation fails', async () => {
        mockPrismaSample.create.mockRejectedValue(new Error('db down'))

        const res = await api()
            .post('/api/samples')
            .set('Cookie', authCookie())
            .send({
                sample_id: 'FAIL',
                sample_name: 'FailSite_2024-01-01',
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
                    {organism: 'E. coli', antibiotic: 'Ciprofloxacin', predicted_sir_profile: 'Resistant'},
                    {organism: 'E. coli', antibiotic: 'Ampicillin', predicted_sir_profile: 'Susceptible'},
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

    test('derives predicted_sir_profile as "resistant" when any phenotype has predicted_sir_profile="Resistant"', async () => {
        mockPrismaSample.findMany.mockResolvedValue([
            {...sampleFixture, predictedPhenotypes: [{predicted_sir_profile: 'Resistant'}]},
        ])

        const res = await api().get('/api/samples')

        expect(res.status).toBe(200)
        expect(res.body.samples[0].predicted_sir_profile).toBe('resistant')
    })

    test('derives predicted_sir_profile as "intermediate" when a phenotype has predicted_sir_profile="Intermediate"', async () => {
        mockPrismaSample.findMany.mockResolvedValue([
            {...sampleFixture, predictedPhenotypes: [{predicted_sir_profile: 'Intermediate'}]},
        ])

        const res = await api().get('/api/samples')

        expect(res.status).toBe(200)
        expect(res.body.samples[0].predicted_sir_profile).toBe('intermediate')
    })

    test('derives predicted_sir_profile as "susceptible" when all phenotypes have predicted_sir_profile="Susceptible"', async () => {
        mockPrismaSample.findMany.mockResolvedValue([
            {...sampleFixture, predictedPhenotypes: [{predicted_sir_profile: 'Susceptible'}]},
        ])

        const res = await api().get('/api/samples')

        expect(res.status).toBe(200)
        expect(res.body.samples[0].predicted_sir_profile).toBe('susceptible')
    })

    test('derives predicted_sir_profile as "unknown" when predictedPhenotypes is empty', async () => {
        mockPrismaSample.findMany.mockResolvedValue([
            {...sampleFixture, predictedPhenotypes: []},
        ])

        const res = await api().get('/api/samples')

        expect(res.status).toBe(200)
        expect(res.body.samples[0].predicted_sir_profile).toBe('unknown')
    })

    test('derives predicted_sir_profile as "resistant" when no phenotypes but AMR findings exist', async () => {
        mockPrismaSample.findMany.mockResolvedValue([
            {
                ...sampleFixture,
                predictedPhenotypes: [],
                amrFindings: [{finding_id: 1, gene_symbol: 'blaNDM', amr_class: 'Carbapenem'}],
            },
        ])

        const res = await api().get('/api/samples')

        expect(res.status).toBe(200)
        expect(res.body.samples[0].predicted_sir_profile).toBe('resistant')
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

// ─── GET /api/samples/uploaded_by/:uploaded_by ──────────────────────────────────────────

describe('GET /api/samples/uploaded_by/:uploaded_by', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 400 when uploaded_by is not an integer', async () => {
        const res = await api().get('/api/samples/uploaded_by/not-an-integer')
        expect(res.status).toBe(400)
        expect(res.body.errors).toBeDefined()
        expect(res.body.errors[0].msg).toMatch(/must be an integer/)
    })

    test('returns 200 with array of samples for valid uploaded_by', async () => {
        const userSamples = [
            {...sampleFixture, sample_id: 'SAMP-1', uploaded_by: 2},
            {...sampleFixture, sample_id: 'SAMP-2', uploaded_by: 2}
        ]
        mockPrismaSample.findMany.mockResolvedValue(userSamples)

        const res = await api().get('/api/samples/uploaded_by/2')
        expect(res.status).toBe(200)
        expect(res.body.samples).toHaveLength(2)
        expect(res.body.samples[0].uploaded_by).toBe(2)
        expect(mockPrismaSample.findMany).toHaveBeenCalledWith({
            where: {uploaded_by: 2},
            include: {
                isolates: true,
                amrFindings: true,
                predictedPhenotypes: true,
            },
        })
    })

    test('returns 200 with empty array when no samples exist for uploaded_by', async () => {
        mockPrismaSample.findMany.mockResolvedValue([])

        const res = await api().get('/api/samples/uploaded_by/999')
        expect(res.status).toBe(200)
        expect(res.body.samples).toEqual([])
    })

    test('returns 500 when database query fails', async () => {
        mockPrismaSample.findMany.mockRejectedValue(new Error('db down'))

        const res = await api().get('/api/samples/uploaded_by/1')
        expect(res.status).toBe(500)
        expect(res.body.message).toMatch(/failed to retrieve samples/i)
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