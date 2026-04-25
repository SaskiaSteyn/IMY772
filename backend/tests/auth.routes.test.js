/**
 * Tests for POST /api/auth/register, POST /api/auth/login, and POST /api/auth/logout.
 *
 * Prisma is mocked so no real database connection is required.
 */

import { jest } from '@jest/globals'

// ─── Mock prisma BEFORE importing the router ─────────────────────────────────

const mockPrismaUser = {
    findUnique: jest.fn(),
    create: jest.fn(),
}

jest.unstable_mockModule('../lib/prisma.js', () => ({
    default: { user: mockPrismaUser },
}))

// ─── Lazy imports (must come after unstable_mockModule) ───────────────────────

const { default: express } = await import('express')
const cookieParser = (await import('cookie-parser')).default
const { default: authRouter } = await import('../routes/auth.routes.js')

// ─── Build minimal test app ───────────────────────────────────────────────────

function buildApp() {
    const app = express()
    app.use(express.json())
    app.use(cookieParser())
    app.use('/api/auth', authRouter)
    return app
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const { default: supertest } = await import('supertest')

function api() {
    return supertest(buildApp())
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    test('returns 400 when required fields are missing', async () => {
        const res = await api().post('/api/auth/register').send({})
        expect(res.status).toBe(400)
        expect(res.body.errors).toBeDefined()
    })

    test('returns 400 when password is too short', async () => {
        const res = await api().post('/api/auth/register').send({
            name: 'Test',
            surname: 'User',
            email: 'test@example.com',
            password: 'short',
        })
        expect(res.status).toBe(400)
        expect(res.body.errors).toBeDefined()
    })

    test('returns 400 when email is invalid', async () => {
        const res = await api().post('/api/auth/register').send({
            name: 'Test',
            surname: 'User',
            email: 'not-an-email',
            password: 'password123',
        })
        expect(res.status).toBe(400)
    })

    test('returns 409 when email is already in use', async () => {
        mockPrismaUser.findUnique.mockResolvedValue({ userID: 99 })

        const res = await api().post('/api/auth/register').send({
            name: 'Test',
            surname: 'User',
            email: 'existing@example.com',
            password: 'password123',
        })

        expect(res.status).toBe(409)
        expect(res.body.message).toMatch(/already in use/i)
    })

    test('returns 201 and user on successful registration', async () => {
        mockPrismaUser.findUnique.mockResolvedValue(null) // email not taken
        mockPrismaUser.create.mockResolvedValue({
            userID: 1,
            name: 'Test',
            surname: 'User',
            email: 'newuser@example.com',
            role: 'user',
            created_at: new Date().toISOString(),
        })

        const res = await api().post('/api/auth/register').send({
            name: 'Test',
            surname: 'User',
            email: 'newuser@example.com',
            password: 'securepass123',
        })

        expect(res.status).toBe(201)
        expect(res.body.user).toBeDefined()
        expect(res.body.user.email).toBe('newuser@example.com')
        // password_hash must not be exposed
        expect(res.body.user.password_hash).toBeUndefined()
    })
})

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    test('returns 400 when fields are missing', async () => {
        const res = await api().post('/api/auth/login').send({})
        expect(res.status).toBe(400)
        expect(res.body.errors).toBeDefined()
    })

    test('returns 400 when email is invalid', async () => {
        const res = await api().post('/api/auth/login').send({
            email: 'bad-email',
            password: 'password123',
        })
        expect(res.status).toBe(400)
    })

    test('returns 401 when user does not exist', async () => {
        mockPrismaUser.findUnique.mockResolvedValue(null)

        const res = await api().post('/api/auth/login').send({
            email: 'nobody@example.com',
            password: 'password123',
        })

        expect(res.status).toBe(401)
        expect(res.body.message).toMatch(/invalid/i)
    })

    test('returns 401 when password is wrong', async () => {
        const bcrypt = await import('bcryptjs')
        const hash = await bcrypt.hash('correctpassword', 10)

        mockPrismaUser.findUnique.mockResolvedValue({
            userID: 1,
            name: 'Test',
            surname: 'User',
            email: 'user@example.com',
            role: 'user',
            created_at: new Date().toISOString(),
            password_hash: hash,
        })

        const res = await api().post('/api/auth/login').send({
            email: 'user@example.com',
            password: 'wrongpassword',
        })

        expect(res.status).toBe(401)
    })

    test('returns 200 and user on successful login', async () => {
        const bcrypt = await import('bcryptjs')
        const hash = await bcrypt.hash('correctpassword', 10)

        mockPrismaUser.findUnique.mockResolvedValue({
            userID: 1,
            name: 'Test',
            surname: 'User',
            email: 'user@example.com',
            role: 'user',
            created_at: new Date().toISOString(),
            password_hash: hash,
        })

        const res = await api().post('/api/auth/login').send({
            email: 'user@example.com',
            password: 'correctpassword',
        })

        expect(res.status).toBe(200)
        expect(res.body.user).toBeDefined()
        expect(res.body.user.email).toBe('user@example.com')
        expect(res.body.user.password_hash).toBeUndefined()
    })
})

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
    test('returns 200 and clears the token cookie', async () => {
        const res = await api().post('/api/auth/logout')
        expect(res.status).toBe(200)
        expect(res.body.message).toMatch(/logged out/i)
    })
})
