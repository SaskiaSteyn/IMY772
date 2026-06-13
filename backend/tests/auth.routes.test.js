/**
 * Broader tests for backend auth routes.
 *
 * Prisma and Google auth are mocked so no real database or Google calls are required.
 */

import { jest } from '@jest/globals'
import jwt from 'jsonwebtoken'

const mockPrismaUser = {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
}

const mockVerifyIdToken = jest.fn()

jest.unstable_mockModule('../lib/prisma.js', () => ({
    default: { user: mockPrismaUser },
}))

jest.unstable_mockModule('google-auth-library', () => ({
    OAuth2Client: class {
        verifyIdToken(...args) {
            return mockVerifyIdToken(...args)
        }
    },
}))

const { default: express } = await import('express')
const cookieParser = (await import('cookie-parser')).default
const { default: supertest } = await import('supertest')
const { default: sharp } = await import('sharp')
const { default: authRouter } = await import('../routes/auth.routes.js')

const TEST_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me'

function buildApp() {
    const app = express()
    app.use(express.json())
    app.use(cookieParser())
    app.use('/api/auth', authRouter)
    return app
}

function api() {
    return supertest(buildApp())
}

function signToken(payload = { userID: 1, role: 'user', email: 'user@example.com' }) {
    return jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' })
}

function authCookie(payload) {
    return [`token=${signToken(payload)}`]
}

function makeUser(overrides = {}) {
    return {
        userID: 1,
        name: 'Test',
        surname: 'User',
        email: 'user@example.com',
        role: 'user',
        created_at: new Date('2024-01-01T00:00:00.000Z').toISOString(),
        bio: '',
        interests: [],
        education: [],
        experience: [],
        profile_image_data: null,
        profile_image_mime_type: null,
        profile_image_size_bytes: null,
        profile_image_updated_at: null,
        ...overrides,
    }
}

async function makePngBuffer() {
    return sharp({
        create: {
            width: 4,
            height: 4,
            channels: 4,
            background: { r: 0, g: 120, b: 255, alpha: 1 },
        },
    })
        .png()
        .toBuffer()
}

beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
})

afterAll(() => {
    delete global.fetch
})

afterEach(() => {
    process.env.NODE_ENV = 'test'
})

describe('POST /api/auth/register', () => {
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
    })

    test('returns 201 and user on successful registration', async () => {
        mockPrismaUser.findUnique.mockResolvedValue(null)
        mockPrismaUser.create.mockResolvedValue(makeUser({ email: 'newuser@example.com' }))

        const res = await api().post('/api/auth/register').send({
            name: 'Test',
            surname: 'User',
            email: 'newuser@example.com',
            password: 'securepass123',
        })

        expect(res.status).toBe(201)
        expect(res.body.user.email).toBe('newuser@example.com')
        expect(res.headers['set-cookie']).toBeDefined()
    })

    test('uses cross-site cookie attributes in production registration responses', async () => {
        process.env.NODE_ENV = 'production'
        mockPrismaUser.findUnique.mockResolvedValue(null)
        mockPrismaUser.create.mockResolvedValue(makeUser({ email: 'produser@example.com' }))

        const res = await api().post('/api/auth/register').send({
            name: 'Prod',
            surname: 'User',
            email: 'produser@example.com',
            password: 'securepass123',
        })

        expect(res.status).toBe(201)
        expect(res.headers['set-cookie'][0]).toContain('SameSite=None')
        expect(res.headers['set-cookie'][0]).toContain('Secure')
    })

    test('returns 500 when registration fails unexpectedly', async () => {
        mockPrismaUser.findUnique.mockRejectedValue(new Error('db down'))

        const res = await api().post('/api/auth/register').send({
            name: 'Test',
            surname: 'User',
            email: 'user@example.com',
            password: 'securepass123',
        })

        expect(res.status).toBe(500)
        expect(res.body.message).toMatch(/registration failed/i)
    })
})

describe('POST /api/auth/login', () => {
    test('returns 400 when fields are missing', async () => {
        const res = await api().post('/api/auth/login').send({})
        expect(res.status).toBe(400)
    })

    test('returns 401 when user does not exist', async () => {
        mockPrismaUser.findUnique.mockResolvedValue(null)

        const res = await api().post('/api/auth/login').send({
            email: 'nobody@example.com',
            password: 'password123',
        })

        expect(res.status).toBe(401)
    })

    test('returns 401 when password is wrong', async () => {
        const bcrypt = await import('bcryptjs')
        const hash = await bcrypt.hash('correctpassword', 10)

        mockPrismaUser.findUnique.mockResolvedValue({
            ...makeUser(),
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
            ...makeUser(),
            password_hash: hash,
        })

        const res = await api().post('/api/auth/login').send({
            email: 'user@example.com',
            password: 'correctpassword',
        })

        expect(res.status).toBe(200)
        expect(res.body.user.email).toBe('user@example.com')
        expect(res.headers['set-cookie']).toBeDefined()
    })

    test('returns 500 when login fails unexpectedly', async () => {
        mockPrismaUser.findUnique.mockRejectedValue(new Error('db down'))

        const res = await api().post('/api/auth/login').send({
            email: 'user@example.com',
            password: 'password123',
        })

        expect(res.status).toBe(500)
        expect(res.body.message).toMatch(/login failed/i)
    })
})

describe('POST /api/auth/logout', () => {
    test('returns 200 and clears the token cookie', async () => {
        const res = await api().post('/api/auth/logout')
        expect(res.status).toBe(200)
        expect(res.body.message).toMatch(/logged out/i)
    })

    test('uses matching cross-site cookie attributes in production logout responses', async () => {
        process.env.NODE_ENV = 'production'

        const res = await api().post('/api/auth/logout')

        expect(res.status).toBe(200)
        expect(res.headers['set-cookie'][0]).toContain('SameSite=None')
        expect(res.headers['set-cookie'][0]).toContain('Secure')
    })
})

describe('GET /api/auth/me', () => {
    test('returns null when no token is present', async () => {
        const res = await api().get('/api/auth/me')
        expect(res.status).toBe(200)
        expect(res.body.user).toBeNull()
    })

    test('returns null when token is invalid', async () => {
        const res = await api().get('/api/auth/me').set('Cookie', ['token=bad.token'])
        expect(res.status).toBe(200)
        expect(res.body.user).toBeNull()
    })

    test('returns null when the user no longer exists', async () => {
        mockPrismaUser.findUnique.mockResolvedValue(null)

        const res = await api().get('/api/auth/me').set('Cookie', authCookie())
        expect(res.status).toBe(200)
        expect(res.body.user).toBeNull()
    })

    test('falls back to public user select when profile image columns are unavailable', async () => {
        const schemaError = new Error('missing column')
        schemaError.code = 'P2022'

        mockPrismaUser.findUnique
            .mockRejectedValueOnce(schemaError)
            .mockResolvedValueOnce(makeUser())

        const res = await api().get('/api/auth/me').set('Cookie', authCookie())

        expect(res.status).toBe(200)
        expect(res.body.user.email).toBe('user@example.com')
        expect(res.body.user.hasProfileImage).toBe(false)
    })

    test('returns authenticated user details when lookup succeeds', async () => {
        mockPrismaUser.findUnique.mockResolvedValue(makeUser({
            profile_image_data: Buffer.from('hello'),
            profile_image_mime_type: 'image/png',
        }))

        const res = await api().get('/api/auth/me').set('Cookie', authCookie())

        expect(res.status).toBe(200)
        expect(res.body.user.profileImage).toMatch(/^data:image\/png;base64,/)
        expect(res.body.user.hasProfileImage).toBe(true)
    })
})

describe('GET /api/auth/profile', () => {
    test('returns 401 when not authenticated', async () => {
        const res = await api().get('/api/auth/profile')
        expect(res.status).toBe(401)
    })

    test('returns 401 when auth cookie is invalid', async () => {
        const res = await api().get('/api/auth/profile').set('Cookie', ['token=bad.token'])
        expect(res.status).toBe(401)
    })

    test('returns 404 when the user is missing', async () => {
        mockPrismaUser.findUnique.mockResolvedValue(null)

        const res = await api().get('/api/auth/profile').set('Cookie', authCookie())

        expect(res.status).toBe(404)
    })

    test('falls back when profile columns are unavailable', async () => {
        const schemaError = new Error('missing column')
        schemaError.code = 'P2022'

        mockPrismaUser.findUnique
            .mockRejectedValueOnce(schemaError)
            .mockResolvedValueOnce(makeUser())

        const res = await api().get('/api/auth/profile').set('Cookie', authCookie())

        expect(res.status).toBe(200)
        expect(res.body.profile.email).toBe('user@example.com')
    })

    test('returns profile payload with default arrays when stored values are not arrays', async () => {
        mockPrismaUser.findUnique.mockResolvedValue(makeUser({
            interests: null,
            education: null,
            experience: null,
        }))

        const res = await api().get('/api/auth/profile').set('Cookie', authCookie())

        expect(res.status).toBe(200)
        expect(res.body.profile.interests).toEqual([])
        expect(res.body.profile.education).toEqual([])
        expect(res.body.profile.experience).toEqual([])
    })

    test('returns 500 on unexpected profile load error', async () => {
        mockPrismaUser.findUnique.mockRejectedValue(new Error('db down'))

        const res = await api().get('/api/auth/profile').set('Cookie', authCookie())

        expect(res.status).toBe(500)
        expect(res.body.message).toMatch(/failed to load profile/i)
    })
})

describe('PUT /api/auth/profile', () => {
    test('returns 401 when not authenticated', async () => {
        const res = await api().put('/api/auth/profile').send({})
        expect(res.status).toBe(401)
    })

    test('returns 400 when name, surname, or email is missing', async () => {
        const res = await api().put('/api/auth/profile').set('Cookie', authCookie()).send({
            name: '',
            surname: 'User',
            email: 'user@example.com',
        })

        expect(res.status).toBe(400)
    })

    test('returns 409 when email belongs to another user', async () => {
        mockPrismaUser.findUnique.mockResolvedValue({ userID: 2 })

        const res = await api().put('/api/auth/profile').set('Cookie', authCookie()).send({
            name: 'Test',
            surname: 'User',
            email: 'taken@example.com',
        })

        expect(res.status).toBe(409)
    })

    test('updates full profile data when profile columns exist', async () => {
        mockPrismaUser.findUnique.mockResolvedValue({ userID: 1 })
        mockPrismaUser.update.mockResolvedValue(makeUser({
            name: 'Updated',
            surname: 'Person',
            email: 'updated@example.com',
            bio: 'Researcher',
            interests: ['AMR'],
            education: [{ institution: 'UP', qualification: 'BSc', description: '', startDate: '2020', endDate: '2023' }],
            experience: [{ role: 'Analyst', organization: 'Lab', description: '', startDate: '2024', endDate: '' }],
        }))

        const res = await api().put('/api/auth/profile').set('Cookie', authCookie()).send({
            name: ' Updated ',
            surname: ' Person ',
            role: 'admin',
            email: ' UPDATED@example.com ',
            bio: 'Researcher',
            interests: ['  AMR  ', '', null],
            education: [{ institution: 'UP', qualification: 'BSc', description: '', startDate: '2020', endDate: '2023' }],
            experience: [{ role: 'Analyst', organization: 'Lab', description: '', startDate: '2024', endDate: '' }],
        })

        expect(res.status).toBe(200)
        expect(res.body.user.email).toBe('updated@example.com')
        expect(res.body.profile.interests).toEqual(['AMR'])
        expect(res.headers['set-cookie']).toBeDefined()
    })

    test('falls back to base profile update when extra profile columns are unavailable', async () => {
        const schemaError = new Error('missing column')
        schemaError.code = 'P2022'

        mockPrismaUser.findUnique.mockResolvedValue({ userID: 1 })
        mockPrismaUser.update
            .mockRejectedValueOnce(schemaError)
            .mockResolvedValueOnce(makeUser({
                name: 'Updated',
                surname: 'User',
                email: 'updated@example.com',
            }))

        const res = await api().put('/api/auth/profile').set('Cookie', authCookie()).send({
            name: 'Updated',
            surname: 'User',
            email: 'updated@example.com',
        })

        expect(res.status).toBe(200)
        expect(res.body.profile.email).toBe('updated@example.com')
    })

    test('returns 500 on unexpected profile update error', async () => {
        mockPrismaUser.findUnique.mockResolvedValue(null)
        mockPrismaUser.update.mockRejectedValue(new Error('db down'))

        const res = await api().put('/api/auth/profile').set('Cookie', authCookie()).send({
            name: 'Updated',
            surname: 'User',
            email: 'updated@example.com',
        })

        expect(res.status).toBe(500)
        expect(res.body.message).toMatch(/failed to save profile/i)
    })
})

describe('GET /api/auth/users/:id/profile', () => {
    test('returns 401 when not authenticated', async () => {
        const res = await api().get('/api/auth/users/1/profile')
        expect(res.status).toBe(401)
    })

    test('returns 400 when the user id is invalid', async () => {
        const res = await api().get('/api/auth/users/0/profile').set('Cookie', authCookie())
        expect(res.status).toBe(400)
    })

    test('returns 404 when the target user does not exist', async () => {
        mockPrismaUser.findUnique.mockResolvedValue(null)

        const res = await api().get('/api/auth/users/2/profile').set('Cookie', authCookie())
        expect(res.status).toBe(404)
    })

    test('falls back when image columns are unavailable', async () => {
        const schemaError = new Error('missing column')
        schemaError.code = 'P2022'

        mockPrismaUser.findUnique
            .mockRejectedValueOnce(schemaError)
            .mockResolvedValueOnce(makeUser({ userID: 2 }))

        const res = await api().get('/api/auth/users/2/profile').set('Cookie', authCookie())

        expect(res.status).toBe(200)
        expect(res.body.profile.userID).toBe(2)
        expect(res.body.profile.email).toBeUndefined()
    })

    test('returns 500 on unexpected public profile error', async () => {
        mockPrismaUser.findUnique.mockRejectedValue(new Error('db down'))

        const res = await api().get('/api/auth/users/2/profile').set('Cookie', authCookie())

        expect(res.status).toBe(500)
        expect(res.body.message).toMatch(/failed to load profile/i)
    })
})

describe('PUT /api/auth/profile-image', () => {
    test('returns 401 when not authenticated', async () => {
        const res = await api().put('/api/auth/profile-image')
        expect(res.status).toBe(401)
    })

    test('returns 400 when no image file is uploaded', async () => {
        const res = await api().put('/api/auth/profile-image').set('Cookie', authCookie())
        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(/profile image is required/i)
    })

    test('returns 413 when uploaded image exceeds size limit', async () => {
        const largeBuffer = Buffer.alloc(2 * 1024 * 1024 + 1, 1)

        const res = await api()
            .put('/api/auth/profile-image')
            .set('Cookie', authCookie())
            .attach('image', largeBuffer, { filename: 'large.png', contentType: 'image/png' })

        expect(res.status).toBe(413)
        expect(res.body.message).toMatch(/2MB or smaller/i)
    })

    test('returns 400 when upload mime type is invalid', async () => {
        const res = await api()
            .put('/api/auth/profile-image')
            .set('Cookie', authCookie())
            .attach('image', Buffer.from('hello'), { filename: 'test.gif', contentType: 'image/gif' })

        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(/jpeg and png/i)
    })

    test('returns 200 when profile image is updated', async () => {
        mockPrismaUser.update.mockResolvedValue(makeUser({
            profile_image_data: Buffer.from('image-data'),
            profile_image_mime_type: 'image/png',
            profile_image_size_bytes: 10,
        }))

        const pngBuffer = await makePngBuffer()

        const res = await api()
            .put('/api/auth/profile-image')
            .set('Cookie', authCookie())
            .attach('image', pngBuffer, { filename: 'avatar.png', contentType: 'image/png' })

        expect(res.status).toBe(200)
        expect(res.body.message).toMatch(/updated/i)
        expect(res.body.profile.hasProfileImage).toBe(true)
    })

    test('returns 200 when a jpeg profile image is updated', async () => {
        mockPrismaUser.update.mockResolvedValue(makeUser({
            profile_image_data: Buffer.from('jpeg-image-data'),
            profile_image_mime_type: 'image/jpeg',
            profile_image_size_bytes: 15,
        }))

        const jpegBuffer = await sharp({
            create: {
                width: 4,
                height: 4,
                channels: 3,
                background: { r: 255, g: 220, b: 0 },
            },
        })
            .jpeg()
            .toBuffer()

        const res = await api()
            .put('/api/auth/profile-image')
            .set('Cookie', authCookie())
            .attach('image', jpegBuffer, { filename: 'avatar.jpg', contentType: 'image/jpeg' })

        expect(res.status).toBe(200)
        expect(res.body.profile.profileImage).toMatch(/^data:image\/jpeg;base64,/) 
    })

    test('returns 503 when image storage columns are unavailable', async () => {
        const error = new Error('missing column')
        error.code = 'P2022'
        mockPrismaUser.update.mockRejectedValue(error)

        const pngBuffer = await makePngBuffer()

        const res = await api()
            .put('/api/auth/profile-image')
            .set('Cookie', authCookie())
            .attach('image', pngBuffer, { filename: 'avatar.png', contentType: 'image/png' })

        expect(res.status).toBe(503)
    })

    test('returns 404 when the authenticated user no longer exists', async () => {
        const error = new Error('missing user')
        error.code = 'P2025'
        mockPrismaUser.update.mockRejectedValue(error)

        const pngBuffer = await makePngBuffer()

        const res = await api()
            .put('/api/auth/profile-image')
            .set('Cookie', authCookie())
            .attach('image', pngBuffer, { filename: 'avatar.png', contentType: 'image/png' })

        expect(res.status).toBe(404)
    })

    test('returns 500 on unexpected profile image update error', async () => {
        mockPrismaUser.update.mockRejectedValue(new Error('db down'))

        const pngBuffer = await makePngBuffer()

        const res = await api()
            .put('/api/auth/profile-image')
            .set('Cookie', authCookie())
            .attach('image', pngBuffer, { filename: 'avatar.png', contentType: 'image/png' })

        expect(res.status).toBe(500)
    })
})

describe('DELETE /api/auth/profile-image', () => {
    test('returns 401 when not authenticated', async () => {
        const res = await api().delete('/api/auth/profile-image')
        expect(res.status).toBe(401)
    })

    test('returns 200 when profile image is removed', async () => {
        mockPrismaUser.update.mockResolvedValue(makeUser())

        const res = await api().delete('/api/auth/profile-image').set('Cookie', authCookie())

        expect(res.status).toBe(200)
        expect(res.body.message).toMatch(/removed/i)
    })

    test('returns 503 when image storage columns are unavailable', async () => {
        const error = new Error('missing column')
        error.code = 'P2022'
        mockPrismaUser.update.mockRejectedValue(error)

        const res = await api().delete('/api/auth/profile-image').set('Cookie', authCookie())

        expect(res.status).toBe(503)
    })

    test('returns 404 when the authenticated user no longer exists', async () => {
        const error = new Error('missing user')
        error.code = 'P2025'
        mockPrismaUser.update.mockRejectedValue(error)

        const res = await api().delete('/api/auth/profile-image').set('Cookie', authCookie())

        expect(res.status).toBe(404)
    })

    test('returns 500 on unexpected removal error', async () => {
        mockPrismaUser.update.mockRejectedValue(new Error('db down'))

        const res = await api().delete('/api/auth/profile-image').set('Cookie', authCookie())

        expect(res.status).toBe(500)
    })
})

describe('POST /api/auth/google', () => {
    test('returns 400 when no Google token is provided', async () => {
        const res = await api().post('/api/auth/google').send({})
        expect(res.status).toBe(400)
    })

    test('returns 401 when Google access token verification fails', async () => {
        global.fetch.mockResolvedValue({ ok: false })

        const res = await api().post('/api/auth/google').send({ accessToken: 'bad-token' })
        expect(res.status).toBe(401)
    })

    test('returns 400 when Google profile has no email', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({ sub: '123' }),
        })

        const res = await api().post('/api/auth/google').send({ accessToken: 'token' })
        expect(res.status).toBe(400)
    })

    test('returns 400 when Google email is not verified', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({
                sub: '123',
                email: 'google@example.com',
                email_verified: false,
            }),
        })

        const res = await api().post('/api/auth/google').send({ accessToken: 'token' })
        expect(res.status).toBe(400)
    })

    test('logs in an existing Google user via access token', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({
                sub: '123',
                email: 'google@example.com',
                email_verified: true,
                given_name: 'Google',
                family_name: 'User',
            }),
        })
        mockPrismaUser.findUnique.mockResolvedValue(makeUser({ email: 'google@example.com' }))

        const res = await api().post('/api/auth/google').send({ accessToken: 'token' })

        expect(res.status).toBe(200)
        expect(res.body.user.email).toBe('google@example.com')
    })

    test('creates a new Google user via credential token when one does not exist', async () => {
        mockVerifyIdToken.mockResolvedValue({
            getPayload: () => ({
                sub: 'credential-sub',
                email: 'credential@example.com',
                email_verified: true,
                given_name: 'Cred',
                family_name: 'User',
            }),
        })
        mockPrismaUser.findUnique.mockResolvedValue(null)
        mockPrismaUser.create.mockResolvedValue(makeUser({ email: 'credential@example.com' }))

        const res = await api().post('/api/auth/google').send({ credential: 'id-token' })

        expect(res.status).toBe(200)
        expect(res.body.user.email).toBe('credential@example.com')
    })

    test('returns 401 when Google authentication throws unexpectedly', async () => {
        mockVerifyIdToken.mockRejectedValue(new Error('google down'))

        const res = await api().post('/api/auth/google').send({ credential: 'id-token' })
        expect(res.status).toBe(401)
    })
})
