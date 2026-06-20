/**
 * Tests for /api/virulence-genes routes.
 * Prisma is mocked.
 */

import {jest} from '@jest/globals'
import jwt from 'jsonwebtoken'

// ─── Mock prisma ─────────────────────────────────────────────────────────────
const mockPrismaVirulenceGene = {
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
        virulenceGene: mockPrismaVirulenceGene,
        sample: mockPrismaSample,
    },
}))

// ─── Lazy imports ───────────────────────────────────────────────────────────
const {default: express} = await import('express')
const cookieParser = (await import('cookie-parser')).default
const {default: supertest} = await import('supertest')
const {default: virulenceGenesRouter} = await import('../routes/virulence-genes.routes.js')

function buildApp() {
    const app = express()
    app.use(express.json())
    app.use(cookieParser())
    app.use('/api/virulence-genes', virulenceGenesRouter)
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

const sampleFixture = {sample_id: 'sample-1'}
const geneFixture = {
    virulence_gene_id: 1,
    sample_id: 'sample-1',
    gene_symbol: 'hlyA',
    method: 'BLAST',
    percent_identity: 99.0,
    coverage_percent: 100.0,
    alignment_length: 900,
    target_length: 900,
    ref_seq_length: 900,
    accession: 'ACC001',
    sequence_name: 'Hemolysin A',
    element_type: 'VIRULENCE',
}

// ─── POST /api/virulence-genes ───────────────────────────────────────────────
describe('POST /api/virulence-genes', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 400 when sample_id is missing', async () => {
        const res = await api()
            .post('/api/virulence-genes')
            .set('Cookie', authCookie())
            .send({gene_symbol: 'hlyA'})
        expect(res.status).toBe(400)
        expect(res.body.errors).toBeDefined()
    })

    test('returns 400 when gene_symbol is missing', async () => {
        const res = await api()
            .post('/api/virulence-genes')
            .set('Cookie', authCookie())
            .send({sample_id: 'sample-1'})
        expect(res.status).toBe(400)
        expect(res.body.errors).toBeDefined()
    })

    test('returns 404 when sample does not exist', async () => {
        mockPrismaSample.findUnique.mockResolvedValue(null)
        const res = await api()
            .post('/api/virulence-genes')
            .set('Cookie', authCookie())
            .send({sample_id: 'nonexistent', gene_symbol: 'hlyA'})
        expect(res.status).toBe(404)
        expect(res.body.message).toMatch(/sample not found/i)
    })

    test('returns 201 and creates virulence gene on success', async () => {
        mockPrismaSample.findUnique.mockResolvedValue(sampleFixture)
        mockPrismaVirulenceGene.create.mockResolvedValue(geneFixture)

        const res = await api()
            .post('/api/virulence-genes')
            .set('Cookie', authCookie())
            .send({
                sample_id: 'sample-1',
                gene_symbol: 'hlyA',
                method: 'BLAST',
                percent_identity: 99.0,
                coverage_percent: 100.0,
                alignment_length: 900,
                target_length: 900,
                ref_seq_length: 900,
                accession: 'ACC001',
                sequence_name: 'Hemolysin A',
                element_type: 'VIRULENCE',
            })

        expect(res.status).toBe(201)
        expect(res.body.virulenceGene).toEqual(geneFixture)
    })

    test('returns 400 on P2003 foreign key error', async () => {
        mockPrismaSample.findUnique.mockResolvedValue(sampleFixture)
        const err = new Error('fk')
        err.code = 'P2003'
        mockPrismaVirulenceGene.create.mockRejectedValue(err)
        const res = await api()
            .post('/api/virulence-genes')
            .set('Cookie', authCookie())
            .send({sample_id: 'sample-1', gene_symbol: 'hlyA'})
        expect(res.status).toBe(400)
    })

    test('returns 500 on unexpected database error', async () => {
        mockPrismaSample.findUnique.mockRejectedValue(new Error('db down'))
        const res = await api()
            .post('/api/virulence-genes')
            .set('Cookie', authCookie())
            .send({sample_id: 'sample-1', gene_symbol: 'hlyA'})
        expect(res.status).toBe(500)
    })
})

// ─── GET /api/virulence-genes ────────────────────────────────────────────────
describe('GET /api/virulence-genes', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 200 and array of virulence genes', async () => {
        mockPrismaVirulenceGene.findMany.mockResolvedValue([geneFixture])
        const res = await api().get('/api/virulence-genes')
        expect(res.status).toBe(200)
        expect(res.body.virulenceGenes).toHaveLength(1)
        expect(res.body.virulenceGenes[0].virulence_gene_id).toBe(1)
    })

    test('returns 500 on database error', async () => {
        mockPrismaVirulenceGene.findMany.mockRejectedValue(new Error('db down'))
        const res = await api().get('/api/virulence-genes')
        expect(res.status).toBe(500)
    })
})

// ─── GET /api/virulence-genes/sample/:sample_id ──────────────────────────────
describe('GET /api/virulence-genes/sample/:sample_id', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 200 and genes for given sample', async () => {
        mockPrismaVirulenceGene.findMany.mockResolvedValue([geneFixture])
        const res = await api().get('/api/virulence-genes/sample/sample-1')
        expect(res.status).toBe(200)
        expect(res.body.virulenceGenes).toEqual([geneFixture])
        expect(mockPrismaVirulenceGene.findMany).toHaveBeenCalledWith({
            where: {sample_id: 'sample-1'},
            include: {sample: true},
        })
    })

    test('returns 500 on database error', async () => {
        mockPrismaVirulenceGene.findMany.mockRejectedValue(new Error('db down'))
        const res = await api().get('/api/virulence-genes/sample/sample-1')
        expect(res.status).toBe(500)
    })
})

// ─── GET /api/virulence-genes/:virulence_gene_id ─────────────────────────────
describe('GET /api/virulence-genes/:virulence_gene_id', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 400 when virulence_gene_id is not an integer', async () => {
        const res = await api().get('/api/virulence-genes/abc')
        expect(res.status).toBe(400)
    })

    test('returns 404 when gene not found', async () => {
        mockPrismaVirulenceGene.findUnique.mockResolvedValue(null)
        const res = await api().get('/api/virulence-genes/999')
        expect(res.status).toBe(404)
        expect(res.body.message).toMatch(/not found/i)
    })

    test('returns 200 and gene when found', async () => {
        mockPrismaVirulenceGene.findUnique.mockResolvedValue(geneFixture)
        const res = await api().get('/api/virulence-genes/1')
        expect(res.status).toBe(200)
        expect(res.body.virulenceGene).toEqual(geneFixture)
    })

    test('returns 500 on database error', async () => {
        mockPrismaVirulenceGene.findUnique.mockRejectedValue(new Error('db down'))
        const res = await api().get('/api/virulence-genes/1')
        expect(res.status).toBe(500)
    })
})

// ─── PUT /api/virulence-genes/:virulence_gene_id ─────────────────────────────
describe('PUT /api/virulence-genes/:virulence_gene_id', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 401 when not authenticated', async () => {
        const res = await api().put('/api/virulence-genes/1').send({gene_symbol: 'stx1'})
        expect(res.status).toBe(401)
    })

    test('returns 400 when virulence_gene_id is not an integer', async () => {
        const res = await api()
            .put('/api/virulence-genes/abc')
            .set('Cookie', authCookie())
            .send({gene_symbol: 'stx1'})
        expect(res.status).toBe(400)
    })

    test('updates gene_symbol successfully', async () => {
        const updated = {...geneFixture, gene_symbol: 'stx1'}
        mockPrismaVirulenceGene.update.mockResolvedValue(updated)

        const res = await api()
            .put('/api/virulence-genes/1')
            .set('Cookie', authCookie())
            .send({gene_symbol: 'stx1'})

        expect(res.status).toBe(200)
        expect(res.body.virulenceGene.gene_symbol).toBe('stx1')
        expect(mockPrismaVirulenceGene.update).toHaveBeenCalledWith({
            where: {virulence_gene_id: 1},
            data: {gene_symbol: 'stx1'},
        })
    })

    test('updates multiple optional numeric fields', async () => {
        const updated = {...geneFixture, percent_identity: 95.5, coverage_percent: 98.0, alignment_length: 850, target_length: 860, ref_seq_length: 870}
        mockPrismaVirulenceGene.update.mockResolvedValue(updated)

        const res = await api()
            .put('/api/virulence-genes/1')
            .set('Cookie', authCookie())
            .send({percent_identity: 95.5, coverage_percent: 98.0, alignment_length: 850, target_length: 860, ref_seq_length: 870})

        expect(res.status).toBe(200)
    })

    test('returns 404 when gene not found', async () => {
        const err = new Error('not found')
        err.code = 'P2025'
        mockPrismaVirulenceGene.update.mockRejectedValue(err)

        const res = await api()
            .put('/api/virulence-genes/999')
            .set('Cookie', authCookie())
            .send({gene_symbol: 'stx1'})
        expect(res.status).toBe(404)
    })

    test('returns 500 on unexpected error', async () => {
        mockPrismaVirulenceGene.update.mockRejectedValue(new Error('db down'))
        const res = await api()
            .put('/api/virulence-genes/1')
            .set('Cookie', authCookie())
            .send({method: 'PCR'})
        expect(res.status).toBe(500)
    })
})

// ─── DELETE /api/virulence-genes/:virulence_gene_id ──────────────────────────
describe('DELETE /api/virulence-genes/:virulence_gene_id', () => {
    beforeEach(() => jest.clearAllMocks())

    test('returns 401 when not authenticated', async () => {
        const res = await api().delete('/api/virulence-genes/1')
        expect(res.status).toBe(401)
    })

    test('returns 400 when virulence_gene_id is not an integer', async () => {
        const res = await api()
            .delete('/api/virulence-genes/abc')
            .set('Cookie', authCookie())
        expect(res.status).toBe(400)
    })

    test('deletes gene successfully', async () => {
        mockPrismaVirulenceGene.delete.mockResolvedValue(geneFixture)

        const res = await api()
            .delete('/api/virulence-genes/1')
            .set('Cookie', authCookie())

        expect(res.status).toBe(200)
        expect(res.body.message).toMatch(/deleted successfully/i)
        expect(mockPrismaVirulenceGene.delete).toHaveBeenCalledWith({
            where: {virulence_gene_id: 1},
        })
    })

    test('returns 404 when gene not found', async () => {
        const err = new Error('not found')
        err.code = 'P2025'
        mockPrismaVirulenceGene.delete.mockRejectedValue(err)

        const res = await api()
            .delete('/api/virulence-genes/999')
            .set('Cookie', authCookie())
        expect(res.status).toBe(404)
    })

    test('returns 500 on database error', async () => {
        mockPrismaVirulenceGene.delete.mockRejectedValue(new Error('db down'))
        const res = await api()
            .delete('/api/virulence-genes/1')
            .set('Cookie', authCookie())
        expect(res.status).toBe(500)
    })
})
