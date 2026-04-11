import jwt from 'jsonwebtoken';

/**
 * Middleware that requires a valid JWT in the httpOnly 'token' cookie.
 * Attaches the decoded payload to req.user on success.
 */
export function requireAuth(req, res, next) {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: no token provided' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        next();
    } catch {
        return res.status(401).json({ message: 'Unauthorized: invalid or expired token' });
    }
}
