import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import { OAuth2Client } from 'google-auth-library'
import sharp from 'sharp'
import prisma from '../lib/prisma.js'

const router = Router()
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret_change_me'
const PROFILE_IMAGE_MAX_UPLOAD_BYTES = 2 * 1024 * 1024
const PROFILE_IMAGE_ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png'])
const PROFILE_IMAGE_TARGET_SIZE = 320

const publicUserSelect = {
    userID: true,
    name: true,
    surname: true,
    email: true,
    role: true,
    created_at: true,
}

const meUserSelect = {
    ...publicUserSelect,
    profile_image_data: true,
    profile_image_mime_type: true,
}

const loginUserSelect = {
    ...publicUserSelect,
    password_hash: true,
}

const profileUserSelect = {
    ...publicUserSelect,
    bio: true,
    interests: true,
    education: true,
    experience: true,
}

const profileUserSelectWithImage = {
    ...profileUserSelect,
    profile_image_data: true,
    profile_image_mime_type: true,
    profile_image_size_bytes: true,
    profile_image_updated_at: true,
}

const profileImageUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: PROFILE_IMAGE_MAX_UPLOAD_BYTES,
    },
    fileFilter: (_req, file, cb) => {
        if (!PROFILE_IMAGE_ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb(new Error('Only JPEG and PNG images are allowed'))
            return
        }

        cb(null, true)
    },
})

// ─── Cookie helper ───────────────────────────────────────────────────────────

function getTokenCookieOptions() {
    const isProduction = process.env.NODE_ENV === 'production'

    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
    }
}

function issueTokenCookie(res, payload) {
    const token = jwt.sign(payload, jwtSecret, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    })

    res.cookie('token', token, {
        ...getTokenCookieOptions(),
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
        const payload = jwt.verify(token, jwtSecret)
        return payload.userID
    } catch {
        return null
    }
}

function parsePositiveInt(rawValue) {
    const parsed = Number(rawValue)
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null
    }

    return parsed
}

function toPublicUser(user) {
    return {
        userID: user.userID,
        name: user.name,
        surname: user.surname,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
    }
}

function toAuthenticatedUser(user) {
    const profileImage = getProfileImageDataUrl(user)

    return {
        ...toPublicUser(user),
        hasProfileImage: Boolean(profileImage),
        profileImage,
    }
}

function getProfileImageDataUrl(user) {
    if (!user?.profile_image_data || !user?.profile_image_mime_type) {
        return null
    }

    const base64Image = Buffer.from(user.profile_image_data).toString('base64')
    return `data:${user.profile_image_mime_type};base64,${base64Image}`
}

function buildProfilePayload(user, options = {}) {
    const { includeEmail = true, includeUserId = false } = options
    const profileImage = getProfileImageDataUrl(user)

    const payload = {
        ...(includeUserId ? { userID: user.userID } : {}),
        name: user.name,
        surname: user.surname,
        role: user.role,
        bio: user.bio || '',
        interests: Array.isArray(user.interests) ? user.interests : [],
        education: Array.isArray(user.education) ? user.education : [],
        experience: Array.isArray(user.experience) ? user.experience : [],
        hasProfileImage: Boolean(profileImage),
        profileImage,
    }

    if (includeEmail) {
        payload.email = user.email
    }

    return payload
}

function handleProfileImageUpload(req, res, next) {
    profileImageUpload.single('image')(req, res, (error) => {
        if (!error) {
            next()
            return
        }

        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                message: `Profile image must be ${Math.floor(PROFILE_IMAGE_MAX_UPLOAD_BYTES / (1024 * 1024))}MB or smaller`,
            })
        }

        return res.status(400).json({
            message: error.message || 'Invalid profile image upload',
        })
    })
}

async function processProfileImageUpload(file) {
    if (!file?.buffer) {
        throw new Error('Profile image file is required')
    }

    const image = sharp(file.buffer, { failOn: 'error' })
    const metadata = await image.metadata()
    const detectedFormat = metadata.format

    if (detectedFormat !== 'jpeg' && detectedFormat !== 'png') {
        throw new Error('Only JPEG and PNG images are allowed')
    }

    const transformed = image.rotate().resize(PROFILE_IMAGE_TARGET_SIZE, PROFILE_IMAGE_TARGET_SIZE, {
        fit: 'cover',
        position: 'centre',
    })

    if (detectedFormat === 'png') {
        const output = await transformed
            .png({
                compressionLevel: 9,
                adaptiveFiltering: true,
            })
            .toBuffer()

        return {
            data: output,
            mimeType: 'image/png',
            sizeBytes: output.length,
        }
    }

    const output = await transformed
        .jpeg({
            quality: 82,
            mozjpeg: true,
        })
        .toBuffer()

    return {
        data: output,
        mimeType: 'image/jpeg',
        sizeBytes: output.length,
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
    let user = await prisma.user.findUnique({
        where: { email },
        select: publicUserSelect,
    })

    if (!user) {
        user = await prisma.user.create({
            data: {
                name: given_name || 'Google',
                surname: family_name || 'User',
                email,
                password_hash: await bcrypt.hash(`${googleSub}${jwtSecret}`, 12),
            },
            select: publicUserSelect,
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
            const existing = await prisma.user.findUnique({
                where: { email },
                select: { userID: true },
            })

            if (existing) {
                return res.status(409).json({ message: 'That email is already in use' })
            }

            const password_hash = await bcrypt.hash(password, 12)

            const user = await prisma.user.create({
                data: { name, surname, email, password_hash },
                select: publicUserSelect,
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
            const user = await prisma.user.findUnique({
                where: { email },
                select: loginUserSelect,
            })

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
    res.clearCookie('token', getTokenCookieOptions())
    return res.json({ message: 'Logged out' })
})

// ─── GET /api/auth/me ────────────────────────────────────────────────────────

router.get('/me', async (req, res) => {
    const token = req.cookies?.token

    if (!token) {
        return res.json({ user: null })
    }

    try {
        const payload = jwt.verify(token, jwtSecret)
        let user

        try {
            user = await prisma.user.findUnique({
                where: { userID: payload.userID },
                select: meUserSelect,
            })
        } catch (error) {
            if (error.code !== 'P2022') {
                throw error
            }

            user = await prisma.user.findUnique({
                where: { userID: payload.userID },
                select: publicUserSelect,
            })
        }

        if (!user) {
            return res.json({ user: null })
        }

        return res.json({ user: toAuthenticatedUser(user) })
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
        let user

        try {
            user = await prisma.user.findUnique({
                where: { userID },
                select: profileUserSelectWithImage,
            })
        } catch (error) {
            if (error.code !== 'P2022') {
                throw error
            }

            user = await prisma.user.findUnique({
                where: { userID },
                select: publicUserSelect,
            })
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        return res.json({
            profile: buildProfilePayload(user),
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
        const existing = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { userID: true },
        })
        if (existing && existing.userID !== userID) {
            return res.status(409).json({ message: 'That email is already in use' })
        }

        const baseData = {
            name: normalizedName,
            surname: normalizedSurname,
            role: String(role || 'logged_in_user').trim() || 'logged_in_user',
            email: normalizedEmail,
        }

        const profileData = {
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
        }

        let updated

        try {
            updated = await prisma.user.update({
                where: { userID },
                data: {
                    ...baseData,
                    ...profileData,
                },
                select: profileUserSelectWithImage,
            })
        } catch (error) {
            if (error.code !== 'P2022') {
                throw error
            }

            updated = await prisma.user.update({
                where: { userID },
                data: baseData,
                select: publicUserSelect,
            })
        }

        issueTokenCookie(res, {
            userID: updated.userID,
            email: updated.email,
            role: updated.role,
        })

        return res.json({
            user: toPublicUser(updated),
            profile: buildProfilePayload(updated),
        })
    } catch (err) {
        console.error('Update profile error:', err)
        return res.status(500).json({ message: 'Failed to save profile' })
    }
})

// ─── GET /api/auth/users/:id/profile ────────────────────────────────────────

router.get('/users/:id/profile', async (req, res) => {
    const requesterId = getUserIdFromCookie(req)
    if (!requesterId) {
        return res.status(401).json({ message: 'Not authenticated' })
    }

    const targetUserId = parsePositiveInt(req.params.id)
    if (!targetUserId) {
        return res.status(400).json({ message: 'Invalid user id' })
    }

    try {
        let user

        try {
            user = await prisma.user.findUnique({
                where: { userID: targetUserId },
                select: profileUserSelectWithImage,
            })
        } catch (error) {
            if (error.code !== 'P2022') {
                throw error
            }

            user = await prisma.user.findUnique({
                where: { userID: targetUserId },
                select: profileUserSelect,
            })
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        return res.json({
            profile: buildProfilePayload(user, {
                includeEmail: false,
                includeUserId: true,
            }),
        })
    } catch (error) {
        console.error('Get public profile error:', error)
        return res.status(500).json({ message: 'Failed to load profile' })
    }
})

// ─── PUT /api/auth/profile-image ────────────────────────────────────────────

router.put('/profile-image', handleProfileImageUpload, async (req, res) => {
    const userID = getUserIdFromCookie(req)
    if (!userID) {
        return res.status(401).json({ message: 'Not authenticated' })
    }

    if (!req.file) {
        return res.status(400).json({ message: 'Profile image is required' })
    }

    try {
        const processedImage = await processProfileImageUpload(req.file)

        const updated = await prisma.user.update({
            where: { userID },
            data: {
                profile_image_data: processedImage.data,
                profile_image_mime_type: processedImage.mimeType,
                profile_image_size_bytes: processedImage.sizeBytes,
                profile_image_updated_at: new Date(),
            },
            select: profileUserSelectWithImage,
        })

        return res.json({
            message: 'Profile image updated',
            profile: buildProfilePayload(updated),
        })
    } catch (error) {
        if (error.code === 'P2022') {
            return res.status(503).json({
                message: 'Profile image storage is unavailable until migrations are applied',
            })
        }

        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'User not found' })
        }

        if (error?.message?.includes('JPEG and PNG')) {
            return res.status(400).json({ message: error.message })
        }

        console.error('Update profile image error:', error)
        return res.status(500).json({ message: 'Failed to update profile image' })
    }
})

// ─── DELETE /api/auth/profile-image ─────────────────────────────────────────

router.delete('/profile-image', async (req, res) => {
    const userID = getUserIdFromCookie(req)
    if (!userID) {
        return res.status(401).json({ message: 'Not authenticated' })
    }

    try {
        const updated = await prisma.user.update({
            where: { userID },
            data: {
                profile_image_data: null,
                profile_image_mime_type: null,
                profile_image_size_bytes: null,
                profile_image_updated_at: null,
            },
            select: profileUserSelectWithImage,
        })

        return res.json({
            message: 'Profile image removed',
            profile: buildProfilePayload(updated),
        })
    } catch (error) {
        if (error.code === 'P2022') {
            return res.status(503).json({
                message: 'Profile image storage is unavailable until migrations are applied',
            })
        }

        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'User not found' })
        }

        console.error('Remove profile image error:', error)
        return res.status(500).json({ message: 'Failed to remove profile image' })
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
