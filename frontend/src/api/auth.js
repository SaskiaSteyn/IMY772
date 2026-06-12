import { buildApiUrl } from './api-client.js';

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
    const { headers: customHeaders = {}, body, ...rest } = options;
    const headers = { ...customHeaders };

    if (!(body instanceof FormData) && body !== undefined && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(buildApiUrl(path), {
        credentials: 'include', // send/receive the httpOnly cookie
        cache: 'no-store',
        ...rest,
        headers,
        body,
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

    getUserProfile: (userID) => request(`/api/auth/users/${userID}/profile`),

    updateProfile: (profilePayload) =>
        request('/api/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profilePayload),
        }),

    uploadProfileImage: (file) => {
        const formData = new FormData();
        formData.append('image', file);
        return request('/api/auth/profile-image', {
            method: 'PUT',
            body: formData,
        });
    },

    removeProfileImage: () =>
        request('/api/auth/profile-image', {
            method: 'DELETE',
        }),

    googleLogin: (authPayload) =>
        request('/api/auth/google', {
            method: 'POST',
            body: JSON.stringify(authPayload),
        }),
};
