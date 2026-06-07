/**
 * Tests for the /api/ai routes (natural-language filter endpoint).
 *
 * Strategy:
 *  - Mock global.fetch to control Gemini API responses without hitting the network.
 *  - Test every branch: missing query, Gemini success, Gemini error/fallback, local
 *    regex parser paths, and the "could not interpret" fallback.
 */

import { jest } from '@jest/globals'

// ─── Mock global fetch BEFORE importing the router ───────────────────────────

const mockFetch = jest.fn()
global.fetch = mockFetch

// ─── Lazy imports ─────────────────────────────────────────────────────────────

const { default: express } = await import('express')
const { default: supertest } = await import('supertest')
const { default: aiRouter } = await import('../routes/ai.routes.js')

// ─── Build minimal test app ───────────────────────────────────────────────────

function buildApp() {
    const app = express()
    app.use(express.json())
    app.use('/api/ai', aiRouter)
    return app
}

function api() {
    return supertest(buildApp())
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fake a successful Gemini response returning the given filter spec JSON. */
function mockGeminiSuccess(filterSpec) {
    mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
            candidates: [
                {
                    content: {
                        parts: [{ text: JSON.stringify(filterSpec) }],
                    },
                },
            ],
        }),
    })
}

/** Fake a Gemini HTTP error (e.g. 429 quota exceeded). */
function mockGeminiError(status = 429, body = 'quota exceeded') {
    mockFetch.mockResolvedValueOnce({
        ok: false,
        status,
        text: async () => body,
    })
}

/** Fake a network-level fetch rejection. */
function mockGeminiNetworkFailure() {
    mockFetch.mockRejectedValueOnce(new Error('network error'))
}

beforeEach(() => {
    mockFetch.mockReset()
    // Remove key by default so tests that want Gemini can set it explicitly
    delete process.env.GEMINI_API_KEY
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/ai/filter — validation', () => {
    test('returns 400 when query is missing', async () => {
        const res = await api().post('/api/ai/filter').send({})
        expect(res.status).toBe(400)
        expect(res.body.error).toMatch(/query is required/i)
    })

    test('returns 400 when query is not a string', async () => {
        const res = await api().post('/api/ai/filter').send({ query: 42 })
        expect(res.status).toBe(400)
        expect(res.body.error).toMatch(/query is required/i)
    })

    test('returns 400 when body is empty', async () => {
        const res = await api().post('/api/ai/filter').send()
        expect(res.status).toBe(400)
    })
})

describe('POST /api/ai/filter — Gemini integration', () => {
    beforeEach(() => {
        process.env.GEMINI_API_KEY = 'test-key-123'
    })

    test('returns Gemini filter spec on success', async () => {
        const spec = { filters: [{ field: 'ph', op: 'gt', value: 7 }] }
        mockGeminiSuccess(spec)

        const res = await api().post('/api/ai/filter').send({ query: 'show samples where pH is above 7' })

        expect(res.status).toBe(200)
        expect(res.body).toEqual(spec)
        expect(mockFetch).toHaveBeenCalledTimes(1)

        // Confirm the correct model and key are used in the URL
        const url = mockFetch.mock.calls[0][0]
        expect(url).toContain('gemini-2.5-flash-lite')
        expect(url).toContain('test-key-123')
    })

    test('request body sent to Gemini contains the user query', async () => {
        mockGeminiSuccess({ filters: [] })

        await api().post('/api/ai/filter').send({ query: 'show resistant samples' })

        const body = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(body.contents[0].parts[0].text).toBe('show resistant samples')
    })

    test('falls back to local parser when Gemini returns HTTP error', async () => {
        mockGeminiError(429)

        // Local parser can handle "show resistant samples"
        const res = await api().post('/api/ai/filter').send({ query: 'show resistant samples' })

        expect(res.status).toBe(200)
        expect(res.body.filters).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ field: 'predicted_sir_profile', op: 'eq', value: 'resistant' }),
            ])
        )
    })

    test('falls back to local parser on network failure', async () => {
        mockGeminiNetworkFailure()

        const res = await api().post('/api/ai/filter').send({ query: 'ph above 7' })

        expect(res.status).toBe(200)
        expect(res.body.filters).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ field: 'ph', op: 'gt', value: 7 }),
            ])
        )
    })

    test('returns empty filters with error message when query is uninterpretable', async () => {
        mockGeminiError(400, 'bad request')

        const res = await api().post('/api/ai/filter').send({ query: 'xyzzy frobble zorp' })

        expect(res.status).toBe(200)
        expect(res.body.filters).toEqual([])
        expect(res.body.error).toBeTruthy()
    })

    test('handles Gemini returning empty filters array', async () => {
        mockGeminiSuccess({ filters: [] })

        const res = await api().post('/api/ai/filter').send({ query: 'show everything' })

        expect(res.status).toBe(200)
        expect(res.body.filters).toEqual([])
    })

    test('handles Gemini returning a between filter', async () => {
        const spec = { filters: [{ field: 'water_temp', op: 'between', value: [20, 30] }] }
        mockGeminiSuccess(spec)

        const res = await api().post('/api/ai/filter').send({ query: 'temperature between 20 and 30' })

        expect(res.status).toBe(200)
        expect(res.body).toEqual(spec)
    })
})

describe('POST /api/ai/filter — no API key (local parser only)', () => {
    test('parses "resistant" keyword → SIR profile eq filter', async () => {
        const res = await api().post('/api/ai/filter').send({ query: 'show resistant samples' })
        expect(res.status).toBe(200)
        expect(res.body.filters).toEqual(
            expect.arrayContaining([
                { field: 'predicted_sir_profile', op: 'eq', value: 'resistant' },
            ])
        )
    })

    test('parses "susceptible" keyword', async () => {
        const res = await api().post('/api/ai/filter').send({ query: 'susceptible samples only' })
        expect(res.status).toBe(200)
        expect(res.body.filters).toEqual(
            expect.arrayContaining([
                { field: 'predicted_sir_profile', op: 'eq', value: 'susceptible' },
            ])
        )
    })

    test('parses "intermediate" keyword', async () => {
        const res = await api().post('/api/ai/filter').send({ query: 'show intermediate samples' })
        expect(res.status).toBe(200)
        expect(res.body.filters).toEqual(
            expect.arrayContaining([
                { field: 'predicted_sir_profile', op: 'eq', value: 'intermediate' },
            ])
        )
    })

    test('parses "ph above X"', async () => {
        const res = await api().post('/api/ai/filter').send({ query: 'ph above 6.5' })
        expect(res.status).toBe(200)
        expect(res.body.filters).toEqual(
            expect.arrayContaining([
                { field: 'ph', op: 'gt', value: 6.5 },
            ])
        )
    })

    test('parses "ph below X"', async () => {
        const res = await api().post('/api/ai/filter').send({ query: 'ph below 5' })
        expect(res.status).toBe(200)
        expect(res.body.filters).toEqual(
            expect.arrayContaining([
                { field: 'ph', op: 'lt', value: 5 },
            ])
        )
    })

    test('parses "temperature above X"', async () => {
        const res = await api().post('/api/ai/filter').send({ query: 'temperature above 25' })
        expect(res.status).toBe(200)
        expect(res.body.filters).toEqual(
            expect.arrayContaining([
                { field: 'water_temp', op: 'gt', value: 25 },
            ])
        )
    })

    test('parses "water temp between X and Y"', async () => {
        const res = await api().post('/api/ai/filter').send({ query: 'water temp between 20 and 30' })
        expect(res.status).toBe(200)
        expect(res.body.filters).toEqual(
            expect.arrayContaining([
                { field: 'water_temp', op: 'between', value: [20, 30] },
            ])
        )
    })

    test('parses "dissolved oxygen below X"', async () => {
        const res = await api().post('/api/ai/filter').send({ query: 'dissolved oxygen below 5' })
        expect(res.status).toBe(200)
        expect(res.body.filters).toEqual(
            expect.arrayContaining([
                { field: 'do', op: 'lt', value: 5 },
            ])
        )
    })

    test('parses "tds above X"', async () => {
        const res = await api().post('/api/ai/filter').send({ query: 'tds above 300' })
        expect(res.status).toBe(200)
        expect(res.body.filters).toEqual(
            expect.arrayContaining([
                { field: 'tds', op: 'gt', value: 300 },
            ])
        )
    })

    test('parses location contains query', async () => {
        const res = await api().post('/api/ai/filter').send({ query: 'location contains Cape Town' })
        expect(res.status).toBe(200)
        const filter = res.body.filters.find(f => f.field === 'location_name')
        expect(filter).toBeDefined()
        expect(filter.op).toBe('contains')
    })

    test('returns empty filters + error for completely unrecognised query', async () => {
        const res = await api().post('/api/ai/filter').send({ query: 'xyzzy frobble zorp quux' })
        expect(res.status).toBe(200)
        expect(res.body.filters).toEqual([])
        expect(res.body.error).toMatch(/could not interpret/i)
    })

    test('does not call fetch when no API key is set', async () => {
        await api().post('/api/ai/filter').send({ query: 'ph above 7' })
        expect(mockFetch).not.toHaveBeenCalled()
    })
})
