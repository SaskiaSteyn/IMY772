/**
 * Tests for /api/isolates routes.
 * Prisma is mocked.
 */

import {jest} from '@jest/globals'
import jwt from 'jsonwebtoken'

// ─── Mock prisma ─────────────────────────────────────────────────────────────
const mockPrismaIsolate = {
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
        isolate: mockPrismaIsolate,
        sample: mockPrismaSample,
    },
}))

// ─── Lazy imports ───────────────────────────────────────────────────────────
const {default: express} = await import('express')
const cookieParser = (await import('cookie-parser')).default
const {default: supertest} = await import('supertest')
const {default: isolatesRouter} = await import('../routes/isolates.routes.js')

// ─── Test app builder ───────────────────────────────────────────────────────
function buildApp() {
    const app = express()
    app.use(express.json())
    app.use(cookieParser())
    app.use('/api/isolates', isolatesRouter)
    return app
}

function api() {
    return supertest(buildApp())
}

const TEST_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me'
function signToken(payload = {userID: 1, role: 'user', email: 'user@example.com'}) {
    return jwt.sign(payload, TEST_SECRET, {expiresIn: '1h'})
}
function authCookie() {
    return [`token=${signToken()}`]
}

// ─── Fixtures ───────────────────────────────────────────────────────────────
const sampleFixture = {sample_id: 'sample-1'}
const isolateFixture = {
    isolate_id: 1,
    sample_id: 'sample-1',
    organism: 'E. coli',
    mlst_type: 'ST131',
}

// ─── POST /api/isolates ─────────────────────────────────────────────────────
describe('POST /api/isolates', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 400 when sample_id is missing', async () => {
        const res = await api()
            .post('/api/isolates')
            .set('Cookie', authCookie())
            .send({organism: 'E. coli'})
        expect(res.status).toBe(400)
        expect(res.body.errors).toBeDefined()
    })

    test('returns 404 when sample does not exist', async () => {
        mockPrismaSample.findUnique.mockResolvedValue(null)

        const res = await api()
            .post('/api/isolates')
            .set('Cookie', authCookie())
            .send({sample_id: 'nonexistent'})
        expect(res.status).toBe(404)
        expect(res.body.message).toMatch(/sample not found/i)
    })

    test('returns 201 and creates isolate on success', async () => {
        mockPrismaSample.findUnique.mockResolvedValue(sampleFixture)
        mockPrismaIsolate.create.mockResolvedValue(isolateFixture)

        const res = await api()
            .post('/api/isolates')
            .set('Cookie', authCookie())
            .send({
                sample_id: 'sample-1',
                organism: 'E. coli',
                mlst_type: 'ST131',
            })

        expect(res.status).toBe(201)
        expect(res.body.isolate).toEqual(isolateFixture)
        expect(mockPrismaIsolate.create).toHaveBeenCalledWith({
            data: {
                sample_id: 'sample-1',
                organism: 'E. coli',
                mlst_type: 'ST131',
            },
        })
    })

    test('returns 500 on database error', async () => {
        mockPrismaSample.findUnique.mockRejectedValue(new Error('db down'))

        const res = await api()
            .post('/api/isolates')
            .set('Cookie', authCookie())
            .send({sample_id: 'sample-1'})
        expect(res.status).toBe(500)
        expect(res.body.message).toMatch(/failed to create isolate/i)
    })
})

// ─── GET /api/isolates ──────────────────────────────────────────────────────
describe('GET /api/isolates', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 200 and array of isolates', async () => {
        mockPrismaIsolate.findMany.mockResolvedValue([isolateFixture])

        const res = await api().get('/api/isolates')
        expect(res.status).toBe(200)
        expect(res.body.isolates).toHaveLength(1)
        expect(res.body.isolates[0].isolate_id).toBe(1)
    })

    test('returns 500 on error', async () => {
        mockPrismaIsolate.findMany.mockRejectedValue(new Error('db down'))
        const res = await api().get('/api/isolates')
        expect(res.status).toBe(500)
    })
})

// ─── GET /api/isolates/sample/:sample_id ────────────────────────────────────
describe('GET /api/isolates/sample/:sample_id', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 200 and isolates for given sample', async () => {
        mockPrismaIsolate.findMany.mockResolvedValue([isolateFixture])

        const res = await api().get('/api/isolates/sample/sample-1')
        expect(res.status).toBe(200)
        expect(res.body.isolates).toEqual([isolateFixture])
        expect(mockPrismaIsolate.findMany).toHaveBeenCalledWith({
            where: {sample_id: 'sample-1'},
            include: {sample: true},
        })
    })

    test('returns 500 on database error', async () => {
        mockPrismaIsolate.findMany.mockRejectedValue(new Error('db down'))
        const res = await api().get('/api/isolates/sample/sample-1')
        expect(res.status).toBe(500)
    })
})

// ─── GET /api/isolates/:isolate_id ──────────────────────────────────────────
describe('GET /api/isolates/:isolate_id', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 400 when isolate_id is not an integer', async () => {
        const res = await api().get('/api/isolates/abc')
        expect(res.status).toBe(400)
    })

    test('returns 404 when isolate not found', async () => {
        mockPrismaIsolate.findUnique.mockResolvedValue(null)

        const res = await api().get('/api/isolates/999')
        expect(res.status).toBe(404)
    })

    test('returns 200 and isolate when found', async () => {
        mockPrismaIsolate.findUnique.mockResolvedValue(isolateFixture)

        const res = await api().get('/api/isolates/1')
        expect(res.status).toBe(200)
        expect(res.body.isolate).toEqual(isolateFixture)
    })

    test('returns 500 on database error', async () => {
        mockPrismaIsolate.findUnique.mockRejectedValue(new Error('db down'))
        const res = await api().get('/api/isolates/1')
        expect(res.status).toBe(500)
    })
})

// ─── PUT /api/isolates/:isolate_id ──────────────────────────────────────────
describe('PUT /api/isolates/:isolate_id', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 401 when not authenticated', async () => {
        const res = await api().put('/api/isolates/1').send({mlst_type: 'ST42'})
        expect(res.status).toBe(401)
    })

    test('returns 400 when isolate_id is not an integer', async () => {
        const res = await api()
            .put('/api/isolates/abc')
            .set('Cookie', authCookie())
            .send({mlst_type: 'ST42'})
        expect(res.status).toBe(400)
    })

    test('updates mlst_type (last field) successfully', async () => {
        const updated = {...isolateFixture, mlst_type: 'ST42'}
        mockPrismaIsolate.update.mockResolvedValue(updated)

        const res = await api()
            .put('/api/isolates/1')
            .set('Cookie', authCookie())
            .send({mlst_type: 'ST42'})

        expect(res.status).toBe(200)
        expect(res.body.isolate.mlst_type).toBe('ST42')
        expect(mockPrismaIsolate.update).toHaveBeenCalledWith({
            where: {isolate_id: 1},
            data: {mlst_type: 'ST42'},
        })
    })

    test('returns 404 when isolate not found', async () => {
        const error = new Error('not found')
        error.code = 'P2025'
        mockPrismaIsolate.update.mockRejectedValue(error)

        const res = await api()
            .put('/api/isolates/999')
            .set('Cookie', authCookie())
            .send({organism: 'Klebsiella'})
        expect(res.status).toBe(404)
    })

    test('returns 500 on unexpected error', async () => {
        mockPrismaIsolate.update.mockRejectedValue(new Error('db down'))
        const res = await api()
            .put('/api/isolates/1')
            .set('Cookie', authCookie())
            .send({organism: 'New'})
        expect(res.status).toBe(500)
    })
})

// ─── DELETE /api/isolates/:isolate_id ───────────────────────────────────────
describe('DELETE /api/isolates/:isolate_id', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 401 when not authenticated', async () => {
        const res = await api().delete('/api/isolates/1')
        expect(res.status).toBe(401)
    })

    test('returns 400 when isolate_id is not an integer', async () => {
        const res = await api()
            .delete('/api/isolates/abc')
            .set('Cookie', authCookie())
        expect(res.status).toBe(400)
    })

    test('returns 200 and deletes isolate', async () => {
        mockPrismaIsolate.delete.mockResolvedValue(isolateFixture)

        const res = await api()
            .delete('/api/isolates/1')
            .set('Cookie', authCookie())

        expect(res.status).toBe(200)
        expect(res.body.message).toMatch(/deleted successfully/i)
        expect(mockPrismaIsolate.delete).toHaveBeenCalledWith({
            where: {isolate_id: 1},
        })
    })

    test('returns 404 when isolate not found', async () => {
        const error = new Error('not found')
        error.code = 'P2025'
        mockPrismaIsolate.delete.mockRejectedValue(error)

        const res = await api()
            .delete('/api/isolates/999')
            .set('Cookie', authCookie())
        expect(res.status).toBe(404)
    })

    test('returns 500 on database error', async () => {
        mockPrismaIsolate.delete.mockRejectedValue(new Error('db down'))
        const res = await api()
            .delete('/api/isolates/1')
            .set('Cookie', authCookie())
        expect(res.status).toBe(500)
    })
})