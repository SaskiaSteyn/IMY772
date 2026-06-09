/**
 * Tests for /api/admin routes.
 * All endpoints require authentication + admin role.
 */

import {jest} from '@jest/globals'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

// ─── Mock Prisma with all methods used by admin routes ──────────────────────
const mockPrisma = {
    user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        findFirst: jest.fn(),
    },
    sample: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        findFirst: jest.fn(),
    },
    isolate: {
        findMany: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
    },
    amrFinding: {
        findMany: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
    },
    predictedPhenotype: {
        findMany: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
    },
    adminDeleteAudit: {
        create: jest.fn(),
        findMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
}

jest.unstable_mockModule('../lib/prisma.js', () => ({
    default: mockPrisma,
}))

jest.unstable_mockModule('bcryptjs', () => ({
    default: {
        hash: jest.fn((pass, rounds) => Promise.resolve(`hashed-${pass}`)),
        compare: jest.fn((plain, hash) => Promise.resolve(plain === 'correctpassword')),
    },
}))

// ─── Lazy imports ───────────────────────────────────────────────────────────
const {default: express} = await import('express')
const cookieParser = (await import('cookie-parser')).default
const {default: supertest} = await import('supertest')
const {default: adminRouter} = await import('../routes/admin.routes.js')

const TEST_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me'

function buildApp() {
    const app = express()
    app.use(express.json())
    app.use(cookieParser())
    app.use('/api/admin', adminRouter)
    return app
}

function api() {
    return supertest(buildApp())
}

function signToken(payload) {
    return jwt.sign(payload, TEST_SECRET, {expiresIn: '1h'})
}

function authCookie(role = 'admin') {
    const payload = {userID: 1, email: 'admin@example.com', role}
    return [`token=${signToken(payload)}`]
}

// ─── Fixtures ───────────────────────────────────────────────────────────────
const userFixture = {
    userID: 1,
    name: 'Admin',
    surname: 'User',
    email: 'admin@example.com',
    role: 'admin',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString(),
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
    collection_date: new Date('2024-01-15'),
    location_name: 'Test River',
    uploaded_by: 1,
    created_at: new Date(),
    updated_at: new Date(),
}

const isolateFixture = {isolate_id: 1, sample_id: 'SAMPLE-001', organism: 'E. coli', mlst_type: 'ST131'}
const amrFixture = {finding_id: 1, sample_id: 'SAMPLE-001', analysis_type: 'WGS', gene_symbol: 'blaCTX-M'}
const phenotypeFixture = {phenotype_id: 1, sample_id: 'SAMPLE-001', organism: 'E. coli', antibiotic: 'Cipro', resistant: true}

beforeEach(() => {
    jest.clearAllMocks()
})

// ─── Middleware protection (non-admin) ──────────────────────────────────────
describe('Admin routes – authentication & authorization', () => {
    test('returns 403 when user is not admin', async () => {
        const res = await api()
            .get('/api/admin/users')
            .set('Cookie', authCookie('user'))
        expect(res.status).toBe(403)
    })

    test('returns 401 when no token', async () => {
        const res = await api().get('/api/admin/users')
        expect(res.status).toBe(401)
    })
})

// ─── User CRUD ──────────────────────────────────────────────────────────────
describe('Admin – User CRUD', () => {
    beforeEach(() => {
        // Default mocks – findUnique returns null (user not found) unless overridden
        mockPrisma.user.findMany.mockResolvedValue([userFixture])
        mockPrisma.user.findUnique.mockResolvedValue(null)
        mockPrisma.user.create.mockResolvedValue(userFixture)
        mockPrisma.user.update.mockResolvedValue(userFixture)
        mockPrisma.user.delete.mockResolvedValue(userFixture)
    })

    test('GET /users – returns list of users', async () => {
        const res = await api()
            .get('/api/admin/users')
            .set('Cookie', authCookie())
        expect(res.status).toBe(200)
        expect(res.body.users).toHaveLength(1)
        expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
            orderBy: {userID: 'asc'},
            select: expect.objectContaining({userID: true, email: true}),
        })
    })

    test('GET /users/:id – returns single user', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(userFixture)
        const res = await api()
            .get('/api/admin/users/1')
            .set('Cookie', authCookie())
        expect(res.status).toBe(200)
        expect(res.body.user.userID).toBe(1)
    })

    test('GET /users/:id – 400 for invalid id', async () => {
        const res = await api()
            .get('/api/admin/users/abc')
            .set('Cookie', authCookie())
        expect(res.status).toBe(400)
    })

    test('GET /users/:id – 404 not found', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null)
        const res = await api()
            .get('/api/admin/users/999')
            .set('Cookie', authCookie())
        expect(res.status).toBe(404)
    })

    test('POST /users – creates user with valid data', async () => {
        // No existing user with this email
        mockPrisma.user.findUnique.mockResolvedValue(null)
        const newUser = {name: 'New', surname: 'User', email: 'new@example.com', password: 'password123'}
        const res = await api()
            .post('/api/admin/users')
            .set('Cookie', authCookie())
            .send(newUser)
        expect(res.status).toBe(201)
        expect(mockPrisma.user.create).toHaveBeenCalled()
    })

    test('POST /users – 400 missing required fields', async () => {
        const res = await api()
            .post('/api/admin/users')
            .set('Cookie', authCookie())
            .send({name: 'OnlyName'})
        expect(res.status).toBe(400)
    })

    test('POST /users – 400 password too short', async () => {
        const res = await api()
            .post('/api/admin/users')
            .set('Cookie', authCookie())
            .send({name: 'A', surname: 'B', email: 'test@ex.com', password: 'short'})
        expect(res.status).toBe(400)
    })

    test('POST /users – 409 email exists', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({userID: 2})
        const res = await api()
            .post('/api/admin/users')
            .set('Cookie', authCookie())
            .send({name: 'A', surname: 'B', email: 'exists@ex.com', password: 'longenough123'})
        expect(res.status).toBe(409)
    })

    test('PUT /users/:id – updates user', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({userID: 1, email: 'admin@example.com'})
        const res = await api()
            .put('/api/admin/users/1')
            .set('Cookie', authCookie())
            .send({name: 'UpdatedName'})
        expect(res.status).toBe(200)
        expect(mockPrisma.user.update).toHaveBeenCalled()
    })

    test('PUT /users/:id – 400 invalid id', async () => {
        const res = await api()
            .put('/api/admin/users/abc')
            .set('Cookie', authCookie())
            .send({name: 'X'})
        expect(res.status).toBe(400)
    })

    test('PUT /users/:id – 404 not found', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null)
        const res = await api()
            .put('/api/admin/users/999')
            .set('Cookie', authCookie())
            .send({name: 'X'})
        expect(res.status).toBe(404)
    })

    test('DELETE /users/:id – requires reason and cannot delete self', async () => {
        const res = await api()
            .delete('/api/admin/users/1')
            .set('Cookie', authCookie())
            .send({reason: 'test deletion'})
        expect(res.status).toBe(400) // cannot delete own account
        expect(res.body.message).toMatch(/cannot delete your own/)
    })

    test('DELETE /users/:id – success for another user', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({userID: 2, email: 'other@ex.com'})
        mockPrisma.sample.findMany.mockResolvedValue([])
        mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma))
        const res = await api()
            .delete('/api/admin/users/2')
            .set('Cookie', authCookie())
            .send({reason: 'valid reason'})
        expect(res.status).toBe(200)
        expect(mockPrisma.adminDeleteAudit.create).toHaveBeenCalled()
    })

    test('DELETE /users/:id – 400 missing reason', async () => {
        const res = await api()
            .delete('/api/admin/users/2')
            .set('Cookie', authCookie())
            .send({})
        expect(res.status).toBe(400)
    })
})

// ─── Water samples CRUD ─────────────────────────────────────────────────────
describe('Admin – Water Samples CRUD', () => {
    beforeEach(() => {
        mockPrisma.sample.findMany.mockResolvedValue([sampleFixture])
        mockPrisma.sample.findUnique.mockResolvedValue(sampleFixture)
        mockPrisma.sample.create.mockResolvedValue(sampleFixture)
        mockPrisma.sample.update.mockResolvedValue(sampleFixture)
        mockPrisma.sample.delete.mockResolvedValue(sampleFixture)
        mockPrisma.isolate.create.mockResolvedValue(isolateFixture)
        mockPrisma.amrFinding.create.mockResolvedValue(amrFixture)
        mockPrisma.predictedPhenotype.create.mockResolvedValue(phenotypeFixture)
        mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma))
    })

    test('GET /water/samples – returns list with _rowId', async () => {
        const res = await api()
            .get('/api/admin/water/samples')
            .set('Cookie', authCookie())
        expect(res.status).toBe(200)
        expect(res.body.rows).toHaveLength(1)
        expect(res.body.rows[0]._rowId).toBeDefined()
    })

    test('POST /water/samples – creates sample with nested relations', async () => {
        const payload = {
            sample_id: 'NEW-001',
            latitude: 25.12,
            longitude: 28.45,
            isolates: [{organism: 'E. coli'}],
            amrFindings: [{gene_symbol: 'bla'}],
            predictedPhenotypes: [{organism: 'E. coli', antibiotic: 'AMP', resistant: true}],
        }
        const res = await api()
            .post('/api/admin/water/samples')
            .set('Cookie', authCookie())
            .send(payload)
        expect(res.status).toBe(201)
        expect(mockPrisma.sample.create).toHaveBeenCalled()
        expect(mockPrisma.isolate.create).toHaveBeenCalled()
        expect(mockPrisma.amrFinding.create).toHaveBeenCalled()
        expect(mockPrisma.predictedPhenotype.create).toHaveBeenCalled()
    })

    test('POST /water/samples – 400 missing required fields', async () => {
        const res = await api()
            .post('/api/admin/water/samples')
            .set('Cookie', authCookie())
            .send({latitude: 25})
        expect(res.status).toBe(400)
    })

    test('PUT /water/samples/:sample_id – updates sample', async () => {
        const res = await api()
            .put('/api/admin/water/samples/SAMPLE-001')
            .set('Cookie', authCookie())
            .send({ph: 8.0})
        expect(res.status).toBe(200)
        expect(mockPrisma.sample.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {sample_id: 'SAMPLE-001'},
                data: expect.objectContaining({ph: 8.0}),
            })
        )
    })

    test('DELETE /water/samples/:sample_id – requires reason', async () => {
        const res = await api()
            .delete('/api/admin/water/samples/SAMPLE-001')
            .set('Cookie', authCookie())
            .send({reason: 'valid deletion reason'})
        expect(res.status).toBe(200)
        expect(mockPrisma.adminDeleteAudit.create).toHaveBeenCalled()
    })

    test('DELETE /water/samples/:sample_id – 400 missing reason', async () => {
        const res = await api()
            .delete('/api/admin/water/samples/SAMPLE-001')
            .set('Cookie', authCookie())
            .send({})
        expect(res.status).toBe(400)
    })
})

// ─── Generic entity endpoints (/data/:entity) ───────────────────────────────
describe('Admin – Generic entity CRUD', () => {
    beforeEach(() => {
        // samples
        mockPrisma.sample.findMany.mockResolvedValue([sampleFixture])
        mockPrisma.sample.create.mockResolvedValue(sampleFixture)
        mockPrisma.sample.updateMany.mockResolvedValue({count: 1})
        mockPrisma.sample.findFirst.mockResolvedValue(sampleFixture)
        mockPrisma.sample.deleteMany.mockResolvedValue({count: 1})
        // isolates
        mockPrisma.isolate.findMany.mockResolvedValue([isolateFixture])
        mockPrisma.isolate.create.mockResolvedValue(isolateFixture)
        mockPrisma.isolate.updateMany.mockResolvedValue({count: 1})
        mockPrisma.isolate.findFirst.mockResolvedValue(isolateFixture)
        mockPrisma.isolate.deleteMany.mockResolvedValue({count: 1})
        // amr_findings
        mockPrisma.amrFinding.findMany.mockResolvedValue([amrFixture])
        mockPrisma.amrFinding.create.mockResolvedValue(amrFixture)
        mockPrisma.amrFinding.updateMany.mockResolvedValue({count: 1})
        mockPrisma.amrFinding.findFirst.mockResolvedValue(amrFixture)
        mockPrisma.amrFinding.deleteMany.mockResolvedValue({count: 1})
        // predicted_phenotypes
        mockPrisma.predictedPhenotype.findMany.mockResolvedValue([phenotypeFixture])
        mockPrisma.predictedPhenotype.create.mockResolvedValue(phenotypeFixture)
        mockPrisma.predictedPhenotype.updateMany.mockResolvedValue({count: 1})
        mockPrisma.predictedPhenotype.findFirst.mockResolvedValue(phenotypeFixture)
        mockPrisma.predictedPhenotype.deleteMany.mockResolvedValue({count: 1})

        mockPrisma.adminDeleteAudit.create.mockResolvedValue({})
    })

    const entities = ['samples', 'isolates', 'amr_findings', 'predicted_phenotypes']

    test.each(entities)('GET /data/%s – returns rows with _rowId', async (entity) => {
        const res = await api()
            .get(`/api/admin/data/${entity}`)
            .set('Cookie', authCookie())
        expect(res.status).toBe(200)
        expect(res.body.rows).toHaveLength(1)
        expect(res.body.rows[0]._rowId).toBeDefined()
    })

    test.each(entities)('POST /data/%s – creates record', async (entity) => {
        const payload = entity === 'samples'
            ? {sample_id: 'NEW', latitude: 10, longitude: 20, uploaded_by: 1}
            : entity === 'isolates'
                ? {sample_id: 'SAMPLE-001', organism: 'Test'}
                : entity === 'amr_findings'
                    ? {sample_id: 'SAMPLE-001', gene_symbol: 'bla'}
                    : {sample_id: 'SAMPLE-001', organism: 'E. coli', antibiotic: 'AMP', resistant: true};

        const res = await api()
            .post(`/api/admin/data/${entity}`)
            .set('Cookie', authCookie())
            .send(payload)
        expect(res.status).toBe(201)
    })

    test('PUT /data/samples/:rowId – updates using encoded rowId', async () => {
        const rowId = Buffer.from(JSON.stringify({sample_id: 'SAMPLE-001'}), 'utf8').toString('base64url')
        const res = await api()
            .put(`/api/admin/data/samples/${rowId}`)
            .set('Cookie', authCookie())
            .send({ph: 8.2})
        expect(res.status).toBe(200)
        expect(mockPrisma.sample.updateMany).toHaveBeenCalledWith(
            {where: {sample_id: 'SAMPLE-001'}, data: {ph: 8.2}}
        )
    })

    test('PUT /data/samples/:rowId – 400 invalid rowId', async () => {
        const res = await api()
            .put('/api/admin/data/samples/invalid-id')
            .set('Cookie', authCookie())
            .send({ph: 8.2})
        expect(res.status).toBe(400)
    })

    test('DELETE /data/samples/:rowId – requires reason', async () => {
        const rowId = Buffer.from(JSON.stringify({sample_id: 'SAMPLE-001'}), 'utf8').toString('base64url')
        const res = await api()
            .delete(`/api/admin/data/samples/${rowId}`)
            .set('Cookie', authCookie())
            .send({reason: 'cleanup'})
        expect(res.status).toBe(200)
        expect(mockPrisma.sample.deleteMany).toHaveBeenCalledWith({where: {sample_id: 'SAMPLE-001'}})
        expect(mockPrisma.adminDeleteAudit.create).toHaveBeenCalled()
    })

    test('DELETE /data/samples/:rowId – 400 missing reason', async () => {
        const rowId = Buffer.from(JSON.stringify({sample_id: 'SAMPLE-001'}), 'utf8').toString('base64url')
        const res = await api()
            .delete(`/api/admin/data/samples/${rowId}`)
            .set('Cookie', authCookie())
            .send({})
        expect(res.status).toBe(400)
    })

    test('GET /data/unknown – 404', async () => {
        const res = await api()
            .get('/api/admin/data/unknown')
            .set('Cookie', authCookie())
        expect(res.status).toBe(404)
    })
})

// ─── Summary endpoint ───────────────────────────────────────────────────────
describe('Admin – Summary endpoint', () => {
    test('GET /summary – returns metrics and recent deletions', async () => {
        mockPrisma.user.count.mockResolvedValue(10)
        mockPrisma.sample.count.mockResolvedValue(42)
        mockPrisma.isolate.count.mockResolvedValue(100)
        mockPrisma.amrFinding.count.mockResolvedValue(55)
        mockPrisma.predictedPhenotype.count.mockResolvedValue(77)
        mockPrisma.adminDeleteAudit.findMany.mockResolvedValue([
            {id: 1, actorUserID: 1, entityType: 'user', created_at: new Date()},
        ])

        const res = await api()
            .get('/api/admin/summary')
            .set('Cookie', authCookie())
        expect(res.status).toBe(200)
        expect(res.body.metrics.usersCount).toBe(10)
        expect(res.body.metrics.samplesCount).toBe(42)
        expect(res.body.recentDeletions).toHaveLength(1)
    })

    test('GET /summary – handles errors gracefully', async () => {
        mockPrisma.user.count.mockRejectedValue(new Error('db down'))
        const res = await api()
            .get('/api/admin/summary')
            .set('Cookie', authCookie())
        expect(res.status).toBe(500)
    })
})