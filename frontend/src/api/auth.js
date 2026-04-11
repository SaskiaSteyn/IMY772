const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function request(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // send/receive the httpOnly cookie
        ...options,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data.message || 'Request failed');
    }

    return data;
}

export const authApi = {
    register: (username, name, surname, email, password) =>
        request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, name, surname, email, password }),
        }),

    login: (email, password) =>
        request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    logout: () => request('/api/auth/logout', { method: 'POST' }),

    me: () => request('/api/auth/me'),

    googleLogin: (authPayload) =>
        request('/api/auth/google', {
            method: 'POST',
            body: JSON.stringify(authPayload),
        }),
};
