const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function request(path, options = {}) {
    const { headers: customHeaders = {}, body, ...rest } = options;
    const headers = { ...customHeaders };

    if (!(body instanceof FormData) && body !== undefined && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_URL}${path}`, {
        credentials: 'include', // send/receive the httpOnly cookie
        ...rest,
        headers,
        body,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data.message || 'Request failed');
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
