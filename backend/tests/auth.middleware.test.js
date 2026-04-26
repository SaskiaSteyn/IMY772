import { jest } from '@jest/globals'
import jwt from 'jsonwebtoken'
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js'

const TEST_SECRET = 'dev_jwt_secret_change_me'

// Helper: build minimal mock req/res/next
function mockReq(overrides = {}) {
    return { cookies: {}, ...overrides }
}

function mockRes() {
    const res = {}
    res.status = jest.fn().mockReturnValue(res)
    res.json = jest.fn().mockReturnValue(res)
    return res
}

// ─── requireAuth ─────────────────────────────────────────────────────────────

describe('requireAuth middleware', () => {
    test('returns 401 when no token cookie is present', () => {
        const req = mockReq({ cookies: {} })
        const res = mockRes()
        const next = jest.fn()

        requireAuth(req, res, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }))
        expect(next).not.toHaveBeenCalled()
    })

    test('returns 401 when token is invalid', () => {
        const req = mockReq({ cookies: { token: 'not.a.valid.token' } })
        const res = mockRes()
        const next = jest.fn()

        requireAuth(req, res, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(next).not.toHaveBeenCalled()
    })

    test('calls next() and attaches payload when token is valid', () => {
        const payload = { userID: 1, role: 'user' }
        const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' })

        const req = mockReq({ cookies: { token } })
        const res = mockRes()
        const next = jest.fn()

        requireAuth(req, res, next)

        expect(next).toHaveBeenCalledTimes(1)
        expect(req.user).toMatchObject(payload)
        expect(res.status).not.toHaveBeenCalled()
    })
})

// ─── requireAdmin ────────────────────────────────────────────────────────────

describe('requireAdmin middleware', () => {
    test('returns 403 when req.user is not set', () => {
        const req = mockReq({ user: undefined })
        const res = mockRes()
        const next = jest.fn()

        requireAdmin(req, res, next)

        expect(res.status).toHaveBeenCalledWith(403)
        expect(next).not.toHaveBeenCalled()
    })

    test('returns 403 when user role is not admin', () => {
        const req = mockReq({ user: { userID: 2, role: 'user' } })
        const res = mockRes()
        const next = jest.fn()

        requireAdmin(req, res, next)

        expect(res.status).toHaveBeenCalledWith(403)
        expect(next).not.toHaveBeenCalled()
    })

    test('calls next() when user role is admin', () => {
        const req = mockReq({ user: { userID: 1, role: 'admin' } })
        const res = mockRes()
        const next = jest.fn()

        requireAdmin(req, res, next)

        expect(next).toHaveBeenCalledTimes(1)
        expect(res.status).not.toHaveBeenCalled()
    })
})
