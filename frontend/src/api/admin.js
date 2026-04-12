const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function request(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        ...options,
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
        throw new Error(data.message || 'Request failed')
    }

    return data
}

export const adminApi = {
    listUsers: () => request('/api/admin/users'),

    getUser: (userID) => request(`/api/admin/users/${userID}`),

    createUser: (payload) =>
        request('/api/admin/users', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    updateUser: (userID, payload) =>
        request(`/api/admin/users/${userID}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),

    deleteUser: (userID) =>
        request(`/api/admin/users/${userID}`, {
            method: 'DELETE',
        }),

    listData: (entity) => request(`/api/admin/data/${entity}`),

    createData: (entity, payload) =>
        request(`/api/admin/data/${entity}`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    updateData: (entity, rowId, payload) =>
        request(`/api/admin/data/${entity}/${encodeURIComponent(rowId)}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),

    deleteData: (entity, rowId) =>
        request(`/api/admin/data/${entity}/${encodeURIComponent(rowId)}`, {
            method: 'DELETE',
        }),
}
