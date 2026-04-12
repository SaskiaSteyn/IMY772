import jwt from 'jsonwebtoken'

const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret_change_me'

/**
 * Middleware that requires a valid JWT in the httpOnly 'token' cookie.
 * Attaches the decoded payload to req.user on success.
 */
export function requireAuth(req, res, next) {
    const token = req.cookies?.token

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: no token provided' })
    }

    try {
        const payload = jwt.verify(token, jwtSecret)
        req.user = payload
        next()
    } catch {
        return res.status(401).json({ message: 'Unauthorized: invalid or expired token' })
    }
}

/**
 * Middleware that requires an authenticated admin user.
 * Should run after requireAuth.
 */
export function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: admin access required' })
    }

    return next()
}
