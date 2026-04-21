const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const fallbackMessageByStatus = {
    400: 'Invalid request',
    401: 'Invalid email or password',
    403: 'Access denied',
    404: 'Auth endpoint not found',
    500: 'Server error',
};

function buildRequestError(path, response, data) {
    const error = new Error(
        data.message || fallbackMessageByStatus[response.status] || 'Request failed'
    );

    error.status = response.status;
    error.path = path;
    error.data = data;
    return error;
}

async function request(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // send/receive the httpOnly cookie
        ...options,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw buildRequestError(path, res, data);
    }

    return data;
}

export const authApi = {
    register: (name, surname, email, password) =>
        request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, surname, email, password }),
        }),

    login: (email, password) =>
        request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    logout: () => request('/api/auth/logout', { method: 'POST' }),

    me: () => request('/api/auth/me'),

    getProfile: () => request('/api/auth/profile'),

    updateProfile: (profilePayload) =>
        request('/api/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profilePayload),
        }),

    googleLogin: (authPayload) =>
        request('/api/auth/google', {
            method: 'POST',
            body: JSON.stringify(authPayload),
        }),
};
