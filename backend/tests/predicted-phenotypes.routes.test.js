/**
 * Tests for /api/predicted-phenotypes routes.
 */

import {jest} from '@jest/globals'
import jwt from 'jsonwebtoken'

const mockPrismaPhenotype = {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
}

const mockPrismaSample = {
    findUnique: jest.fn(),
}

jest.unstable_mockModule('../lib/prisma.js', () => ({
    default: {
        predictedPhenotype: mockPrismaPhenotype,
        sample: mockPrismaSample,
    },
}))

const {default: express} = await import('express')
const cookieParser = (await import('cookie-parser')).default
const {default: supertest} = await import('supertest')
const {default: phenotypesRouter} = await import('../routes/predicted-phenotypes.routes.js')

function buildApp() {
    const app = express()
    app.use(express.json())
    app.use(cookieParser())
    app.use('/api/predicted-phenotypes', phenotypesRouter)
    return app
}

function api() {
    return supertest(buildApp())
}

const TEST_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me'
function signToken() {
    return jwt.sign({userID: 1, role: 'user'}, TEST_SECRET, {expiresIn: '1h'})
}
function authCookie() {
    return [`token=${signToken()}`]
}

const sampleFixture = {sample_id: 'sample-1'}
const phenotypeFixture = {
    phenotype_id: 1,
    sample_id: 'sample-1',
    organism: 'E. coli',
    antibiotic: 'Ciprofloxacin',
    resistant: true,
}

// ─── POST /api/predicted-phenotypes ─────────────────────────────────────────
describe('POST /api/predicted-phenotypes', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 400 when sample_id missing', async () => {
        const res = await api()
            .post('/api/predicted-phenotypes')
            .set('Cookie', authCookie())
            .send({organism: 'E. coli'})
        expect(res.status).toBe(400)
    })

    test('returns 404 if sample not found', async () => {
        mockPrismaSample.findUnique.mockResolvedValue(null)
        const res = await api()
            .post('/api/predicted-phenotypes')
            .set('Cookie', authCookie())
            .send({sample_id: 'missing'})
        expect(res.status).toBe(404)
    })

    test('creates phenotype successfully', async () => {
        mockPrismaSample.findUnique.mockResolvedValue(sampleFixture)
        mockPrismaPhenotype.create.mockResolvedValue(phenotypeFixture)

        const res = await api()
            .post('/api/predicted-phenotypes')
            .set('Cookie', authCookie())
            .send(phenotypeFixture)

        expect(res.status).toBe(201)
        expect(res.body.phenotype).toEqual(phenotypeFixture)
    })
})

// ─── GET endpoints ───────────────────────────────────────────────────────────
describe('GET /api/predicted-phenotypes', () => {
    test('returns array', async () => {
        mockPrismaPhenotype.findMany.mockResolvedValue([phenotypeFixture])
        const res = await api().get('/api/predicted-phenotypes')
        expect(res.status).toBe(200)
        expect(res.body.phenotypes).toHaveLength(1)
    })
})

describe('GET /api/predicted-phenotypes/sample/:sample_id', () => {
    test('returns phenotypes for sample', async () => {
        mockPrismaPhenotype.findMany.mockResolvedValue([phenotypeFixture])
        const res = await api().get('/api/predicted-phenotypes/sample/sample-1')
        expect(res.status).toBe(200)
        expect(mockPrismaPhenotype.findMany).toHaveBeenCalledWith({
            where: {sample_id: 'sample-1'},
            include: {sample: true},
        })
    })
})

describe('GET /api/predicted-phenotypes/:phenotype_id', () => {
    test('returns 400 if not integer', async () => {
        const res = await api().get('/api/predicted-phenotypes/abc')
        expect(res.status).toBe(400)
    })

    test('returns 404 if not found', async () => {
        mockPrismaPhenotype.findUnique.mockResolvedValue(null)
        const res = await api().get('/api/predicted-phenotypes/999')
        expect(res.status).toBe(404)
    })

    test('returns phenotype', async () => {
        mockPrismaPhenotype.findUnique.mockResolvedValue(phenotypeFixture)
        const res = await api().get('/api/predicted-phenotypes/1')
        expect(res.status).toBe(200)
        expect(res.body.phenotype).toEqual(phenotypeFixture)
    })
})

// ─── PUT /api/predicted-phenotypes/:phenotype_id ────────────────────────────
describe('PUT /api/predicted-phenotypes/:phenotype_id', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 401 without auth', async () => {
        const res = await api().put('/api/predicted-phenotypes/1').send({resistant: false})
        expect(res.status).toBe(401)
    })

    test('updates resistant (last field) successfully', async () => {
        mockPrismaPhenotype.findUnique.mockResolvedValue({
            ...phenotypeFixture,
            ai_resistant: true,
            is_manual_override: false,
        })
        const updated = {...phenotypeFixture, resistant: false}
        mockPrismaPhenotype.update.mockResolvedValue(updated)

        const res = await api()
            .put('/api/predicted-phenotypes/1')
            .set('Cookie', authCookie())
            .send({resistant: false})

        expect(res.status).toBe(200)
        expect(res.body.phenotype.resistant).toBe(false)
        expect(mockPrismaPhenotype.update).toHaveBeenCalledWith({
            where: {phenotype_id: 1},
            data: {
                resistant: false,
                is_manual_override: true,
            },
        })
    })

    test('clears manual override and backfills null ai_resistant', async () => {
        mockPrismaPhenotype.findUnique.mockResolvedValue({
            ...phenotypeFixture,
            resistant: true,
            ai_resistant: null,
            is_manual_override: true,
        })
        mockPrismaPhenotype.update.mockResolvedValue({
            ...phenotypeFixture,
            resistant: true,
            ai_resistant: true,
            is_manual_override: false,
        })

        const res = await api()
            .put('/api/predicted-phenotypes/1')
            .set('Cookie', authCookie())
            .send({clear_manual_override: true})

        expect(res.status).toBe(200)
        expect(mockPrismaPhenotype.update).toHaveBeenCalledWith({
            where: {phenotype_id: 1},
            data: {
                ai_resistant: true,
                resistant: true,
                is_manual_override: false,
            },
        })
    })

    test('returns 404 if not found', async () => {
        mockPrismaPhenotype.findUnique.mockResolvedValue(phenotypeFixture)
        const error = new Error('not found')
        error.code = 'P2025'
        mockPrismaPhenotype.update.mockRejectedValue(error)

        const res = await api()
            .put('/api/predicted-phenotypes/999')
            .set('Cookie', authCookie())
            .send({organism: 'Klebsiella'})
        expect(res.status).toBe(404)
    })
})

// ─── DELETE /api/predicted-phenotypes/:phenotype_id ─────────────────────────
describe('DELETE /api/predicted-phenotypes/:phenotype_id', () => {
    test('returns 401 without auth', async () => {
        const res = await api().delete('/api/predicted-phenotypes/1')
        expect(res.status).toBe(401)
    })

    test('deletes successfully', async () => {
        mockPrismaPhenotype.delete.mockResolvedValue(phenotypeFixture)
        const res = await api()
            .delete('/api/predicted-phenotypes/1')
            .set('Cookie', authCookie())
        expect(res.status).toBe(200)
        expect(res.body.message).toMatch(/deleted successfully/i)
    })

    test('returns 404 if not found', async () => {
        const error = new Error('not found')
        error.code = 'P2025'
        mockPrismaPhenotype.delete.mockRejectedValue(error)
        const res = await api()
            .delete('/api/predicted-phenotypes/999')
            .set('Cookie', authCookie())
        expect(res.status).toBe(404)
    })
})