import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import prisma from '../lib/prisma.js'

const router = Router()
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

// ─── Cookie helper ───────────────────────────────────────────────────────────

function issueTokenCookie(res, payload) {
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    })

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    return token
}

function safeUser(user) {
    const { password_hash, ...safe } = user
    return safe
}

function getUserIdFromCookie(req) {
    const token = req.cookies?.token
    if (!token) return null

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        return payload.userID
    } catch {
        return null
    }
}

function normalizeStringArray(value) {
    if (!Array.isArray(value)) return []
    return value
        .map((entry) => String(entry || '').trim())
        .filter(Boolean)
}

function normalizeEntryArray(value) {
    if (!Array.isArray(value)) return []
    return value.map((entry) => ({
        institution: String(entry?.institution || ''),
        qualification: String(entry?.qualification || ''),
        description: String(entry?.description || ''),
        role: String(entry?.role || ''),
        organization: String(entry?.organization || ''),
        startDate: String(entry?.startDate || ''),
        endDate: String(entry?.endDate || ''),
    }))
}

async function findOrCreateGoogleUser({ email, given_name, family_name, sub: googleSub }) {
    let user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
        user = await prisma.user.create({
            data: {
                name: given_name || 'Google',
                surname: family_name || 'User',
                email,
                password_hash: await bcrypt.hash(`${googleSub}${process.env.JWT_SECRET}`, 12),
            },
        })
    }

    return user
}

// ─── POST /api/auth/register ─────────────────────────────────────────────────

router.post(
    '/register',
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('surname').trim().notEmpty().withMessage('Surname is required'),
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters'),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }

        const { name, surname, email, password } = req.body

        try {
            const existing = await prisma.user.findUnique({ where: { email } })

            if (existing) {
                return res.status(409).json({ message: 'That email is already in use' })
            }

            const password_hash = await bcrypt.hash(password, 12)

            const user = await prisma.user.create({
                data: { name, surname, email, password_hash },
            })

            issueTokenCookie(res, { userID: user.userID, email: user.email, role: user.role })

            return res.status(201).json({ user: safeUser(user) })
        } catch (err) {
            console.error('Register error:', err)
            return res.status(500).json({ message: 'Registration failed' })
        }
    }
)

// ─── POST /api/auth/login ────────────────────────────────────────────────────

router.post(
    '/login',
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required'),
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }

        const { email, password } = req.body

        try {
            const user = await prisma.user.findUnique({ where: { email } })

            if (!user) {
                return res.status(401).json({ message: 'Invalid email or password' })
            }

            const valid = await bcrypt.compare(password, user.password_hash)
            if (!valid) {
                return res.status(401).json({ message: 'Invalid email or password' })
            }

            issueTokenCookie(res, { userID: user.userID, email: user.email, role: user.role })

            return res.json({ user: safeUser(user) })
        } catch (err) {
            console.error('Login error:', err)
            return res.status(500).json({ message: 'Login failed' })
        }
    }
)

// ─── POST /api/auth/logout ───────────────────────────────────────────────────

router.post('/logout', (req, res) => {
    res.clearCookie('token', { httpOnly: true, sameSite: 'lax' })
    return res.json({ message: 'Logged out' })
})

// ─── GET /api/auth/me ────────────────────────────────────────────────────────

router.get('/me', async (req, res) => {
    const token = req.cookies?.token

    if (!token) {
        return res.json({ user: null })
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        const user = await prisma.user.findUnique({
            where: { userID: payload.userID },
        })

        if (!user) {
            return res.json({ user: null })
        }

        return res.json({ user: safeUser(user) })
    } catch (err) {
        return res.json({ user: null })
    }
})

// ─── GET /api/auth/profile ───────────────────────────────────────────────────

router.get('/profile', async (req, res) => {
    const userID = getUserIdFromCookie(req)
    if (!userID) {
        return res.status(401).json({ message: 'Not authenticated' })
    }

    try {
        const user = await prisma.user.findUnique({ where: { userID } })
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        return res.json({
            profile: {
                name: user.name,
                surname: user.surname,
                role: user.role,
                email: user.email,
                bio: user.bio || '',
                interests: Array.isArray(user.interests) ? user.interests : [],
                education: Array.isArray(user.education) ? user.education : [],
                experience: Array.isArray(user.experience) ? user.experience : [],
            },
        })
    } catch (err) {
        console.error('Get profile error:', err)
        return res.status(500).json({ message: 'Failed to load profile' })
    }
})

// ─── PUT /api/auth/profile ───────────────────────────────────────────────────

router.put('/profile', async (req, res) => {
    const userID = getUserIdFromCookie(req)
    if (!userID) {
        return res.status(401).json({ message: 'Not authenticated' })
    }

    const {
        name = '',
        surname = '',
        role = 'logged_in_user',
        email = '',
        bio = '',
        interests = [],
        education = [],
        experience = [],
    } = req.body || {}

    const normalizedEmail = String(email).trim().toLowerCase()
    const normalizedName = String(name).trim()
    const normalizedSurname = String(surname).trim()

    if (!normalizedName || !normalizedSurname || !normalizedEmail) {
        return res.status(400).json({ message: 'Name, surname, and email are required' })
    }

    try {
        const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
        if (existing && existing.userID !== userID) {
            return res.status(409).json({ message: 'That email is already in use' })
        }

        const updated = await prisma.user.update({
            where: { userID },
            data: {
                name: normalizedName,
                surname: normalizedSurname,
                role: String(role || 'logged_in_user').trim() || 'logged_in_user',
                email: normalizedEmail,
                bio: String(bio || ''),
                interests: normalizeStringArray(interests),
                education: normalizeEntryArray(education).map((entry) => ({
                    institution: entry.institution,
                    qualification: entry.qualification,
                    description: entry.description,
                    startDate: entry.startDate,
                    endDate: entry.endDate,
                })),
                experience: normalizeEntryArray(experience).map((entry) => ({
                    role: entry.role,
                    organization: entry.organization,
                    description: entry.description,
                    startDate: entry.startDate,
                    endDate: entry.endDate,
                })),
            },
        })

        issueTokenCookie(res, {
            userID: updated.userID,
            email: updated.email,
            role: updated.role,
        })

        return res.json({
            user: safeUser(updated),
            profile: {
                name: updated.name,
                surname: updated.surname,
                role: updated.role,
                email: updated.email,
                bio: updated.bio || '',
                interests: Array.isArray(updated.interests) ? updated.interests : [],
                education: Array.isArray(updated.education) ? updated.education : [],
                experience: Array.isArray(updated.experience) ? updated.experience : [],
            },
        })
    } catch (err) {
        console.error('Update profile error:', err)
        return res.status(500).json({ message: 'Failed to save profile' })
    }
})

// ─── POST /api/auth/google ───────────────────────────────────────────────────
// Supports either:
// 1. An ID token credential from Google Identity Services, or
// 2. An OAuth access token from the browser implicit flow.

router.post('/google', async (req, res) => {
    const { credential, accessToken } = req.body

    if (!credential && !accessToken) {
        return res.status(400).json({ message: 'Google token is required' })
    }

    try {
        let googleProfile

        if (credential) {
            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID,
            })

            googleProfile = ticket.getPayload()
        } else {
            const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })

            if (!googleRes.ok) {
                return res.status(401).json({ message: 'Failed to verify Google access token' })
            }

            googleProfile = await googleRes.json()
        }

        if (!googleProfile?.email) {
            return res.status(400).json({ message: 'Google account did not return an email address' })
        }

        if (googleProfile.email_verified === false) {
            return res.status(400).json({ message: 'Google email address is not verified' })
        }

        const user = await findOrCreateGoogleUser(googleProfile)

        issueTokenCookie(res, { userID: user.userID, email: user.email, role: user.role })

        return res.json({ user: safeUser(user) })
    } catch (err) {
        console.error('Google auth error:', err)
        return res.status(401).json({ message: 'Google authentication failed' })
    }
})

export default router
