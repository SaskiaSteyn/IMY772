/**
 * Tests for POST /api/template-upload.
 * Prisma and template-parser are mocked.
 */

import {jest} from '@jest/globals'
import jwt from 'jsonwebtoken'

// ─── Mock prisma ─────────────────────────────────────────────────────────────
const mockTx = {
    sample: {upsert: jest.fn()},
    isolate: {createMany: jest.fn()},
    amrFinding: {createMany: jest.fn()},
    predictedPhenotype: {createMany: jest.fn()},
    virulenceGene: {createMany: jest.fn()},
}

const mockPrisma = {
    sample: {findMany: jest.fn()},
    $transaction: jest.fn(async (fn) => fn(mockTx)),
}

jest.unstable_mockModule('../lib/prisma.js', () => ({default: mockPrisma}))

// ─── Mock template-parser ────────────────────────────────────────────────────
const mockParseExcelTemplate = jest.fn()
jest.unstable_mockModule('../lib/template-parser.js', () => ({
    parseExcelTemplate: mockParseExcelTemplate,
}))

// ─── Lazy imports ───────────────────────────────────────────────────────────
const {default: express} = await import('express')
const cookieParser = (await import('cookie-parser')).default
const {default: supertest} = await import('supertest')
const {default: templateUploadRouter} = await import('../routes/template-upload.routes.js')

function buildApp() {
    const app = express()
    app.use(express.json())
    app.use(cookieParser())
    app.use('/api/template-upload', templateUploadRouter)
    return app
}

function api() {
    return supertest(buildApp())
}

const TEST_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me'
function signToken(payload = {userID: 1, role: 'admin'}) {
    return jwt.sign(payload, TEST_SECRET, {expiresIn: '1h'})
}
function authCookie() {
    return [`token=${signToken()}`]
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const sampleData = [
    {
        sample_id: 'S001',
        sample_name: 'River A',
        collected_by: 'Alice',
        latitude: 25.1,
        longitude: 28.2,
        water_temp: null,
        ph: null,
        tds: null,
        do: null,
        isolation_source: null,
        collection_date: null,
        location_name: null,
        isolates: [],
        amrFindings: [],
        predictedPhenotypes: [],
        virulenceGenes: [],
    },
]

describe('POST /api/template-upload', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockTx.sample.upsert.mockResolvedValue({})
        mockTx.isolate.createMany.mockResolvedValue({})
        mockTx.amrFinding.createMany.mockResolvedValue({})
        mockTx.predictedPhenotype.createMany.mockResolvedValue({})
        mockTx.virulenceGene.createMany.mockResolvedValue({})
    })

    test('returns 401 when not authenticated', async () => {
        const res = await api()
            .post('/api/template-upload')
            .attach('file', Buffer.from('data'), {filename: 'test.xlsx', contentType: XLSX_MIME})
        expect(res.status).toBe(401)
    })

    test('returns 400 when no file is uploaded', async () => {
        const res = await api()
            .post('/api/template-upload')
            .set('Cookie', authCookie())
        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(/no file/i)
    })

    test('returns 400 when file is not xlsx', async () => {
        const res = await api()
            .post('/api/template-upload')
            .set('Cookie', authCookie())
            .attach('file', Buffer.from('data'), {filename: 'test.csv', contentType: 'text/csv'})
        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(/xlsx/i)
    })

    test('returns 400 when parser throws', async () => {
        mockParseExcelTemplate.mockImplementation(() => {
            throw new Error('bad format')
        })
        const res = await api()
            .post('/api/template-upload')
            .set('Cookie', authCookie())
            .attach('file', Buffer.from('data'), {filename: 'test.xlsx', contentType: XLSX_MIME})
        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(/failed to parse template/i)
    })

    test('returns 400 when parsed file has no data rows', async () => {
        mockParseExcelTemplate.mockReturnValue([])
        const res = await api()
            .post('/api/template-upload')
            .set('Cookie', authCookie())
            .attach('file', Buffer.from('data'), {filename: 'test.xlsx', contentType: XLSX_MIME})
        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(/no data rows/i)
    })

    test('creates a new sample and returns 207 with created count', async () => {
        mockParseExcelTemplate.mockReturnValue(sampleData)
        mockPrisma.sample.findMany.mockResolvedValue([])

        const res = await api()
            .post('/api/template-upload')
            .set('Cookie', authCookie())
            .attach('file', Buffer.from('data'), {filename: 'test.xlsx', contentType: XLSX_MIME})

        expect(res.status).toBe(207)
        expect(res.body.results.createdCount).toBe(1)
        expect(res.body.results.updatedCount).toBe(0)
        expect(mockTx.sample.upsert).toHaveBeenCalled()
    })

    test('updates an existing sample and returns 207 with updated count', async () => {
        mockParseExcelTemplate.mockReturnValue(sampleData)
        mockPrisma.sample.findMany.mockResolvedValue([{sample_id: 'S001'}])

        const res = await api()
            .post('/api/template-upload')
            .set('Cookie', authCookie())
            .attach('file', Buffer.from('data'), {filename: 'test.xlsx', contentType: XLSX_MIME})

        expect(res.status).toBe(207)
        expect(res.body.results.updatedCount).toBe(1)
        expect(res.body.results.createdCount).toBe(0)
    })

    test('creates isolates, amrFindings, predictedPhenotypes and virulenceGenes for new samples', async () => {
        const richSample = {
            ...sampleData[0],
            isolates: [{organism: 'E. coli', mlst_type: 'ST131'}],
            amrFindings: [{gene_symbol: 'blaCTX-M', analysis_type: 'WGS', amr_class: null, subclass: null, sequence_name: null, element_type: null, target_length: null, reference_sequence_length: null, percentage_coverage: null, percent_identity: null, accession_of_closest_sequence: null}],
            predictedPhenotypes: [{organism: 'E. coli', antibiotic: null, predicted_sir_profile: 'Resistant'}],
            virulenceGenes: [{gene_symbol: 'hlyA'}],
        }
        mockParseExcelTemplate.mockReturnValue([richSample])
        mockPrisma.sample.findMany.mockResolvedValue([])

        const res = await api()
            .post('/api/template-upload')
            .set('Cookie', authCookie())
            .attach('file', Buffer.from('data'), {filename: 'test.xlsx', contentType: XLSX_MIME})

        expect(res.status).toBe(207)
        expect(mockTx.isolate.createMany).toHaveBeenCalled()
        expect(mockTx.amrFinding.createMany).toHaveBeenCalled()
        expect(mockTx.predictedPhenotype.createMany).toHaveBeenCalled()
        expect(mockTx.virulenceGene.createMany).toHaveBeenCalled()
    })

    test('records failure when transaction throws and returns it in results', async () => {
        mockParseExcelTemplate.mockReturnValue(sampleData)
        mockPrisma.sample.findMany.mockResolvedValue([])
        mockPrisma.$transaction.mockRejectedValue(new Error('tx failed'))

        const res = await api()
            .post('/api/template-upload')
            .set('Cookie', authCookie())
            .attach('file', Buffer.from('data'), {filename: 'test.xlsx', contentType: XLSX_MIME})

        expect(res.status).toBe(207)
        expect(res.body.results.failureCount).toBe(1)
        expect(res.body.results.errors[0].error).toMatch(/tx failed/)
    })
})
