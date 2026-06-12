/**
 * Tests for /api/amr-findings routes.
 */

import { jest } from '@jest/globals'
import jwt from 'jsonwebtoken'

// ─── Mock prisma ─────────────────────────────────────────────────────────────
const mockPrismaAmrFinding = {
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
        amrFinding: mockPrismaAmrFinding,
        sample: mockPrismaSample,
    },
}))

// ─── Lazy imports ───────────────────────────────────────────────────────────
const { default: express } = await import('express')
const cookieParser = (await import('cookie-parser')).default
const { default: supertest } = await import('supertest')
const { default: amrRouter } = await import('../routes/amr-findings.routes.js')

function buildApp() {
    const app = express()
    app.use(express.json())
    app.use(cookieParser())
    app.use('/api/amr-findings', amrRouter)
    return app
}

function api() {
    return supertest(buildApp())
}

const TEST_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me'
function signToken() {
    return jwt.sign({ userID: 1, role: 'user' }, TEST_SECRET, { expiresIn: '1h' })
}
function authCookie() {
    return [`token=${signToken()}`]
}

const sampleFixture = { sample_id: 'sample-1' }
const amrFixture = {
    finding_id: 1,
    sample_id: 'sample-1',
    analysis_type: 'WGS',
    gene_symbol: 'blaCTX-M',
    amr_class: 'Cephalosporin',
    method: 'ResFinder',
    percent_identity: 98.5,
}

// ─── POST /api/amr-findings ─────────────────────────────────────────────────
describe('POST /api/amr-findings', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 400 when sample_id missing', async () => {
        const res = await api()
            .post('/api/amr-findings')
            .set('Cookie', authCookie())
            .send({ gene_symbol: 'bla' })
        expect(res.status).toBe(400)
    })

    test('returns 404 when sample not found', async () => {
        mockPrismaSample.findUnique.mockResolvedValue(null)
        const res = await api()
            .post('/api/amr-findings')
            .set('Cookie', authCookie())
            .send({ sample_id: 'missing' })
        expect(res.status).toBe(404)
    })

    test('returns 201 and creates finding', async () => {
        mockPrismaSample.findUnique.mockResolvedValue(sampleFixture)
        mockPrismaAmrFinding.create.mockResolvedValue(amrFixture)

        const res = await api()
            .post('/api/amr-findings')
            .set('Cookie', authCookie())
            .send(amrFixture)

        expect(res.status).toBe(201)
        expect(res.body.amrFinding).toEqual(amrFixture)
    })

    test('returns 500 on error', async () => {
        mockPrismaSample.findUnique.mockRejectedValue(new Error('db down'))
        const res = await api()
            .post('/api/amr-findings')
            .set('Cookie', authCookie())
            .send({ sample_id: 'sample-1' })
        expect(res.status).toBe(500)
    })
})

// ─── GET /api/amr-findings ──────────────────────────────────────────────────
describe('GET /api/amr-findings', () => {
    test('returns array of findings', async () => {
        mockPrismaAmrFinding.findMany.mockResolvedValue([amrFixture])
        const res = await api().get('/api/amr-findings')
        expect(res.status).toBe(200)
        expect(res.body.amrFindings).toHaveLength(1)
    })

    test('returns 500 on error', async () => {
        mockPrismaAmrFinding.findMany.mockRejectedValue(new Error('db down'))
        const res = await api().get('/api/amr-findings')
        expect(res.status).toBe(500)
    })
})

// ─── GET /api/amr-findings/sample/:sample_id ────────────────────────────────
describe('GET /api/amr-findings/sample/:sample_id', () => {
    test('returns findings for sample', async () => {
        mockPrismaAmrFinding.findMany.mockResolvedValue([amrFixture])
        const res = await api().get('/api/amr-findings/sample/sample-1')
        expect(res.status).toBe(200)
        expect(mockPrismaAmrFinding.findMany).toHaveBeenCalledWith({
            where: { sample_id: 'sample-1' },
            include: { sample: true },
        })
    })

    test('returns 400 if sample_id is missing', async () => {
        const res = await api().get('/api/amr-findings/sample/')
        expect(res.status).toBe(400)
    })

    test('returns 500 on db error', async () => {
        mockPrismaAmrFinding.findMany.mockRejectedValue(new Error('db down'))
        const res = await api().get('/api/amr-findings/sample/sample-1')
        expect(res.status).toBe(500)
    })
})

// ─── GET /api/amr-findings/:amr_id ──────────────────────────────────────────
describe('GET /api/amr-findings/:amr_id', () => {
    test('returns 400 if not integer', async () => {
        const res = await api().get('/api/amr-findings/abc')
        expect(res.status).toBe(400)
    })

    test('returns 404 if not found', async () => {
        mockPrismaAmrFinding.findUnique.mockResolvedValue(null)
        const res = await api().get('/api/amr-findings/999')
        expect(res.status).toBe(404)
    })

    test('returns finding', async () => {
        mockPrismaAmrFinding.findUnique.mockResolvedValue(amrFixture)
        const res = await api().get('/api/amr-findings/1')
        expect(res.status).toBe(200)
        expect(res.body.amrFinding).toEqual(amrFixture)
    })

    test('returns 500 on db error', async () => {
        mockPrismaAmrFinding.findUnique.mockRejectedValue(new Error('db down'))
        const res = await api().get('/api/amr-findings/1')
        expect(res.status).toBe(500)
    })
})

// ─── PUT /api/amr-findings/:amr_id ──────────────────────────────────────────
describe('PUT /api/amr-findings/:amr_id', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 401 without auth', async () => {
        const res = await api().put('/api/amr-findings/1').send({ percent_identity: 99.0 })
        expect(res.status).toBe(401)
    })

    test('updates analysis_type', async () => {
        const updated = { ...amrFixture, analysis_type: 'MLST' }
        mockPrismaAmrFinding.update.mockResolvedValue(updated)

        const res = await api()
            .put('/api/amr-findings/1')
            .set('Cookie', authCookie())
            .send({ analysis_type: 'MLST' })

        expect(res.status).toBe(200)
        expect(mockPrismaAmrFinding.update).toHaveBeenCalledWith({
            where: { finding_id: 1 },
            data: { analysis_type: 'MLST' },
        })
    })

    test('updates gene_symbol', async () => {
        const updated = { ...amrFixture, gene_symbol: 'blaOXA' }
        mockPrismaAmrFinding.update.mockResolvedValue(updated)

        const res = await api()
            .put('/api/amr-findings/1')
            .set('Cookie', authCookie())
            .send({ gene_symbol: 'blaOXA' })

        expect(res.status).toBe(200)
        expect(mockPrismaAmrFinding.update).toHaveBeenCalledWith({
            where: { finding_id: 1 },
            data: { gene_symbol: 'blaOXA' },
        })
    })

    test('updates amr_class', async () => {
        const updated = { ...amrFixture, amr_class: 'Fluoroquinolone' }
        mockPrismaAmrFinding.update.mockResolvedValue(updated)

        const res = await api()
            .put('/api/amr-findings/1')
            .set('Cookie', authCookie())
            .send({ amr_class: 'Fluoroquinolone' })

        expect(res.status).toBe(200)
        expect(mockPrismaAmrFinding.update).toHaveBeenCalledWith({
            where: { finding_id: 1 },
            data: { amr_class: 'Fluoroquinolone' },
        })
    })

    test('updates method', async () => {
        const updated = { ...amrFixture, method: 'BLAST' }
        mockPrismaAmrFinding.update.mockResolvedValue(updated)

        const res = await api()
            .put('/api/amr-findings/1')
            .set('Cookie', authCookie())
            .send({ method: 'BLAST' })

        expect(res.status).toBe(200)
        expect(mockPrismaAmrFinding.update).toHaveBeenCalledWith({
            where: { finding_id: 1 },
            data: { method: 'BLAST' },
        })
    })

    test('updates percent_identity', async () => {
        const updated = { ...amrFixture, percent_identity: 99.0 }
        mockPrismaAmrFinding.update.mockResolvedValue(updated)

        const res = await api()
            .put('/api/amr-findings/1')
            .set('Cookie', authCookie())
            .send({ percent_identity: 99.0 })

        expect(res.status).toBe(200)
        expect(res.body.amrFinding.percent_identity).toBe(99.0)
        expect(mockPrismaAmrFinding.update).toHaveBeenCalledWith({
            where: { finding_id: 1 },
            data: { percent_identity: 99.0 },
        })
    })

    test('returns 404 on not found', async () => {
        const error = new Error('not found')
        error.code = 'P2025'
        mockPrismaAmrFinding.update.mockRejectedValue(error)

        const res = await api()
            .put('/api/amr-findings/999')
            .set('Cookie', authCookie())
            .send({ gene_symbol: 'new' })
        expect(res.status).toBe(404)
    })

    test('returns 500 on db error', async () => {
        mockPrismaAmrFinding.update.mockRejectedValue(new Error('db down'))
        const res = await api()
            .put('/api/amr-findings/1')
            .set('Cookie', authCookie())
            .send({ method: 'test' })
        expect(res.status).toBe(500)
    })
})

// ─── DELETE /api/amr-findings/:amr_id ───────────────────────────────────────
describe('DELETE /api/amr-findings/:amr_id', () => {
    test('returns 401 without auth', async () => {
        const res = await api().delete('/api/amr-findings/1')
        expect(res.status).toBe(401)
    })

    test('deletes successfully', async () => {
        mockPrismaAmrFinding.delete.mockResolvedValue(amrFixture)
        const res = await api()
            .delete('/api/amr-findings/1')
            .set('Cookie', authCookie())
        expect(res.status).toBe(200)
        expect(res.body.message).toMatch(/deleted successfully/i)
    })

    test('returns 404 if not found', async () => {
        const error = new Error('not found')
        error.code = 'P2025'
        mockPrismaAmrFinding.delete.mockRejectedValue(error)
        const res = await api()
            .delete('/api/amr-findings/999')
            .set('Cookie', authCookie())
        expect(res.status).toBe(404)
    })

    test('returns 500 on db error', async () => {
        mockPrismaAmrFinding.delete.mockRejectedValue(new Error('db down'))
        const res = await api()
            .delete('/api/amr-findings/1')
            .set('Cookie', authCookie())
        expect(res.status).toBe(500)
    })
})
